-- DEFINITIVE RLS FIX FOR TEAMCERTIFY
-- This SQL MUST be run in your Supabase SQL Editor to fix data isolation
-- Run this entire script as a single transaction

BEGIN;

-- ========================================
-- STEP 1: DROP ALL EXISTING POLICIES (Clean Slate)
-- ========================================

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON public.certification_audit_logs;
DROP POLICY IF EXISTS "Users can only read audit logs for their own certifications" ON public.certification_audit_logs;
DROP POLICY IF EXISTS "Users can only access their own staff record" ON public.staff;
DROP POLICY IF EXISTS "Users can only access their own certifications" ON public.staff_certifications;
DROP POLICY IF EXISTS "Authenticated users can view certification templates" ON public.certification_templates;
DROP POLICY IF EXISTS "Users can only access their own certification templates" ON public.certification_templates;
DROP POLICY IF EXISTS "Users can only access their own profile" ON public.profiles;

-- Drop service role policies
DROP POLICY IF EXISTS "Service role full access to staff" ON public.staff;
DROP POLICY IF EXISTS "Service role full access to staff_certifications" ON public.staff_certifications;
DROP POLICY IF EXISTS "Service role full access to certification_templates" ON public.certification_templates;
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access to audit logs" ON public.certification_audit_logs;

-- ========================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ========================================

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: CREATE COMPREHENSIVE RLS POLICIES
-- ========================================

-- PROFILES TABLE POLICIES
CREATE POLICY "profiles_user_isolation_policy"
ON public.profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- STAFF TABLE POLICIES  
CREATE POLICY "staff_user_isolation_policy"
ON public.staff
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- CERTIFICATION TEMPLATES POLICIES
CREATE POLICY "templates_user_isolation_policy"
ON public.certification_templates
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- STAFF CERTIFICATIONS POLICIES
CREATE POLICY "staff_certifications_user_isolation_policy"
ON public.staff_certifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_certifications.staff_id 
    AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_certifications.staff_id 
    AND s.user_id = auth.uid()
  )
);

-- AUDIT LOGS POLICIES
CREATE POLICY "audit_logs_user_isolation_policy"
ON public.certification_audit_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_certifications sc
    JOIN public.staff s ON sc.staff_id = s.id
    WHERE sc.id = certification_audit_logs.certification_id
    AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff_certifications sc
    JOIN public.staff s ON sc.staff_id = s.id
    WHERE sc.id = certification_audit_logs.certification_id
    AND s.user_id = auth.uid()
  )
);

-- ========================================
-- STEP 4: SERVICE ROLE BYPASS POLICIES
-- ========================================

CREATE POLICY "service_role_bypass_staff"
ON public.staff
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_bypass_staff_certifications"
ON public.staff_certifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_bypass_certification_templates"
ON public.certification_templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_bypass_profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_bypass_audit_logs"
ON public.certification_audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- STEP 5: RECREATE VIEW WITH SECURITY INVOKER
-- ========================================

DROP VIEW IF EXISTS public.v_certifications_with_status;

CREATE VIEW public.v_certifications_with_status
WITH (security_invoker = true)
AS
SELECT 
  sc.id,
  sc.staff_id,
  sc.template_id,
  sc.issue_date,
  sc.expiry_date,
  sc.document_url,
  sc.created_at,
  s.full_name as staff_name,
  s.job_title as staff_job_title,
  s.email as staff_email,
  s.user_id,
  ct.name as template_name,
  ct.validity_period_months,
  CASE 
    WHEN sc.expiry_date IS NULL THEN 'Unknown'
    WHEN sc.expiry_date < CURRENT_DATE THEN 'Expired'
    WHEN sc.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Up-to-Date'
  END as status
FROM public.staff_certifications sc
JOIN public.staff s ON sc.staff_id = s.id
JOIN public.certification_templates ct ON sc.template_id = ct.id
ORDER BY sc.expiry_date ASC;

-- ========================================
-- STEP 6: RECREATE AUDIT VIEW WITH SECURITY INVOKER
-- ========================================

DROP VIEW IF EXISTS public.v_certification_audit_logs;

CREATE VIEW public.v_certification_audit_logs
WITH (security_invoker = true)
AS
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

-- ========================================
-- STEP 7: GRANT PERMISSIONS
-- ========================================

GRANT SELECT ON public.v_certifications_with_status TO authenticated;
GRANT SELECT ON public.v_certification_audit_logs TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_certifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.certification_audit_logs TO authenticated;

-- ========================================
-- STEP 8: VERIFICATION QUERIES
-- ========================================

-- These queries will be used for testing after the fix
-- DO NOT RUN THESE NOW - run them after authentication setup

/*
-- VERIFICATION STEP 1: Check auth.uid()
SELECT auth.uid() as current_user_id;

-- VERIFICATION STEP 2: Test table isolation
SELECT count(*) as staff_count FROM public.staff;
SELECT count(*) as templates_count FROM public.certification_templates;
SELECT count(*) as certifications_count FROM public.staff_certifications;

-- VERIFICATION STEP 3: Test view isolation
SELECT count(*) as view_count FROM public.v_certifications_with_status;

-- VERIFICATION STEP 4: Cross-check with user_id filter
SELECT count(*) as manual_filter_count 
FROM public.staff 
WHERE user_id = auth.uid();

-- These counts should match for the same user
*/

COMMIT;

-- ========================================
-- VERIFICATION INSTRUCTIONS
-- ========================================

-- After running this SQL, follow these steps:

-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Find a user and copy their access_token 
-- 3. In SQL Editor, run:
--    SET request.header.authorization = 'Bearer YOUR_ACCESS_TOKEN_HERE';
-- 4. Then run the verification queries above
-- 5. auth.uid() should return the user ID, not NULL
-- 6. All count queries should return only that user's data 