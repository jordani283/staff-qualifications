import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface ExpiringCertification {
  staff_id: string
  staff_full_name: string
  staff_email: string
  certification_id: string
  certification_name: string
  certification_type: string
  expiry_date: string
  company_name: string
  admin_email: string
}

interface SendGridEmail {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>
    subject: string
  }>
  from: {
    email: string
    name: string
  }
  content: Array<{
    type: string
    value: string
  }>
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    console.log('🔔 Starting certification expiry reminder process...')

    // Get SendGrid API key
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set')
    }

    // Get app settings for admin email and base URL
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['admin_email', 'app_base_url'])

    if (settingsError) {
      console.error('Error fetching app settings:', settingsError)
      throw new Error('Failed to fetch app settings')
    }

    const adminEmail = settings?.find(s => s.key === 'admin_email')?.value || 'admin@staffcertify.com'
    const baseUrl = settings?.find(s => s.key === 'app_base_url')?.value || 'https://yourstaffcertifyapp.com'

    console.log(`📧 Admin email: ${adminEmail}`)
    console.log(`🌐 Base URL: ${baseUrl}`)

    // Call the database function to get expiring certifications
    const { data: expiringCerts, error: certsError } = await supabase
      .rpc('get_expiring_certifications')

    if (certsError) {
      console.error('Error fetching expiring certifications:', certsError)
      throw new Error('Failed to fetch expiring certifications')
    }

    const certifications = expiringCerts as ExpiringCertification[]
    
    if (!certifications || certifications.length === 0) {
      console.log('✅ No certifications expiring today')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No certifications expiring today',
        count: 0
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`🔍 Found ${certifications.length} expiring certifications`)

    let emailsSent = 0
    let emailsFailed = 0
    const failures: string[] = []

    // Send emails for each expiring certification
    for (const cert of certifications) {
      try {
        // Send email to staff member
        const staffEmailSent = await sendExpiryEmail({
          sendGridApiKey,
          recipientEmail: cert.staff_email,
          recipientName: cert.staff_full_name,
          staffName: cert.staff_full_name,
          certificationName: cert.certification_name,
          certificationId: cert.certification_id,
          staffId: cert.staff_id,
          baseUrl,
          isAdminEmail: false
        })

        if (staffEmailSent) {
          emailsSent++
          console.log(`✅ Staff email sent to ${cert.staff_email} for ${cert.certification_name}`)
        } else {
          emailsFailed++
          failures.push(`Staff email to ${cert.staff_email}`)
        }

        // Send email to admin
        const adminEmailSent = await sendExpiryEmail({
          sendGridApiKey,
          recipientEmail: adminEmail,
          recipientName: 'Administrator',
          staffName: cert.staff_full_name,
          certificationName: cert.certification_name,
          certificationId: cert.certification_id,
          staffId: cert.staff_id,
          baseUrl,
          isAdminEmail: true
        })

        if (adminEmailSent) {
          emailsSent++
          console.log(`✅ Admin email sent to ${adminEmail} for ${cert.staff_full_name}'s ${cert.certification_name}`)
        } else {
          emailsFailed++
          failures.push(`Admin email to ${adminEmail}`)
        }

        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error processing certification ${cert.certification_id}:`, error)
        emailsFailed += 2 // Both staff and admin emails failed
        failures.push(`Both emails for ${cert.staff_full_name}'s ${cert.certification_name}`)
      }
    }

    console.log(`📊 Email summary: ${emailsSent} sent, ${emailsFailed} failed`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Certification expiry reminders processed',
      totalCertifications: certifications.length,
      emailsSent,
      emailsFailed,
      failures: failures.length > 0 ? failures : undefined
    }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Error in send-expiry-reminders:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function sendExpiryEmail({
  sendGridApiKey,
  recipientEmail,
  recipientName,
  staffName,
  certificationName,
  certificationId,
  staffId,
  baseUrl,
  isAdminEmail
}: {
  sendGridApiKey: string
  recipientEmail: string
  recipientName: string
  staffName: string
  certificationName: string
  certificationId: string
  staffId: string
  baseUrl: string
  isAdminEmail: boolean
}): Promise<boolean> {
  try {
    const certificationUrl = `${baseUrl}/staff/${staffId}/certifications/${certificationId}`
    const staffUrl = `${baseUrl}/staff/${staffId}`
    
    const subject = isAdminEmail 
      ? `Certification Expiry Alert: ${staffName} - ${certificationName}`
      : `Your Qualification "${certificationName}" is Expiring Today`
    
    const htmlContent = isAdminEmail ? generateAdminEmailHTML({
      staffName,
      certificationName,
      certificationUrl,
      staffUrl
    }) : generateStaffEmailHTML({
      staffName,
      certificationName,
      certificationUrl
    })

    const textContent = isAdminEmail
      ? `Certification Expiry Alert: ${staffName}'s qualification "${certificationName}" is expiring today. View details: ${certificationUrl}`
      : `Your qualification "${certificationName}" is expiring today. Please take action to renew it. View details: ${certificationUrl}`

    const email: SendGridEmail = {
      personalizations: [{
        to: [{ email: recipientEmail, name: recipientName }],
        subject: subject
      }],
      from: {
        email: 'notifications@staffcertify.com',
        name: 'StaffCertify Notifications'
      },
      content: [
        {
          type: 'text/plain',
          value: textContent
        },
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(email),
    })

    if (response.ok) {
      return true
    } else {
      const errorText = await response.text()
      console.error(`SendGrid error (${response.status}):`, errorText)
      return false
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

function generateStaffEmailHTML({ staffName, certificationName, certificationUrl }: {
  staffName: string
  certificationName: string
  certificationUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certification Expiry Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border-left: 5px solid #dc3545;">
    <h2 style="color: #dc3545; margin-top: 0;">⚠️ Certification Expiry Notice</h2>
    
    <p>Dear ${staffName},</p>
    
    <p>This is an important reminder that your qualification <strong>"${certificationName}"</strong> is expiring today.</p>
    
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
      <h3 style="margin-top: 0; color: #495057;">Action Required</h3>
      <p>Please take immediate action to renew this certification to maintain your compliance status.</p>
    </div>
    
    <p>
      <a href="${certificationUrl}" 
         style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Certification Details
      </a>
    </p>
    
    <p>If you have any questions, please contact your administrator.</p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
    <p style="font-size: 12px; color: #6c757d;">
      This is an automated message from StaffCertify. Please do not reply to this email.
    </p>
  </div>
</body>
</html>`
}

function generateAdminEmailHTML({ staffName, certificationName, certificationUrl, staffUrl }: {
  staffName: string
  certificationName: string
  certificationUrl: string
  staffUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certification Expiry Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; border-left: 5px solid #ffc107;">
    <h2 style="color: #856404; margin-top: 0;">🔔 Certification Expiry Alert</h2>
    
    <p>Dear Administrator,</p>
    
    <p>A staff member's certification is expiring today and requires attention:</p>
    
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border: 1px solid #dee2e6;">
      <h3 style="margin-top: 0; color: #495057;">Expiry Details</h3>
      <p><strong>Staff Member:</strong> ${staffName}</p>
      <p><strong>Certification:</strong> ${certificationName}</p>
      <p><strong>Expiry Date:</strong> Today</p>
    </div>
    
    <div style="margin: 20px 0;">
      <a href="${certificationUrl}" 
         style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
        View Certification
      </a>
      <a href="${staffUrl}" 
         style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Staff Profile
      </a>
    </div>
    
    <p>Please follow up with the staff member to ensure compliance is maintained.</p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
    <p style="font-size: 12px; color: #6c757d;">
      This is an automated message from StaffCertify. 
    </p>
  </div>
</body>
</html>`
} 