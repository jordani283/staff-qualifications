-- Staff Audit Logs Table Setup
-- Run this in your Supabase SQL Editor to ensure staff audit logging works

-- Create staff_audit_logs table if it doesn't exist
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

-- Add comments for documentation
COMMENT ON TABLE public.staff_audit_logs IS 'Audit trail for staff-related actions (creation, updates, deletion)';
COMMENT ON COLUMN public.staff_audit_logs.user_id IS 'The user who performed the action';
COMMENT ON COLUMN public.staff_audit_logs.staff_id IS 'The staff member affected by the action';
COMMENT ON COLUMN public.staff_audit_logs.event_type IS 'Type of event: STAFF_CREATED, STAFF_UPDATED, STAFF_DELETED';
COMMENT ON COLUMN public.staff_audit_logs.event_description IS 'Human-readable description of the event';
COMMENT ON COLUMN public.staff_audit_logs.old_data IS 'JSONB of the staff record before the change';
COMMENT ON COLUMN public.staff_audit_logs.new_data IS 'JSONB of the staff record after the change';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_user_id ON public.staff_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_staff_id ON public.staff_audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_audit_logs_created_at ON public.staff_audit_logs(created_at DESC);

-- Enable RLS
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

-- Success message
SELECT '✅ Staff audit logs table setup completed successfully!' as result;