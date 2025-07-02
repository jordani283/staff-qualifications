-- Fix Trial Setup - Populate missing trial_ends_at dates
-- Run this in your Supabase SQL editor

-- 1. Update existing users who don't have trial_ends_at set
-- Set 30-day trial from their created_at date (or 30 days from now if created_at is old)
UPDATE public.profiles 
SET trial_ends_at = CASE 
    -- If user was created recently (within last 30 days), set trial to 30 days from creation
    WHEN created_at > (CURRENT_DATE - INTERVAL '30 days') THEN created_at + INTERVAL '30 days'
    -- If user was created more than 30 days ago, set trial to 7 days from now (grace period)
    ELSE CURRENT_DATE + INTERVAL '7 days'
END
WHERE trial_ends_at IS NULL 
AND subscription_status = 'trial';

-- 2. Create function to automatically set trial dates for new users
CREATE OR REPLACE FUNCTION set_trial_period_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Set trial end date to 30 days from now if not already set
    IF NEW.trial_ends_at IS NULL AND (NEW.subscription_status IS NULL OR NEW.subscription_status = 'trial') THEN
        NEW.trial_ends_at := CURRENT_DATE + INTERVAL '30 days';
        NEW.subscription_status := 'trial';
        NEW.subscription_plan := COALESCE(NEW.subscription_plan, 'starter');
        NEW.billing_cycle := COALESCE(NEW.billing_cycle, 'monthly');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to automatically set trial period on profile creation/update
DROP TRIGGER IF EXISTS set_trial_period_trigger ON public.profiles;
CREATE TRIGGER set_trial_period_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_trial_period_for_new_user();

-- 4. Update the user registration function to include trial setup
-- This ensures new users get proper trial dates
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        full_name,
        subscription_status,
        subscription_plan,
        billing_cycle,
        trial_ends_at,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        NULL, -- Will be set during onboarding
        NULL, -- Will be set during onboarding  
        new.email, -- Temporary full_name
        'trial',
        'starter',
        'monthly',
        CURRENT_DATE + INTERVAL '30 days',
        now(),
        now()
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create or update the auth trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_trial_period_for_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

-- 7. Verification query - check that trial dates are now set
-- SELECT 
--     id, 
--     first_name, 
--     subscription_status, 
--     trial_ends_at,
--     CASE 
--         WHEN trial_ends_at > CURRENT_DATE THEN 'Active Trial'
--         WHEN trial_ends_at <= CURRENT_DATE THEN 'Trial Expired'
--         ELSE 'No Trial Date'
--     END as trial_status
-- FROM public.profiles 
-- WHERE subscription_status = 'trial'
-- ORDER BY created_at DESC; 