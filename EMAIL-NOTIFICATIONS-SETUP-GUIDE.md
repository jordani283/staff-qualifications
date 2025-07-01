# Certification Expiry Email Notifications Setup Guide

This guide walks you through setting up automated email notifications for expiring certifications in your TeamCertify app.

## Overview

The system consists of:
- **PostgreSQL Function**: Identifies certifications expiring today
- **Supabase Edge Function**: Sends emails via SendGrid
- **pg_cron Job**: Runs daily to trigger the process
- **SendGrid Integration**: Handles email delivery

## Prerequisites

- Active SendGrid account with API key
- Supabase project with Edge Functions enabled
- Postgres with pg_cron extension (available in Supabase)
- Admin access to your Supabase dashboard

---

## Step 1: SendGrid Setup

### 1.1 Create SendGrid Account
1. Go to [SendGrid](https://sendgrid.com) and create an account
2. Verify your email address
3. Complete the account setup

### 1.2 Get API Key
1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Choose **Restricted Access**
4. Give it a name: `TeamCertify Email Notifications`
5. Under **Mail Send**, select **Full Access**
6. Click **Create & View**
7. **Copy the API key immediately** (you won't see it again)

### 1.3 Verify Sender Identity (Required)
1. Go to **Settings** → **Sender Authentication**
2. Choose either:
   - **Single Sender Verification** (easier, for single email)
   - **Domain Authentication** (better for production)

For Single Sender:
1. Click **Create New Sender**
2. Use email: `notifications@teamcertify.com` (or your domain)
3. Fill in the form and verify the email address

---

## Step 2: Supabase Configuration

### 2.1 Set Environment Variables
1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **Edge Functions**
3. In the **Environment Variables** section, add:

```
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
```

### 2.2 Deploy Database Functions
1. In Supabase Dashboard, go to **SQL Editor**
2. Run the contents of `certification-expiry-notifications.sql`:

```sql
-- Copy and paste the entire content from certification-expiry-notifications.sql
-- This creates the database function and app_settings table
```

### 2.3 Configure App Settings
Run these SQL commands to set your configuration:

```sql
-- Update admin email (replace with your actual admin email)
UPDATE app_settings 
SET value = 'your-admin@yourcompany.com' 
WHERE key = 'admin_email';

-- Update app base URL (replace with your actual app URL)
UPDATE app_settings 
SET value = 'https://yourdomain.com' 
WHERE key = 'app_base_url';
```

---

## Step 3: Deploy Edge Function

### 3.1 Deploy the Function
```bash
# In your project root
npx supabase functions deploy send-expiry-reminders
```

### 3.2 Verify Deployment
1. Go to Supabase Dashboard → **Functions**
2. You should see `send-expiry-reminders` listed
3. Click on it to view logs and details

---

## Step 4: Set Up Scheduling

### 4.1 Run pg_cron Setup
1. In Supabase SQL Editor, run the contents of `email-notifications-setup.sql`
2. This schedules the daily job to run at 9:00 AM UTC

### 4.2 Verify Cron Job
```sql
-- Check if the job was created
SELECT * FROM cron.job;

-- View recent job runs
SELECT * FROM cron.job_run_details 
WHERE jobname = 'send-daily-expiry-reminders' 
ORDER BY start_time DESC LIMIT 5;
```

---

## Step 5: Testing

### 5.1 Manual Testing
You can test the system manually using the SQL Editor:

```sql
-- Trigger the email function manually
SELECT trigger_expiry_reminders();
```

### 5.2 Test with Sample Data
To test with certifications expiring today:

```sql
-- Temporarily set a certification to expire today
UPDATE certifications 
SET expiry_date = CURRENT_DATE 
WHERE id = 'some-certification-id';

-- Then trigger the function
SELECT trigger_expiry_reminders();

-- Don't forget to reset the expiry date afterward!
```

### 5.3 Check Function Logs
1. Go to Supabase Dashboard → **Functions** → `send-expiry-reminders`
2. Click **Logs** tab to see execution details

---

## Configuration Options

### Email Timing
You can change when emails are sent by modifying the cron schedule:

```sql
-- Change from 9 AM to 8 AM UTC
SELECT cron.unschedule('send-daily-expiry-reminders');
SELECT cron.schedule(
    'send-daily-expiry-reminders',
    '0 8 * * *',  -- 8:00 AM daily
    $$ /* ... rest of the cron job ... */ $$
);
```

### Email Templates
To customize email content, modify the HTML templates in `supabase/functions/send-expiry-reminders/index.ts`:
- `generateStaffEmailHTML()` - Staff member email
- `generateAdminEmailHTML()` - Administrator email

### Multiple Certifications
Currently, the system sends separate emails for each expiring certification. To send one consolidated email per staff member, you would need to modify the Edge Function logic.

---

## Monitoring and Maintenance

### Check Email Delivery
1. **SendGrid Dashboard**: Monitor delivery statistics
2. **Supabase Logs**: Check function execution logs
3. **Cron Logs**: Monitor scheduled job execution

### Common Issues

#### Emails Not Sending
1. Check SendGrid API key is correct
2. Verify sender email is authenticated in SendGrid
3. Check function logs for errors

#### Cron Job Not Running
1. Verify pg_cron extension is enabled
2. Check cron job exists: `SELECT * FROM cron.job;`
3. View error logs: `SELECT * FROM cron.job_run_details;`

#### No Certifications Found
1. Verify certification data exists
2. Check expiry dates are set correctly
3. Ensure staff have email addresses

### Database Queries for Monitoring

```sql
-- See what certifications expire today
SELECT * FROM get_expiring_certifications();

-- View recent cron job executions
SELECT 
    jobname, 
    start_time, 
    end_time, 
    return_message,
    status
FROM cron.job_run_details 
WHERE jobname = 'send-daily-expiry-reminders'
ORDER BY start_time DESC 
LIMIT 10;

-- Check app configuration
SELECT * FROM app_settings;
```

---

## Future Improvements

### Planned Enhancements
1. **Consolidated Emails**: Send one email per staff member with all expiring certifications
2. **Advanced Scheduling**: Different reminder schedules (7 days, 30 days before)
3. **Email Templates**: Customizable email templates via admin interface
4. **Delivery Tracking**: Track email opens and clicks
5. **SMS Notifications**: Alternative to email notifications

### Multiple Reminder Schedules
You could set up additional cron jobs for different reminder timing:

```sql
-- 7 days before expiry
SELECT cron.schedule(
    'send-weekly-expiry-reminders',
    '0 9 * * *',
    $$ 
    -- Modified function call for 7-day reminders
    $$
);

-- 30 days before expiry  
SELECT cron.schedule(
    'send-monthly-expiry-reminders',
    '0 9 1 * *',  -- First day of each month
    $$
    -- Modified function call for 30-day reminders
    $$
);
```

---

## Security Considerations

1. **API Keys**: Store SendGrid API key securely in Supabase environment variables
2. **Email Privacy**: Ensure GDPR compliance for staff email usage
3. **Access Control**: Limit who can manually trigger email functions
4. **Rate Limiting**: SendGrid has rate limits; consider this for large organizations

---

## Support

If you encounter issues:

1. Check Supabase function logs first
2. Verify SendGrid delivery in their dashboard
3. Review this guide for common solutions
4. Check pg_cron job execution logs

## Summary

Once set up, this system will:
- ✅ Run automatically every day at 9 AM UTC
- ✅ Find all certifications expiring that day
- ✅ Send professional emails to staff and administrators
- ✅ Include direct links back to your app
- ✅ Provide detailed logging for monitoring
- ✅ Handle errors gracefully

The system is production-ready and will help ensure your team never misses a certification renewal! 