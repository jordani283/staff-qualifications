-- Fix Audit Logs Cascade Issue
-- This prevents audit logs from being deleted when certifications are deleted

-- Drop the existing constraint that cascades deletes
ALTER TABLE public.certification_audit_logs 
DROP CONSTRAINT IF EXISTS certification_audit_logs_certification_id_fkey;

-- Add the corrected constraint that sets certification_id to NULL instead of deleting the audit log
ALTER TABLE public.certification_audit_logs
ADD CONSTRAINT certification_audit_logs_certification_id_fkey 
FOREIGN KEY (certification_id) REFERENCES public.staff_certifications(id) ON DELETE SET NULL;

-- This way, when a certification is deleted:
-- 1. The audit log remains in the database (preserving the trail)
-- 2. The certification_id becomes NULL (indicating the referenced cert was deleted)
-- 3. We still have the audit trail showing what happened

SELECT '✅ Audit logs will now be preserved when certifications are deleted!' as result;