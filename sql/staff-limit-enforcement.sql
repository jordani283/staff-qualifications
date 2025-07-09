-- Staff Limit Enforcement for TeamCertify
-- This adds proper staff limit checking based on subscription plans

-- 1. Create function to check if user can add more staff
CREATE OR REPLACE FUNCTION public.can_add_staff(user_uuid uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        json_build_object(
            'canAdd', CASE 
                WHEN sp.staff_limit = -1 THEN true  -- unlimited
                WHEN staff_count.count < sp.staff_limit THEN true
                ELSE false
            END,
            'currentCount', staff_count.count,
            'maxAllowed', sp.staff_limit,
            'planName', sp.name,
            'unlimited', (sp.staff_limit = -1)
        )
    FROM public.profiles p
    LEFT JOIN public.subscription_plans sp ON p.subscription_plan = sp.id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM public.staff
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) staff_count ON p.id = staff_count.user_id
    WHERE p.id = user_uuid;
$$;

-- 2. Create function to get staff limit details for frontend
CREATE OR REPLACE FUNCTION public.get_staff_limit_info(user_uuid uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        json_build_object(
            'currentStaffCount', COALESCE(staff_count.count, 0),
            'staffLimit', COALESCE(sp.staff_limit, 10),
            'planName', COALESCE(sp.name, 'Starter'),
            'unlimited', (COALESCE(sp.staff_limit, 10) = -1),
            'nearLimit', (
                CASE 
                    WHEN sp.staff_limit = -1 THEN false
                    WHEN COALESCE(staff_count.count, 0) >= (sp.staff_limit * 0.8) THEN true
                    ELSE false
                END
            ),
            'atLimit', (
                CASE 
                    WHEN sp.staff_limit = -1 THEN false
                    WHEN COALESCE(staff_count.count, 0) >= sp.staff_limit THEN true
                    ELSE false
                END
            )
        )
    FROM public.profiles p
    LEFT JOIN public.subscription_plans sp ON p.subscription_plan = sp.id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM public.staff
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) staff_count ON p.id = staff_count.user_id
    WHERE p.id = user_uuid;
$$;

-- 3. Create trigger function to prevent staff insertion if limit exceeded
CREATE OR REPLACE FUNCTION public.check_staff_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    limit_info json;
    can_add boolean;
BEGIN
    -- Get staff limit information
    SELECT public.can_add_staff(NEW.user_id) INTO limit_info;
    
    -- Extract canAdd flag
    can_add := (limit_info->>'canAdd')::boolean;
    
    -- If user cannot add more staff, raise an exception
    IF NOT can_add THEN
        RAISE EXCEPTION 'Staff limit exceeded. You have reached the maximum number of staff members (%) for your % plan. Please upgrade your subscription to add more staff members.',
            (limit_info->>'maxAllowed'),
            (limit_info->>'planName');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger on staff table
DROP TRIGGER IF EXISTS staff_limit_check ON public.staff;
CREATE TRIGGER staff_limit_check
    BEFORE INSERT ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION public.check_staff_limit_before_insert();

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.can_add_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_limit_info(uuid) TO authenticated;

-- 6. Create view for easy staff limit checking
CREATE OR REPLACE VIEW public.v_user_staff_limits AS
SELECT 
    p.id as user_id,
    COALESCE(staff_count.count, 0) as current_staff_count,
    COALESCE(sp.staff_limit, 10) as staff_limit,
    COALESCE(sp.name, 'Starter') as plan_name,
    (COALESCE(sp.staff_limit, 10) = -1) as unlimited,
    CASE 
        WHEN sp.staff_limit = -1 THEN true
        WHEN COALESCE(staff_count.count, 0) < sp.staff_limit THEN true
        ELSE false
    END as can_add_staff,
    CASE 
        WHEN sp.staff_limit = -1 THEN false
        WHEN COALESCE(staff_count.count, 0) >= (sp.staff_limit * 0.8) THEN true
        ELSE false
    END as near_limit,
    CASE 
        WHEN sp.staff_limit = -1 THEN false
        WHEN COALESCE(staff_count.count, 0) >= sp.staff_limit THEN true
        ELSE false
    END as at_limit
FROM public.profiles p
LEFT JOIN public.subscription_plans sp ON p.subscription_plan = sp.id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM public.staff
    GROUP BY user_id
) staff_count ON p.id = staff_count.user_id
WHERE p.id = auth.uid();

-- Grant permissions on the view
GRANT SELECT ON public.v_user_staff_limits TO authenticated;

-- 7. Test the functions (these are example queries for testing)
/*
-- Test staff limit checking
SELECT public.can_add_staff(auth.uid());

-- Test staff limit info
SELECT public.get_staff_limit_info(auth.uid());

-- Check current limits via view
SELECT * FROM public.v_user_staff_limits;
*/ 