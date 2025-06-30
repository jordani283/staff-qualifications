-- Certification Expiry Email Notifications Setup
-- This file contains the database function to identify expiring certifications

-- 1. Create function to get expiring certifications with all needed data
CREATE OR REPLACE FUNCTION get_expiring_certifications()
RETURNS TABLE (
    staff_id uuid,
    staff_full_name text,
    staff_email text,
    certification_id uuid,
    certification_name text,
    certification_type text,
    expiry_date date,
    company_name text,
    admin_email text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        s.id as staff_id,
        s.full_name as staff_full_name,
        COALESCE(s.email, au.email) as staff_email,
        sc.id as certification_id,
        ct.name as certification_name,
        ct.name as certification_type,
        sc.expiry_date,
        COALESCE(p.company_name, 'StaffCertify') as company_name,
        (SELECT value FROM app_settings WHERE key = 'admin_email') as admin_email
    FROM staff_certifications sc
    JOIN staff s ON sc.staff_id = s.id
    LEFT JOIN profiles p ON s.user_id = p.id
    LEFT JOIN auth.users au ON s.user_id = au.id
    JOIN certification_templates ct ON sc.template_id = ct.id
    WHERE sc.expiry_date = CURRENT_DATE
    ORDER BY s.full_name, ct.name;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_expiring_certifications() TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_certifications() TO service_role;

-- 3. Create a settings table for admin configuration (if not exists)
CREATE TABLE IF NOT EXISTS app_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Insert default admin email setting
INSERT INTO app_settings (key, value, description)
VALUES (
    'admin_email',
    'admin@staffcertify.com',
    'Administrator email for certification expiry notifications'
)
ON CONFLICT (key) DO NOTHING;

-- 5. Insert default app base URL setting
INSERT INTO app_settings (key, value, description)
VALUES (
    'app_base_url',
    'https://yourstaffcertifyapp.com',
    'Base URL for the StaffCertify application'
)
ON CONFLICT (key) DO NOTHING;

-- 6. Create RLS policy for app_settings (admin only)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access app settings" ON app_settings
    FOR ALL TO service_role USING (true);

-- 7. Test query (you can run this to see what certifications would be flagged today)
-- SELECT * FROM get_expiring_certifications();

-- 8. Alternative query to test with future dates (for testing purposes)
-- UPDATE this to test with certifications expiring in the next few days
/*
CREATE OR REPLACE FUNCTION get_expiring_certifications_test(days_ahead integer DEFAULT 0)
RETURNS TABLE (
    staff_id uuid,
    staff_full_name text,
    staff_email text,
    certification_id uuid,
    certification_name text,
    certification_type text,
    expiry_date date,
    company_name text,
    admin_email text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        s.id as staff_id,
        s.full_name as staff_full_name,
        COALESCE(s.email, au.email) as staff_email,
        sc.id as certification_id,
        ct.name as certification_name,
        ct.name as certification_type,
        sc.expiry_date,
        COALESCE(p.company_name, 'StaffCertify') as company_name,
        (SELECT value FROM app_settings WHERE key = 'admin_email') as admin_email
    FROM staff_certifications sc
    JOIN staff s ON sc.staff_id = s.id
    LEFT JOIN profiles p ON s.user_id = p.id
    LEFT JOIN auth.users au ON s.user_id = au.id
    JOIN certification_templates ct ON sc.template_id = ct.id
    WHERE sc.expiry_date = CURRENT_DATE + INTERVAL '%s days' 
    ORDER BY s.full_name, ct.name;
$$;
*/ 