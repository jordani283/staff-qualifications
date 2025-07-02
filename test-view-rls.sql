-- TEST AND FIX: v_certifications_with_status view RLS issue
-- Run this in your Supabase SQL Editor to debug and fix the view

-- STEP 1: Test current view behavior (run as different users)
-- This should return different results for different users
SELECT 
    count(*) as total_records,
    auth.uid() as current_user_id
FROM v_certifications_with_status;

-- STEP 2: Test underlying tables RLS (should work correctly)
SELECT 
    count(*) as staff_count,
    auth.uid() as current_user_id
FROM staff;

SELECT 
    count(*) as cert_templates_count,
    auth.uid() as current_user_id  
FROM certification_templates;

SELECT 
    count(*) as staff_certs_count,
    auth.uid() as current_user_id
FROM staff_certifications;

-- STEP 3: Recreate the view with proper security invoker
-- This ensures the view executes with the current user's permissions
DROP VIEW IF EXISTS public.v_certifications_with_status;

CREATE OR REPLACE VIEW public.v_certifications_with_status 
WITH (security_invoker = true) AS
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
-- The RLS policies on the underlying tables will automatically filter this
ORDER BY sc.expiry_date ASC;

-- Grant permissions
GRANT SELECT ON public.v_certifications_with_status TO authenticated;

-- STEP 4: Test the fixed view
SELECT 
    count(*) as total_records_after_fix,
    auth.uid() as current_user_id
FROM v_certifications_with_status;

-- STEP 5: Test with actual data
SELECT 
    staff_name,
    template_name,
    status,
    user_id,
    auth.uid() as current_user_id
FROM v_certifications_with_status
LIMIT 5; 