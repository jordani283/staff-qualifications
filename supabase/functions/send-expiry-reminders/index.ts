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

// Security: Define allowed origins
const ALLOWED_ORIGINS = [
  'https://teamcertify.com',
  'https://www.teamcertify.com',
  'https://teamcertify.vercel.app'
]

serve(async (req) => {
  // Security: Validate origin
  const origin = req.headers.get('origin')
  const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin)
  
  // Handle CORS with restricted origins
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': isAllowedOrigin ? (origin || 'null') : 'null',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Function-Auth-Token',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Security: Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Security: Validate origin for actual requests
  if (!isAllowedOrigin) {
    console.error('🚫 Unauthorized origin:', origin)
    return new Response(JSON.stringify({ error: 'Unauthorized origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 🚨 CRITICAL ADDITIONAL AUTHENTICATION CHECK 🚨
  // Supabase already validated the service role key, but we add an extra layer
  const customToken = req.headers.get('X-Function-Auth-Token')
  const expectedCustomToken = Deno.env.get('FUNCTION_AUTH_TOKEN') // Additional secret for this function

  if (!customToken || customToken !== expectedCustomToken) {
    console.warn('🚫 Unauthorized access attempt to send-expiry-reminders function - custom token invalid.')
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or missing custom token' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    console.log('🔔 Starting certification expiry reminder process...')

    // Validate required environment variables
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

    const adminEmail = settings?.find(s => s.key === 'admin_email')?.value || 'admin@teamcertify.com'
    const baseUrl = settings?.find(s => s.key === 'app_base_url')?.value || 'https://teamcertify.com'

    // Security: Secure logging - don't expose actual values
    console.log('📧 Admin email configured:', adminEmail ? '[CONFIGURED]' : '[MISSING]')
    console.log('🌐 Base URL configured:', baseUrl ? '[CONFIGURED]' : '[MISSING]')

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
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || 'null'
        },
      })
    }

    console.log(`🔍 Found ${certifications.length} expiring certifications`)

    let emailsSent = 0
    let emailsFailed = 0
    const failures: string[] = []

    // Send emails for each expiring certification
    for (const cert of certifications) {
      try {
        // Security: Validate email addresses before sending
        if (!isValidEmail(cert.staff_email) || !isValidEmail(adminEmail)) {
          console.error('❌ Invalid email address detected')
          emailsFailed += 2
          failures.push(`Invalid email addresses for ${cert.staff_full_name}`)
          continue
        }

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
          console.log(`✅ Staff email sent for ${cert.certification_name}`)
        } else {
          emailsFailed++
          failures.push(`Staff email to ${maskEmail(cert.staff_email)}`)
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
          console.log(`✅ Admin email sent for ${cert.staff_full_name}'s ${cert.certification_name}`)
        } else {
          emailsFailed++
          failures.push(`Admin email to ${maskEmail(adminEmail)}`)
        }

        // Rate limiting: delay between emails
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error processing certification ${cert.certification_id}:`, error)
        emailsFailed += 2
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
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || 'null'
      },
    })

  } catch (error) {
    console.error('❌ Error in send-expiry-reminders:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || 'null'
      },
    })
  }
})

// Security: Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Security: Email masking for logs
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const maskedLocal = local.substring(0, 2) + '*'.repeat(Math.max(0, local.length - 2))
  return `${maskedLocal}@${domain}`
}

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
    // Use query-parameter deep links for SPA navigation
    const certificationUrl = `${baseUrl}/?go=cert&staffId=${encodeURIComponent(staffId)}&certId=${encodeURIComponent(certificationId)}`
    const staffUrl = `${baseUrl}/?go=staff&staffId=${encodeURIComponent(staffId)}`
    
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
        email: 'notifications@teamcertify.com',
        name: 'TeamCertify Notifications'
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
      This is an automated message from TeamCertify. Please do not reply to this email.
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
      This is an automated message from TeamCertify. 
    </p>
  </div>
</body>
</html>`
} 