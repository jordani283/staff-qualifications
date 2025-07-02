-- Fix Audit Logs View - Replace full_name with first_name + last_name
-- Run this BEFORE running the trial setup fix

-- Drop and recreate the view with correct column references
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
ORDER BY cal.created_at DESC;

-- Grant permissions
GRANT SELECT ON public.v_certification_audit_logs TO authenticated; 