import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.8.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-08-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  console.log('🚀 Stripe Portal function started - method:', req.method)
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled')
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    console.log('📝 Starting portal session creation...')
    
    // Parse request body to get return_url
    console.log('📖 Parsing request body...')
    const requestBody = await req.json()
    console.log('📋 Request body parsed:', requestBody)
    
    const return_url = requestBody.return_url
    console.log('🔗 Return URL from request:', return_url)
    
    if (!return_url) {
      console.log('❌ No return_url provided in request body')
      throw new Error('return_url is required')
    }

    // Get user from auth header
    console.log('🔐 Checking authorization header...')
    const authHeader = req.headers.get('Authorization')
    console.log('🔑 Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('❌ No authorization header found')
      throw new Error('No authorization header')
    }
    
    const token = authHeader.replace('Bearer ', '')
    console.log('🎫 Token extracted, length:', token.length)
    
    console.log('👤 Getting user from token...')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) {
      console.log('❌ Auth error:', authError)
      throw new Error('Authentication failed: ' + authError.message)
    }
    
    if (!user) {
      console.log('❌ No user found from token')
      throw new Error('Invalid user')
    }
    
    console.log('✅ User authenticated:', user.id)

    // Get customer ID from profiles table
    console.log('💳 Fetching Stripe customer ID from profiles...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('❌ Profile query error:', profileError)
      throw new Error('Failed to fetch user profile: ' + profileError.message)
    }
    
    console.log('📄 Profile data:', profile)
    
    if (!profile?.stripe_customer_id) {
      console.log('❌ No Stripe customer ID found for user')
      throw new Error('No Stripe customer found - please subscribe first')
    }
    
    console.log('✅ Stripe customer ID found:', profile.stripe_customer_id)

    // Create portal session with Stripe
    console.log('🏪 Creating Stripe billing portal session...')
    console.log('📝 Portal session parameters:', {
      customer: profile.stripe_customer_id,
      return_url: return_url
    })
    
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: return_url,
    })
    
    console.log('✅ Stripe portal session created successfully')
    console.log('🔗 Portal session URL:', session.url)
    console.log('📊 Full Stripe response:', session)

    // Return the portal URL in the expected format
    const responseData = { portal_url: session.url }
    console.log('📤 Returning response data:', responseData)
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  } catch (error) {
    console.error('❌ Stripe portal error:', error)
    console.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
}) 