-- Complete Database Setup for Audit Trail Feature
-- Run this entire script in your Supabase SQL editor

-- Step 1: Create the certification_audit_logs table
CREATE TABLE IF NOT EXISTS public.certification_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  certification_id uuid NOT NULL,
  action_type text NOT NULL,
  field text NULL,
  old_value text NULL,
  new_value text NULL,
  note text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT certification_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT certification_audit_logs_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT certification_audit_logs_certification_id_fkey FOREIGN KEY (certification_id)
    REFERENCES staff_certifications (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS certification_audit_logs_certification_id_idx
  ON public.certification_audit_logs (certification_id);

CREATE INDEX IF NOT EXISTS certification_audit_logs_user_id_idx
  ON public.certification_audit_logs (user_id);

CREATE INDEX IF NOT EXISTS certification_audit_logs_created_at_idx
  ON public.certification_audit_logs (created_at DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE public.certification_audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON public.certification_audit_logs;
CREATE POLICY "Allow authenticated users to insert audit logs"
  ON public.certification_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON public.certification_audit_logs;
CREATE POLICY "Allow authenticated users to read audit logs"
  ON public.certification_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 5: Create the view that joins audit logs with user information
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
  COALESCE(p.full_name, au.email, 'Unknown User') as performed_by
FROM public.certification_audit_logs cal
LEFT JOIN auth.users au ON cal.user_id = au.id
LEFT JOIN public.profiles p ON cal.user_id = p.id
ORDER BY cal.created_at DESC;

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.v_certification_audit_logs TO authenticated;
GRANT INSERT ON public.certification_audit_logs TO authenticated;
GRANT SELECT ON public.certification_audit_logs TO authenticated;

-- Step 7: If you have existing audit data in another table, you can migrate it
-- (Check what table name you used for your existing data and uncomment/modify if needed)
-- INSERT INTO public.certification_audit_logs 
-- SELECT * FROM your_existing_audit_table_name; 