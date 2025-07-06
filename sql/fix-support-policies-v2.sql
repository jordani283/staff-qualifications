-- Fix Support Chat RLS Policy Issues - V2
-- This fixes the "permission denied for table users" error

-- 1. Drop existing policies that are causing issues
DROP POLICY IF EXISTS "Admin can access all support messages" ON public.support_chats;
DROP POLICY IF EXISTS "Admin can view all support summaries" ON public.user_support_summary;
DROP POLICY IF EXISTS "Users can view their own support messages" ON public.support_chats;
DROP POLICY IF EXISTS "Users can insert their own support messages" ON public.support_chats;
DROP POLICY IF EXISTS "Users can update read status of their messages" ON public.support_chats;
DROP POLICY IF EXISTS "Users can manage their own support summary" ON public.user_support_summary;

-- 2. Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_support_admin()
RETURNS boolean AS $$
BEGIN
    RETURN (
        SELECT EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = auth.uid() 
            AND (u.email = 'jordaningram283@gmail.com' OR p.is_admin = true)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_support_admin() TO authenticated;

-- 4. Create simple policies for regular users (support_chats)
CREATE POLICY "Users can view their own support messages"
    ON public.support_chats
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own support messages"
    ON public.support_chats
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() AND sender = 'user');

CREATE POLICY "Users can update read status of their messages"
    ON public.support_chats
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 5. Create admin policy using the security definer function
CREATE POLICY "Admin can access all support messages"
    ON public.support_chats
    FOR ALL
    TO authenticated
    USING (public.is_support_admin());

-- 6. Create simple policies for regular users (user_support_summary)
CREATE POLICY "Users can manage their own support summary"
    ON public.user_support_summary
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 7. Create admin policy for support summary
CREATE POLICY "Admin can view all support summaries"
    ON public.user_support_summary
    FOR ALL
    TO authenticated
    USING (public.is_support_admin());

-- 8. Ensure the ensure_user_support_summary function exists
CREATE OR REPLACE FUNCTION public.ensure_user_support_summary()
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_support_summary (user_id, unread_admin_messages, total_messages)
    VALUES (auth.uid(), 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_support_summary() TO authenticated;

-- 10. Create initial support summary records for all existing users
INSERT INTO public.user_support_summary (user_id, unread_admin_messages, total_messages)
SELECT u.id, 0, 0
FROM auth.users u
LEFT JOIN public.user_support_summary uss ON u.id = uss.user_id
WHERE uss.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Success message
SELECT '✅ Support chat policies fixed - V2! Try sending a message now.' as result; 