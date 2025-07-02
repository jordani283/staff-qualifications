-- FIX FOR AUDIT LOGS VIEW PERMISSION ERROR
-- This fixes the "permission denied for table users" error

-- Drop and recreate the audit logs view without auth.users join
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
    'Unknown User'
  ) as performed_by
FROM public.certification_audit_logs cal
LEFT JOIN public.profiles p ON cal.user_id = p.id
ORDER BY cal.created_at DESC;

-- Grant permissions
GRANT SELECT ON public.v_certification_audit_logs TO authenticated; 