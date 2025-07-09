-- Staff Member Deletion Database Setup
-- Run this entire script in your Supabase SQL Editor

-- ========================================
-- STEP 1: MODIFY FOREIGN KEY CONSTRAINT
-- ========================================

-- Step 1a: Find and drop the existing foreign key constraint
-- First, let's find the constraint name
SELECT conname as constraint_name
FROM pg_constraint 
WHERE conrelid = 'public.staff_certifications'::regclass 
AND confrelid = 'public.staff'::regclass;

-- Step 1b: Drop the existing foreign key constraint (using common naming convention)
ALTER TABLE public.staff_certifications
DROP CONSTRAINT IF EXISTS staff_certifications_staff_id_fkey;

-- Also try other possible naming conventions
ALTER TABLE public.staff_certifications
DROP CONSTRAINT IF EXISTS staff_certifications_staff_id_foreign;

ALTER TABLE public.staff_certifications
DROP CONSTRAINT IF EXISTS fk_staff_certifications_staff_id;

-- Step 1c: Add the new foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.staff_certifications
ADD CONSTRAINT staff_certifications_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

-- ========================================
-- STEP 2: CREATE STAFF AUDIT LOGS TABLE
-- ========================================

-- Create public.staff_audit_logs table
CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_description TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for better documentation
COMMENT ON TABLE public.staff_audit_logs IS 'Audit trail for staff-related actions (creation, updates, deletion)';
COMMENT ON COLUMN public.staff_audit_logs.user_id IS 'The user who performed the action';
COMMENT ON COLUMN public.staff_audit_logs.staff_id IS 'The staff member affected by the action';
COMMENT ON COLUMN public.staff_audit_logs.event_type IS 'Type of event (STAFF_CREATED, STAFF_UPDATED, STAFF_DELETED)';
COMMENT ON COLUMN public.staff_audit_logs.event_description IS 'Description of the event';
COMMENT ON COLUMN public.staff_audit_logs.old_data IS 'JSONB of the staff record before the change';
COMMENT ON COLUMN public.staff_audit_logs.new_data IS 'JSONB of the staff record after the change';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_user_id ON public.staff_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_staff_id ON public.staff_audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_created_at ON public.staff_audit_logs(created_at DESC);

-- Enable RLS on staff_audit_logs
ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own audit logs
DROP POLICY IF EXISTS "Users can view their own staff audit logs" ON public.staff_audit_logs;
CREATE POLICY "Users can view their own staff audit logs"
ON public.staff_audit_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Users can insert their own audit logs
DROP POLICY IF EXISTS "Users can insert their own staff audit logs" ON public.staff_audit_logs;
CREATE POLICY "Users can insert their own staff audit logs"
ON public.staff_audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Service role bypass for audit logs
DROP POLICY IF EXISTS "Service role full access to staff audit logs" ON public.staff_audit_logs;
CREATE POLICY "Service role full access to staff audit logs"
ON public.staff_audit_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ========================================
-- STEP 3: CREATE DELETE STAFF FUNCTION
-- ========================================

-- Create the delete_staff_member function
CREATE OR REPLACE FUNCTION public.delete_staff_member(p_staff_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    staff_record public.staff%ROWTYPE;
    current_user_id UUID := auth.uid();
    delete_result INTEGER;
    staff_name TEXT;
    cert_count INTEGER;
    doc_count INTEGER;
BEGIN
    -- Validate input
    IF p_staff_id IS NULL THEN
        RETURN json_build_object(
            'status', 'error', 
            'message', 'Staff ID cannot be null'
        );
    END IF;
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'status', 'error', 
            'message', 'User not authenticated'
        );
    END IF;

    -- Check if the staff member exists and belongs to the current user
    SELECT * INTO staff_record FROM public.staff
    WHERE id = p_staff_id AND user_id = current_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'status', 'error', 
            'message', 'Staff member not found or access denied'
        );
    END IF;

    staff_name := staff_record.full_name;

    -- Get the count of certifications for the staff member BEFORE deletion
    SELECT COUNT(*) INTO cert_count FROM public.staff_certifications
    WHERE staff_id = p_staff_id;

    -- Count documents that will be affected
    SELECT COUNT(*) INTO doc_count FROM public.staff_certifications
    WHERE staff_id = p_staff_id AND document_url IS NOT NULL;

    -- Audit Logging: Record the staff deletion BEFORE the actual deletion
    INSERT INTO public.staff_audit_logs (
        user_id, 
        staff_id, 
        event_type, 
        event_description, 
        old_data
    )
    VALUES (
        current_user_id,
        p_staff_id,
        'STAFF_DELETED',
        'Staff member deleted: ' || staff_name || ' (with ' || cert_count || ' certifications)',
        to_jsonb(staff_record)
    );

    -- Delete the staff member
    -- Due to ON DELETE CASCADE, all associated certifications and their audit logs will be automatically deleted
    DELETE FROM public.staff 
    WHERE id = p_staff_id AND user_id = current_user_id;
    
    GET DIAGNOSTICS delete_result = ROW_COUNT;

    IF delete_result > 0 THEN
        RETURN json_build_object(
            'status', 'success',
            'message', 'Staff member and associated data deleted successfully',
            'deleted_staff_name', staff_name,
            'deleted_certifications', cert_count,
            'deleted_documents', doc_count
        );
    ELSE
        RETURN json_build_object(
            'status', 'error', 
            'message', 'Failed to delete staff member'
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'status', 'error', 
            'message', 'Database error: ' || SQLERRM
        );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_staff_member(uuid) TO authenticated;

-- ========================================
-- STEP 4: CREATE HELPER VIEW FOR STAFF WITH CERT COUNTS
-- ========================================

-- Create a view to get staff with certification counts (needed for frontend)
DROP VIEW IF EXISTS public.v_staff_with_cert_count;
CREATE VIEW public.v_staff_with_cert_count AS
SELECT 
    s.id,
    s.user_id,
    s.full_name,
    s.job_title,
    s.email,
    s.created_at,
    COALESCE(cert_summary.total_cert_count, 0) as total_cert_count,
    COALESCE(cert_summary.green_cert_count, 0) as green_cert_count,
    COALESCE(cert_summary.amber_cert_count, 0) as amber_cert_count,
    COALESCE(cert_summary.red_cert_count, 0) as red_cert_count
FROM public.staff s
LEFT JOIN (
    SELECT 
        staff_id,
        COUNT(*) as total_cert_count,
        COUNT(CASE WHEN 
            expiry_date IS NOT NULL AND 
            expiry_date >= CURRENT_DATE + INTERVAL '30 days' 
            THEN 1 END) as green_cert_count,
        COUNT(CASE WHEN 
            expiry_date IS NOT NULL AND 
            expiry_date < CURRENT_DATE + INTERVAL '30 days' AND 
            expiry_date >= CURRENT_DATE 
            THEN 1 END) as amber_cert_count,
        COUNT(CASE WHEN 
            expiry_date IS NOT NULL AND 
            expiry_date < CURRENT_DATE 
            THEN 1 END) as red_cert_count
    FROM public.staff_certifications
    GROUP BY staff_id
) cert_summary ON s.id = cert_summary.staff_id;

-- Grant permissions on the view
GRANT SELECT ON public.v_staff_with_cert_count TO authenticated;

-- ========================================
-- STEP 5: SUCCESS MESSAGE
-- ========================================

SELECT 'Staff deletion database setup completed successfully!' as result; 