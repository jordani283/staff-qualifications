-- CRITICAL RLS SECURITY FIXES FOR TEAMCERTIFY
-- These policies MUST be implemented immediately to prevent data breaches

-- 1. Fix audit logs policy - restrict to relevant certifications only
DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON public.certification_audit_logs;

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
CREATE POLICY "Users can only access their own staff record"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Staff certifications policies
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

-- Certification templates policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view certification templates"
  ON public.certification_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Profiles policies
CREATE POLICY "Users can only access their own profile"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (id = auth.uid());

-- 3. Service role bypass policies (for Edge Functions)
CREATE POLICY "Service role full access to staff"
  ON public.staff
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to staff_certifications"
  ON public.staff_certifications
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to certification_templates"
  ON public.certification_templates
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to audit logs"
  ON public.certification_audit_logs
  FOR ALL
  TO service_role
  USING (true);

-- 4. Admin role detection and policies (for future admin functionality)
-- Note: This assumes you'll add an 'is_admin' field to profiles or similar

/*
-- Example admin policies (implement when admin roles are added):
CREATE POLICY "Admins can access all staff records"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.is_admin = true
    )
  );
*/

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
*/ 