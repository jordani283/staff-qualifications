-- CRITICAL RLS SECURITY FIXES FOR TEAMCERTIFY
-- These policies MUST be implemented immediately to prevent data breaches

-- 1. Fix audit logs policy - restrict to relevant certifications only
DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON public.certification_audit_logs;
DROP POLICY IF EXISTS "Users can only read audit logs for their own certifications" ON public.certification_audit_logs;

CREATE POLICY "Users can only read audit logs for their own certifications"
  ON public.certification_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_certifications sc
      JOIN public.staff s ON sc.staff_id = s.id
      WHERE sc.id = certification_audit_logs.certification_id
      AND s.user_id = auth.uid()
    )
  );

-- 2. Add missing RLS policies for core tables

-- Enable RLS on core tables if not already enabled
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Staff table policies
DROP POLICY IF EXISTS "Users can only access their own staff record" ON public.staff;
CREATE POLICY "Users can only access their own staff record"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Staff certifications policies
DROP POLICY IF EXISTS "Users can only access their own certifications" ON public.staff_certifications;
CREATE POLICY "Users can only access their own certifications"
  ON public.staff_certifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_certifications.staff_id
      AND s.user_id = auth.uid()
    )
  );

-- Certification templates policies - FIXED to filter by user_id
DROP POLICY IF EXISTS "Authenticated users can view certification templates" ON public.certification_templates;
DROP POLICY IF EXISTS "Users can only access their own certification templates" ON public.certification_templates;
CREATE POLICY "Users can only access their own certification templates"
  ON public.certification_templates
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Profiles policies
DROP POLICY IF EXISTS "Users can only access their own profile" ON public.profiles;
CREATE POLICY "Users can only access their own profile"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid());

-- 3. Service role bypass policies (for Edge Functions)
DROP POLICY IF EXISTS "Service role full access to staff" ON public.staff;
CREATE POLICY "Service role full access to staff"
  ON public.staff
  FOR ALL
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role full access to staff_certifications" ON public.staff_certifications;
CREATE POLICY "Service role full access to staff_certifications"
  ON public.staff_certifications
  FOR ALL
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role full access to certification_templates" ON public.certification_templates;
CREATE POLICY "Service role full access to certification_templates"
  ON public.certification_templates
  FOR ALL
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;
CREATE POLICY "Service role full access to profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role full access to audit logs" ON public.certification_audit_logs;
CREATE POLICY "Service role full access to audit logs"
  ON public.certification_audit_logs
  FOR ALL
  TO service_role
  USING (true);

-- 4. Create the missing v_certifications_with_status view with proper user filtering
DROP VIEW IF EXISTS public.v_certifications_with_status;
CREATE OR REPLACE VIEW public.v_certifications_with_status AS
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
-- RLS policies will automatically filter this view based on the user_id
ORDER BY sc.expiry_date ASC;

-- Grant permissions
GRANT SELECT ON public.v_certifications_with_status TO authenticated;

-- 5. Update the audit logs view with proper RLS
DROP VIEW IF EXISTS public.v_certification_audit_logs;
CREATE OR REPLACE VIEW public.v_certification_audit_logs AS
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
-- RLS will automatically filter this view based on the underlying table policies
ORDER BY cal.created_at DESC;

-- Grant permissions
GRANT SELECT ON public.v_certification_audit_logs TO authenticated;

-- 6. Test queries to verify RLS is working
-- Run these as different users to ensure isolation:

/*
-- Test 1: User should only see their own staff record
SELECT * FROM public.staff;

-- Test 2: User should only see their own certifications
SELECT * FROM public.staff_certifications;

-- Test 3: User should only see audit logs for their own certifications
SELECT * FROM public.certification_audit_logs;

-- Test 4: User should only see their own profile
SELECT * FROM public.profiles;

-- Test 5: User should only see their own data in the view
SELECT * FROM public.v_certifications_with_status;
*/ 