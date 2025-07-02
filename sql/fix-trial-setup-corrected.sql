-- Fix Trial Setup - Corrected Version (handles missing created_at field)
-- Run this in your Supabase SQL editor

-- 0. First, fix the audit logs view that references non-existent full_name column
DROP VIEW IF EXISTS public.v_certification_audit_logs;

CREATE OR REPLACE VIEW public.v_certification_audit_logs AS
SELECT 
  cal.id,
  cal.user_id,
  cal.certification_id,
  cal.action_type,
  cal.field,
  cal.old_value,
  cal.new_value,
  cal.note,
  cal.created_at,
  COALESCE(
    CASE 
      WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
      THEN CONCAT(p.first_name, ' ', p.last_name)
      WHEN p.first_name IS NOT NULL 
      THEN p.first_name
      WHEN p.last_name IS NOT NULL 
      THEN p.last_name
      ELSE NULL
    END,
    au.email,
    'Unknown User'
  ) as performed_by
FROM public.certification_audit_logs cal
LEFT JOIN auth.users au ON cal.user_id = au.id
LEFT JOIN public.profiles p ON cal.user_id = p.id
ORDER BY cal.created_at DESC;

GRANT SELECT ON public.v_certification_audit_logs TO authenticated;

-- 1. Now, add created_at and updated_at fields to profiles if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Update existing profiles to have timestamps if they're null
UPDATE public.profiles 
SET 
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE created_at IS NULL OR updated_at IS NULL;

-- 3. Update existing trial users to have trial_ends_at dates
-- Since we don't know when they actually signed up, give them all 30 days from now
UPDATE public.profiles 
SET trial_ends_at = CURRENT_DATE + INTERVAL '30 days'
WHERE trial_ends_at IS NULL 
AND subscription_status = 'trial';

-- 4. Create function to automatically set trial dates for new users
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
    
    -- Set timestamps if not provided
    IF NEW.created_at IS NULL THEN
        NEW.created_at := now();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically set trial period on profile creation/update
DROP TRIGGER IF EXISTS set_trial_period_trigger ON public.profiles;
CREATE TRIGGER set_trial_period_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_trial_period_for_new_user();

-- 6. Update the user registration function to include trial setup
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
    )
    ON CONFLICT (id) DO UPDATE SET
        trial_ends_at = COALESCE(profiles.trial_ends_at, CURRENT_DATE + INTERVAL '30 days'),
        subscription_status = COALESCE(profiles.subscription_status, 'trial'),
        subscription_plan = COALESCE(profiles.subscription_plan, 'starter'),
        billing_cycle = COALESCE(profiles.billing_cycle, 'monthly'),
        updated_at = now();
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create or update the auth trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_trial_period_for_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- 11. Final verification query
SELECT 
    id, 
    first_name, 
    subscription_status, 
    trial_ends_at,
    created_at,
    CASE 
        WHEN trial_ends_at > CURRENT_DATE THEN 'Active Trial'
        WHEN trial_ends_at <= CURRENT_DATE THEN 'Trial Expired'
        ELSE 'No Trial Date'
    END as trial_status,
    EXTRACT(DAY FROM (trial_ends_at - CURRENT_DATE)) as days_remaining
FROM public.profiles 
WHERE subscription_status = 'trial'
ORDER BY created_at DESC
LIMIT 10; 