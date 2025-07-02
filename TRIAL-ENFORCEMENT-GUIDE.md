# Trial Enforcement System Guide

## Overview

This guide explains the robust trial management system implemented for TeamCertify. The system handles trial setup, monitoring, expiry enforcement, and user experience management.

## 🔧 System Components

### 1. **Trial Setup** ✅
- **Automatic 30-day trials** for new users
- **Database triggers** ensure every user gets trial dates
- **Fallback handling** for existing users without trial dates

### 2. **Trial Status Tracking** ✅
- `trial` - Active trial period
- `trial_expired` - Trial has ended, upgrade required
- `active` - Paid subscription active
- `canceled` - Subscription canceled

### 3. **Expiry Enforcement** 🆕
- **Automatic status updates** when trials expire
- **Backend functions** to process expired trials
- **Feature flags** to control enforcement behavior

### 4. **Frontend Experience** ✅
- **Trial countdown** with days remaining
- **Expiry warnings** and upgrade prompts  
- **Status-specific UI** for each trial state
- **Clear upgrade paths** with call-to-action buttons

## 🚀 How It Works

### Trial Lifecycle

```
New User Signup
       ↓
   30-Day Trial (status: 'trial')
       ↓
  Trial Expires (automatic detection)
       ↓
   Status → 'trial_expired'
       ↓
  User Upgrades → 'active'
```

### Backend Functions

1. **`update_expired_trials()`**
   - Automatically updates expired trials to 'trial_expired'
   - Returns count of updated users
   - Logs cleanup operations

2. **`get_expiring_trials(days_before)`**
   - Finds trials expiring in X days
   - Used for email notifications
   - Returns user details and days remaining

3. **`is_trial_access_allowed(user_id)`**
   - Checks if user has valid access
   - Used for optional access restrictions
   - Returns boolean

## 🛠 Setup Instructions

### 1. Run the Database Setup
```sql
-- Run in Supabase SQL Editor
psql [your-db-url] < trial-expiry-enforcement.sql
```

### 2. Configure Feature Flags
```sql
-- Enable/disable trial enforcement
UPDATE feature_flags 
SET enabled = true 
WHERE key = 'enforce_trial_expiry';

-- Enable trial expiry emails
UPDATE feature_flags 
SET enabled = true 
WHERE key = 'trial_expiry_emails';
```

### 3. Set Up Automated Cleanup (Optional)
You can run the cleanup function manually or set up a cron job:

```sql
-- Manual cleanup (run daily)
SELECT update_expired_trials();

-- Check results
SELECT * FROM app_settings WHERE key = 'last_trial_cleanup';
```

## 📊 Monitoring & Analytics

### Check Trial Status
```sql
-- View your trial status
SELECT * FROM v_trial_status;

-- Check all expiring trials (next 7 days)
SELECT * FROM get_expiring_trials(7);

-- Count trials by status
SELECT subscription_status, COUNT(*) 
FROM profiles 
WHERE subscription_status LIKE '%trial%' 
GROUP BY subscription_status;
```

### Feature Flag Status
```sql
SELECT * FROM feature_flags WHERE key LIKE '%trial%';
```

## 🎯 User Experience

### Active Trial Users See:
- ✅ "Starter Trial" with blue badge
- ✅ "Free during trial" billing
- ✅ Trial countdown: "15 days remaining"
- ✅ "Trial in progress" action area

### Expired Trial Users See:
- ❌ "Starter Trial (Expired)" with red badge  
- ❌ "Trial Ended - upgrade required" billing
- ❌ "Trial Expired" notice with date
- ❌ Prominent upgrade prompts

## 🔐 Access Control (Optional)

The system includes optional access restrictions:

### Enable Strict Enforcement
```sql
-- This will prevent expired trial users from accessing features
UPDATE feature_flags 
SET enabled = true 
WHERE key = 'enforce_trial_expiry';
```

### Test Access Control
```sql
-- Check if current user has access
SELECT is_trial_access_allowed(auth.uid());

-- View access status in trial view
SELECT access_allowed FROM v_trial_status;
```

## 📧 Email Notifications (Future Enhancement)

The system is prepared for email notifications:

1. **Trial expiry warnings** (3, 7 days before)
2. **Trial expired notices**
3. **Upgrade reminders**

Use the `get_expiring_trials()` function to identify users for notifications.

## 🧪 Testing the System

### 1. Test Trial Setup
```sql
-- Create test user and verify trial is set
SELECT subscription_status, trial_ends_at FROM profiles WHERE id = '[test-user-id]';
```

### 2. Test Expiry Processing
```sql
-- Manually expire a trial for testing
UPDATE profiles 
SET trial_ends_at = CURRENT_DATE - INTERVAL '1 day'
WHERE id = '[test-user-id]';

-- Run cleanup and verify status change
SELECT update_expired_trials();
SELECT subscription_status FROM profiles WHERE id = '[test-user-id]';
```

### 3. Test Frontend Experience
- Visit subscription page with active trial
- Manually set trial_ends_at to past date
- Refresh page and verify "Trial Expired" UI

## 📈 Benefits

✅ **Automatic trial management** - No manual intervention required  
✅ **Clear user communication** - Users always know their status  
✅ **Flexible enforcement** - Feature flags control behavior  
✅ **Analytics ready** - Track conversion and usage patterns  
✅ **Scalable** - Handles thousands of users automatically  
✅ **Future-proof** - Ready for email notifications and advanced features  

## 🔧 Maintenance

### Daily Tasks
- Monitor trial expiry processing
- Check for any manual interventions needed

### Weekly Tasks  
- Review trial-to-paid conversion rates
- Analyze user behavior patterns
- Update trial period if needed

### Monthly Tasks
- Review feature flag settings
- Optimize trial experience based on data
- Plan trial enhancement features

This system provides a complete, robust foundation for trial management that scales with your user base and business needs. 