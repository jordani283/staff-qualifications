-- Fix Support Chat RLS Policy Issues
-- This addresses the 403 errors when accessing support features

-- 1. Create a function to ensure user_support_summary record exists
CREATE OR REPLACE FUNCTION public.ensure_user_support_summary()
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_support_summary (user_id, unread_admin_messages, total_messages)
    VALUES (auth.uid(), 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.ensure_user_support_summary() TO authenticated;

-- 3. Update the user_support_summary policy to be more permissive for INSERT
DROP POLICY IF EXISTS "Users can view their own support summary" ON public.user_support_summary;
CREATE POLICY "Users can manage their own support summary"
    ON public.user_support_summary
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. Add a more explicit INSERT policy for support_chats
DROP POLICY IF EXISTS "Users can insert their own support messages" ON public.support_chats;
CREATE POLICY "Users can insert their own support messages"
    ON public.support_chats
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() AND sender = 'user');

-- 5. Add a more explicit SELECT policy for support_chats
DROP POLICY IF EXISTS "Users can view their own support messages" ON public.support_chats;
CREATE POLICY "Users can view their own support messages"
    ON public.support_chats
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 6. Create initial support summary records for all existing users
INSERT INTO public.user_support_summary (user_id, unread_admin_messages, total_messages)
SELECT u.id, 0, 0
FROM auth.users u
LEFT JOIN public.user_support_summary uss ON u.id = uss.user_id
WHERE uss.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 7. Create a trigger to automatically create support summary for new users
CREATE OR REPLACE FUNCTION public.create_user_support_summary_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_support_summary (user_id, unread_admin_messages, total_messages)
    VALUES (NEW.id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS create_user_support_summary_trigger ON public.profiles;
CREATE TRIGGER create_user_support_summary_trigger
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_user_support_summary_on_signup();

-- Success message
SELECT '✅ Support chat policies fixed! Try sending a message now.' as result; 