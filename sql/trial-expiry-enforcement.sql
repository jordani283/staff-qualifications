-- Trial Expiry Enforcement System
-- Run this in your Supabase SQL editor

-- 1. Create trial expiry enforcement function
CREATE OR REPLACE FUNCTION update_expired_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update expired trial users to 'trial_expired' status
    UPDATE public.profiles 
    SET 
        subscription_status = 'trial_expired',
        updated_at = now()
    WHERE 
        subscription_status = 'trial' 
        AND trial_ends_at <= CURRENT_DATE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the operation
    INSERT INTO app_settings (key, value, description)
    VALUES (
        'last_trial_cleanup',
        CURRENT_TIMESTAMP::text,
        'Last time expired trials were processed'
    )
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = now();
        
    RETURN updated_count;
END;
$$;

-- 2. Create function to get expiring trials (for notifications)
DROP FUNCTION IF EXISTS get_expiring_trials(INTEGER);
CREATE OR REPLACE FUNCTION get_expiring_trials(days_before INTEGER DEFAULT 3)
RETURNS TABLE (
    user_id uuid,
    first_name text,
    last_name text,
    email varchar(255),
    company_name text,
    trial_ends_at timestamp with time zone,
    days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.first_name,
        p.last_name,
        au.email,
        p.company_name,
        p.trial_ends_at,
        EXTRACT(DAY FROM (p.trial_ends_at - CURRENT_DATE))::integer as days_remaining
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE 
        p.subscription_status = 'trial'
        AND p.trial_ends_at IS NOT NULL
        AND p.trial_ends_at BETWEEN CURRENT_DATE AND (CURRENT_DATE + (days_before || ' days')::INTERVAL)
    ORDER BY p.trial_ends_at ASC;
END;
$$;

-- 3. Create trial status validation function for access control
CREATE OR REPLACE FUNCTION is_trial_access_allowed(user_uuid uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        CASE 
            WHEN p.subscription_status = 'trial' AND p.trial_ends_at > CURRENT_DATE THEN true
            WHEN p.subscription_status IN ('active', 'trialing') THEN true
            ELSE false
        END
    FROM public.profiles p
    WHERE p.id = user_uuid;
$$;

-- 4. Add trial_expired status to subscription status display
UPDATE public.profiles 
SET subscription_status = 'trial_expired'
WHERE subscription_status = 'trial' 
AND trial_ends_at <= CURRENT_DATE;

-- 5. Create RLS policy for trial enforcement (if needed)
-- This ensures expired trial users see limited data
DROP POLICY IF EXISTS "trial_access_restriction" ON public.staff;
CREATE POLICY "trial_access_restriction" ON public.staff
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() AND 
    (
        SELECT is_trial_access_allowed(auth.uid())
    )
);

-- However, let's make this optional with a feature flag
CREATE TABLE IF NOT EXISTS public.feature_flags (
    key text PRIMARY KEY,
    enabled boolean DEFAULT false,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.feature_flags (key, enabled, description)
VALUES 
    ('enforce_trial_expiry', false, 'Restrict access for expired trial users'),
    ('trial_expiry_emails', true, 'Send email notifications before trial expires')
ON CONFLICT (key) DO NOTHING;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION update_expired_trials() TO service_role;
GRANT EXECUTE ON FUNCTION get_expiring_trials(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION is_trial_access_allowed(uuid) TO authenticated;
GRANT SELECT ON public.feature_flags TO authenticated;

-- 7. Create a view to check trial status easily
CREATE OR REPLACE VIEW public.v_trial_status AS
SELECT 
    p.id as user_id,
    p.first_name,
    p.last_name,
    p.subscription_status,
    p.trial_ends_at,
    CASE 
        WHEN p.subscription_status != 'trial' THEN 'not_trial'
        WHEN p.trial_ends_at IS NULL THEN 'no_end_date'
        WHEN p.trial_ends_at > CURRENT_DATE THEN 'active'
        WHEN p.trial_ends_at = CURRENT_DATE THEN 'expires_today'
        ELSE 'expired'
    END as trial_status,
    CASE 
        WHEN p.trial_ends_at > CURRENT_DATE THEN 
            EXTRACT(DAY FROM (p.trial_ends_at - CURRENT_DATE))::integer
        ELSE 0
    END as days_remaining,
    is_trial_access_allowed(p.id) as access_allowed
FROM public.profiles p
WHERE p.id = auth.uid();

GRANT SELECT ON public.v_trial_status TO authenticated;

-- 8. Test the system
-- Verification queries:

-- Check trial status for current user
-- SELECT * FROM v_trial_status;

-- Check users with expiring trials (next 3 days)
-- SELECT * FROM get_expiring_trials(3);

-- Run manual trial cleanup
-- SELECT update_expired_trials() AS users_updated;

-- Check feature flags
-- SELECT * FROM feature_flags WHERE key LIKE '%trial%'; 