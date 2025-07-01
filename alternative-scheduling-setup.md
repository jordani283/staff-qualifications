# Alternative Email Notifications Scheduling

If `pg_cron` is not available on your Supabase instance, here are alternative methods to schedule daily email notifications:

## Option 1: GitHub Actions (Free & Reliable)

Create `.github/workflows/daily-email-notifications.yml`:

```yaml
name: Daily Certification Expiry Notifications

on:
  schedule:
    # Run daily at 9:00 AM UTC
    - cron: '0 9 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Send Certification Expiry Reminders
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -d '{"scheduled": true}' \
            https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/send-expiry-reminders
```

**Setup:**
1. Add `SUPABASE_SERVICE_ROLE_KEY` to your GitHub repository secrets
2. Commit this workflow file to your repository
3. GitHub will automatically run it daily

## Option 2: External Cron Service

### Using cron-job.org (Free):
1. Go to [cron-job.org](https://cron-job.org)
2. Create account and new cron job
3. Set URL: `https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/send-expiry-reminders`
4. Set schedule: Daily at 9:00 AM
5. Add headers:
   - `Content-Type: application/json`
   - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
6. Set method: POST
7. Set body: `{"scheduled": true}`

### Using EasyCron (Free tier available):
Similar setup to cron-job.org with webhook configuration.

## Option 3: Manual Trigger Function

Create a simple function that admins can call manually:

```sql
-- Create manual trigger function
CREATE OR REPLACE FUNCTION manual_trigger_expiry_reminders()
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

GRANT EXECUTE ON FUNCTION manual_trigger_expiry_reminders() TO authenticated;
```

Then admins can run: `SELECT manual_trigger_expiry_reminders();`

## Option 4: Vercel Cron (if using Vercel)

If your app is deployed on Vercel, create `/api/cron/send-notifications.js`:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://uydysrzsvnclyxaqdsag.supabase.co/functions/v1/send-expiry-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ scheduled: true })
    });

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/send-notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Recommendation

**GitHub Actions (Option 1)** is recommended because:
- ✅ Free and reliable
- ✅ Easy to set up
- ✅ Version controlled
- ✅ Can add logging and monitoring
- ✅ No external dependencies 
