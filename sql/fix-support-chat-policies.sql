-- Fix Support Chat RLS Policies
-- Run this to correct the email reference issue

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admin can access all support messages" ON public.support_chats;
DROP POLICY IF EXISTS "Admin can view all support summaries" ON public.user_support_summary;

-- Recreate admin policies with correct email reference
CREATE POLICY "Admin can access all support messages"
    ON public.support_chats
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = auth.uid() 
            AND (u.email = 'jordaningram283@gmail.com' OR p.is_admin = true)
        )
    );

CREATE POLICY "Admin can view all support summaries"
    ON public.user_support_summary
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = auth.uid() 
            AND (u.email = 'jordaningram283@gmail.com' OR p.is_admin = true)
        )
    );

-- Success message
SELECT '✅ Support chat RLS policies fixed successfully!' as result; 