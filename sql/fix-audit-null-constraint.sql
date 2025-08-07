-- Fix Audit Logs NULL Constraint Issue
-- This allows certification_id to be NULL in audit logs when the referenced certification is deleted

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.certification_audit_logs 
DROP CONSTRAINT IF EXISTS certification_audit_logs_certification_id_fkey;

-- Step 2: Modify the certification_id column to allow NULL values
ALTER TABLE public.certification_audit_logs 
ALTER COLUMN certification_id DROP NOT NULL;

-- Step 3: Re-add the foreign key constraint with SET NULL behavior
ALTER TABLE public.certification_audit_logs
ADD CONSTRAINT certification_audit_logs_certification_id_fkey 
FOREIGN KEY (certification_id) REFERENCES public.staff_certifications(id) ON DELETE SET NULL;

-- Step 4: Update the view to handle NULL certification_id gracefully
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
  COALESCE(p.first_name || ' ' || p.last_name, p.company_name, au.email) as performed_by
FROM public.certification_audit_logs cal
LEFT JOIN auth.users au ON cal.user_id = au.id
LEFT JOIN public.profiles p ON cal.user_id = p.id
ORDER BY cal.created_at DESC;

-- Success message
SELECT '✅ Audit logs can now handle deleted certifications without errors!' as result;