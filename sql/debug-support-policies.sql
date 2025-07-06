-- Debug Support Chat RLS Policies
-- Run this to diagnose and fix RLS issues

-- 1. Check current user and auth context
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    current_user as postgres_user;

-- 2. Check if user exists in profiles table
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.is_admin,
    u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.id = auth.uid();

-- 3. Check support_chats table policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'support_chats';

-- 4. Check user_support_summary table policies  
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_support_summary';

-- 5. Test basic support_chats access
SELECT 'Testing support_chats SELECT access' as test;
SELECT COUNT(*) as my_messages FROM public.support_chats WHERE user_id = auth.uid();

-- 6. Test basic user_support_summary access
SELECT 'Testing user_support_summary access' as test;
SELECT * FROM public.user_support_summary WHERE user_id = auth.uid();

-- 7. Try to insert a test record in user_support_summary (if it doesn't exist)
INSERT INTO public.user_support_summary (user_id, unread_admin_messages, total_messages)
VALUES (auth.uid(), 0, 0)
ON CONFLICT (user_id) DO NOTHING;

-- 8. Test again after potential insert
SELECT 'Testing after potential insert' as test;
SELECT unread_admin_messages FROM public.user_support_summary WHERE user_id = auth.uid();

-- Success message
SELECT '✅ Debug queries completed!' as result; 