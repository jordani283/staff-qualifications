-- Email Notifications Scheduling Setup using pg_cron
-- This file contains the pg_cron job setup for daily email notifications

-- 1. Enable the pg_cron extension (if not already enabled)
-- Note: This may require superuser privileges. Check with your Supabase support if needed.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the daily certification expiry reminder job
-- This will run every day at 9:00 AM UTC
-- Adjust the time as needed for your timezone
SELECT cron.schedule(
    'send-daily-expiry-reminders',           -- Job name
    '0 9 * * *',                             -- Cron expression: 9:00 AM daily
    $$
    SELECT
      net.http_post(
          url:='https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/send-expiry-reminders',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
          body:='{"scheduled": true}'::jsonb
      ) as request_id;
    $$
);

-- 3. Alternative: Schedule for a different time (e.g., 8:00 AM)
-- Uncomment and modify as needed:
/*
SELECT cron.schedule(
    'send-daily-expiry-reminders-8am',
    '0 8 * * *',                             -- 8:00 AM daily
    $$
    SELECT
      net.http_post(
          url:='https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/send-expiry-reminders',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
          body:='{"scheduled": true}'::jsonb
      ) as request_id;
    $$
);
*/

-- 4. Check existing cron jobs
-- Run this to see all scheduled jobs:
-- SELECT * FROM cron.job;

-- 5. Disable/remove a cron job if needed
-- SELECT cron.unschedule('send-daily-expiry-reminders');

-- 6. Alternative manual trigger (for testing)
-- You can also manually trigger the function like this:
/*
SELECT
  net.http_post(
      url:='https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/send-expiry-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{"manual_trigger": true}'::jsonb
  ) as request_id;
*/

-- 7. Create a function to manually trigger email reminders (optional)
-- This creates a function that admins can call to manually send reminders
CREATE OR REPLACE FUNCTION trigger_expiry_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT
      net.http_post(
          url:='https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/send-expiry-reminders',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
          body:='{"manual_trigger": true}'::jsonb
      ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION trigger_expiry_reminders() TO authenticated;

-- 8. View cron job logs (to monitor execution)
-- SELECT * FROM cron.job_run_details WHERE jobname = 'send-daily-expiry-reminders' ORDER BY start_time DESC LIMIT 10;

-- 9. Cron expression examples for different schedules:
-- '0 9 * * *'     - Daily at 9:00 AM
-- '0 8 * * 1-5'   - Weekdays at 8:00 AM (Monday to Friday)
-- '0 10 * * 1'    - Every Monday at 10:00 AM
-- '0 9 1 * *'     - First day of every month at 9:00 AM
-- '*/30 * * * *'  - Every 30 minutes (for testing only!)

-- 10. Important Notes:
-- - All times are in UTC
-- - Adjust the time zone as needed for your location
-- - The service_role_key is automatically available in the cron context
-- - Make sure the Edge Function URL matches your actual Supabase project
-- - Monitor the cron job logs to ensure it's running successfully 