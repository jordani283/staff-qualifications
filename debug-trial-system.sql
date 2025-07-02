-- Debug trial system step by step

-- 1. Check if we have any users at all
SELECT 'Total users' as check_type, count(*) as count FROM public.profiles;

-- 2. Check if any users have trial data  
SELECT 'Users with trial data' as check_type, count(*) as count 
FROM public.profiles 
WHERE trial_ends_at IS NOT NULL;

-- 3. Check subscription statuses
SELECT 'Subscription status distribution' as check_type, subscription_status, count(*) as count
FROM public.profiles 
GROUP BY subscription_status;

-- 4. Show sample user data (first 3 users)
SELECT 'Sample user data' as check_type, id, first_name, subscription_status, trial_ends_at, created_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 3;

-- 5. Test the trial access function with actual user IDs
-- First, let's see what user IDs exist
SELECT 'Available user IDs' as check_type, id 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 3;

-- 6. Test function with a specific user (you'll need to replace the UUID)
-- SELECT 'Testing function with real user' as check_type, 
--        is_trial_access_allowed('REPLACE_WITH_REAL_USER_ID') as access_allowed;

-- 7. Check if the trial functions exist
SELECT 'Trial functions exist' as check_type, 
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_trial_access_allowed') as function_exists;

-- 8. Check if feature flags table has data
SELECT 'Feature flags' as check_type, key, enabled FROM public.feature_flags;

-- 9. Test the view without auth context
SELECT 'Testing view structure' as check_type, 
       count(*) as rows,
       min(trial_ends_at) as earliest_trial,
       max(trial_ends_at) as latest_trial
FROM public.profiles 
WHERE trial_ends_at IS NOT NULL;

-- 10. Check what auth.uid() returns (will be null in SQL editor)
SELECT 'Auth context' as check_type, auth.uid() as current_user;

