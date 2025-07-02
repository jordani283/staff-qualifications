-- Fix Signup Trigger - Debug and Repair
-- Run this in your Supabase SQL editor

-- 1. First, let's disable the problematic trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create a simpler, more robust version of the function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert basic profile with only essential fields
    INSERT INTO public.profiles (
        id,
        subscription_status,
        subscription_plan,
        billing_cycle,
        trial_ends_at,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        'trial',
        'starter',
        'monthly',
        CURRENT_DATE + INTERVAL '30 days',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        trial_ends_at = COALESCE(profiles.trial_ends_at, CURRENT_DATE + INTERVAL '30 days'),
        subscription_status = COALESCE(profiles.subscription_status, 'trial'),
        subscription_plan = COALESCE(profiles.subscription_plan, 'starter'),
        billing_cycle = COALESCE(profiles.billing_cycle, 'monthly'),
        updated_at = now();
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-enable the trigger with the fixed function
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Alternative: If you want to completely disable auto-profile creation for now
-- Just run these lines instead of the above:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS handle_new_user();

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role; 