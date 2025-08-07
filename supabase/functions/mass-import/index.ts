import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    // Parse request body
    const { data: csvData } = await req.json()
    
    if (!csvData || !Array.isArray(csvData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSV data' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    // Validate row limit
    if (csvData.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Too many rows. Maximum 1000 rows allowed.' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    // Get user's subscription plan and check limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single()

    const { data: currentStaffCount } = await supabase
      .from('staff')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    const subscriptionLimits = {
      'starter': 10,
      'growth': 50,
      'professional': 200
    }

    const userPlan = profile?.subscription_plan || 'starter'
    const staffLimit = subscriptionLimits[userPlan] || 10
    const currentCount = currentStaffCount?.length || 0

    // Get unique staff from CSV data
    const uniqueStaff = new Set(csvData.map(row => row.staff_email?.toLowerCase().trim()).filter(Boolean))
    const newStaffCount = uniqueStaff.size

    if (currentCount + newStaffCount > staffLimit) {
      return new Response(
        JSON.stringify({ 
          error: `Staff limit exceeded. Your ${userPlan} plan allows ${staffLimit} staff members. You currently have ${currentCount} and are trying to add ${newStaffCount} more.` 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    // Process data in batches
    const batchSize = 50
    const results = {
      success: 0,
      errors: [],
      staffCreated: 0,
      templatesCreated: 0,
      certificationsCreated: 0
    }

    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize)
      
      for (const row of batch) {
        try {
          // Validate required fields
          if (!row.staff_full_name || !row.staff_email || !row.certification_name || !row.certification_expiry_date) {
            results.errors.push({
              row: i + batch.indexOf(row) + 1,
              data: row,
              error: 'Missing required fields: staff_full_name, staff_email, certification_name, certification_expiry_date'
            })
            continue
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(row.staff_email)) {
            results.errors.push({
              row: i + batch.indexOf(row) + 1,
              data: row,
              error: 'Invalid email format'
            })
            continue
          }

          // Validate expiry date
          const expiryDate = new Date(row.certification_expiry_date)
          if (isNaN(expiryDate.getTime())) {
            results.errors.push({
              row: i + batch.indexOf(row) + 1,
              data: row,
              error: 'Invalid expiry date format'
            })
            continue
          }

                     // Check if staff member exists first
           const { data: existingStaff } = await supabase
             .from('staff')
             .select('id')
             .eq('user_id', user.id)
             .eq('email', row.staff_email.toLowerCase().trim())
             .single()

           // Upsert staff member (requires unique constraint on user_id,email)
           const { data: staffData, error: staffError } = await supabase
             .from('staff')
             .upsert({
               user_id: user.id,
               email: row.staff_email.toLowerCase().trim(),
               full_name: row.staff_full_name.trim(),
               job_title: row.staff_job_title?.trim() || null
             }, {
               onConflict: 'user_id,email'
             })
             .select()
             .single()

           if (staffError) {
             results.errors.push({
               row: i + batch.indexOf(row) + 1,
               data: row,
               error: `Failed to create/update staff: ${staffError.message}`
             })
             continue
           }

           // Only count as created if it didn't exist before
           if (staffData && !existingStaff) {
             results.staffCreated++
           }

                     // Check if certification template exists first
           const validityPeriod = row.validity_period_months ? parseInt(row.validity_period_months) : 12
           const { data: existingTemplate } = await supabase
             .from('certification_templates')
             .select('id')
             .eq('user_id', user.id)
             .eq('name', row.certification_name.trim())
             .single()

           // Upsert certification template (requires unique constraint on user_id,name)
           const { data: templateData, error: templateError } = await supabase
             .from('certification_templates')
             .upsert({
               user_id: user.id,
               name: row.certification_name.trim(),
               validity_period_months: validityPeriod
             }, {
               onConflict: 'user_id,name'
             })
             .select()
             .single()

           if (templateError) {
             results.errors.push({
               row: i + batch.indexOf(row) + 1,
               data: row,
               error: `Failed to create certification template: ${templateError.message}`
             })
             continue
           }

           // Only count as created if it didn't exist before
           if (templateData && !existingTemplate) {
             results.templatesCreated++
           }

          // Prepare certification data
          const issueDate = row.certification_issue_date ? new Date(row.certification_issue_date) : null
          const certificationData = {
            user_id: user.id,
            staff_id: staffData.id,
            template_id: templateData.id,
            issue_date: issueDate ? issueDate.toISOString().split('T')[0] : null,
            expiry_date: expiryDate.toISOString().split('T')[0],
            notes: row.certification_notes?.trim() || null,
            document_url: row.certification_document_url?.trim() || null
          }

          // Check if certification already exists
          const { data: existingCert } = await supabase
            .from('staff_certifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('staff_id', staffData.id)
            .eq('template_id', templateData.id)
            .eq('issue_date', certificationData.issue_date)
            .single()

          if (!existingCert) {
            const { error: certError } = await supabase
              .from('staff_certifications')
              .insert(certificationData)

            if (certError) {
              results.errors.push({
                row: i + batch.indexOf(row) + 1,
                data: row,
                error: `Failed to create certification: ${certError.message}`
              })
              continue
            }

            results.certificationsCreated++
          }

          results.success++
        } catch (error) {
          results.errors.push({
            row: i + batch.indexOf(row) + 1,
            data: row,
            error: `Unexpected error: ${error.message}`
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: results
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )

  } catch (error) {
    console.error('Mass import error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
}) 