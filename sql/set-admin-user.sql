-- Set Admin User
-- Run this to set your user as admin

UPDATE public.profiles 
SET is_admin = true 
WHERE id IN (
    SELECT u.id 
    FROM auth.users u 
    WHERE u.email = 'jordaningram283@gmail.com'
);

-- Verify the update
SELECT 
    u.email,
    p.first_name,
    p.last_name,
    p.is_admin
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'jordaningram283@gmail.com';

-- Success message
SELECT '✅ Admin user set successfully!' as result; 