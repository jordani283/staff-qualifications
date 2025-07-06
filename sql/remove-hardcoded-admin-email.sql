-- Remove Hardcoded Admin Email and Use Database Flag Only
-- This improves security by removing hardcoded email dependency

-- 1. Update the security definer function to only check is_admin flag
CREATE OR REPLACE FUNCTION public.is_support_admin()
RETURNS boolean AS $$
BEGIN
    RETURN (
        SELECT COALESCE(p.is_admin, false)
        FROM public.profiles p
        WHERE p.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure you have admin privileges set (this should already be done)
UPDATE public.profiles 
SET is_admin = true 
WHERE id IN (
    SELECT u.id 
    FROM auth.users u 
    WHERE u.email = 'jordaningram283@gmail.com'
);

-- 3. Update storage policies to use only the is_admin flag
DROP POLICY IF EXISTS "Admin can upload files to admin folder" ON storage.objects;
CREATE POLICY "Admin can upload files to admin folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'support-attachments' AND
    (storage.foldername(name))[1] = 'admin' AND
    (
        SELECT COALESCE(p.is_admin, false)
        FROM public.profiles p
        WHERE p.id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admin can download all files" ON storage.objects;
CREATE POLICY "Admin can download all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'support-attachments' AND
    (
        SELECT COALESCE(p.is_admin, false)
        FROM public.profiles p
        WHERE p.id = auth.uid()
    )
);

-- 4. Create a secure function to grant admin privileges (only existing admins can grant)
CREATE OR REPLACE FUNCTION public.grant_admin_privileges(target_user_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Only existing admins can grant admin privileges
    IF NOT (SELECT COALESCE(p.is_admin, false) FROM public.profiles p WHERE p.id = auth.uid()) THEN
        RAISE EXCEPTION 'Only administrators can grant admin privileges';
    END IF;
    
    -- Grant admin privileges
    UPDATE public.profiles 
    SET is_admin = true 
    WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        'GRANT_ADMIN',
        'profiles',
        target_user_id,
        '{"is_admin": false}'::jsonb,
        '{"is_admin": true}'::jsonb
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a function to revoke admin privileges
CREATE OR REPLACE FUNCTION public.revoke_admin_privileges(target_user_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Only existing admins can revoke admin privileges
    IF NOT (SELECT COALESCE(p.is_admin, false) FROM public.profiles p WHERE p.id = auth.uid()) THEN
        RAISE EXCEPTION 'Only administrators can revoke admin privileges';
    END IF;
    
    -- Prevent revoking your own admin privileges
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot revoke your own admin privileges';
    END IF;
    
    -- Revoke admin privileges
    UPDATE public.profiles 
    SET is_admin = false 
    WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        'REVOKE_ADMIN',
        'profiles',
        target_user_id,
        '{"is_admin": true}'::jsonb,
        '{"is_admin": false}'::jsonb
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.grant_admin_privileges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_privileges(uuid) TO authenticated;

-- 7. Verify admin status
SELECT 
    u.email,
    p.first_name,
    p.last_name,
    p.is_admin,
    'Admin privileges ' || CASE WHEN p.is_admin THEN 'GRANTED' ELSE 'NOT GRANTED' END as status
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'jordaningram283@gmail.com';

-- Success message
SELECT '✅ Admin privileges updated! Hardcoded email removed from all policies.' as result; 