-- Database migration to add name fields to profiles table and fix audit trail
-- Run this in your Supabase SQL editor

-- Step 1: Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Step 2: Create the certification_audit_logs table (if it doesn't exist)
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

-- Step 3: Create indexes for better query performance (if they don't exist)
CREATE INDEX IF NOT EXISTS certification_audit_logs_certification_id_idx
  ON public.certification_audit_logs (certification_id);

CREATE INDEX IF NOT EXISTS certification_audit_logs_user_id_idx
  ON public.certification_audit_logs (user_id);

CREATE INDEX IF NOT EXISTS certification_audit_logs_created_at_idx
  ON public.certification_audit_logs (created_at DESC);

-- Step 4: Enable Row Level Security
ALTER TABLE public.certification_audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies (drop existing ones first to avoid conflicts)
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

-- Step 6: Create/update the view with proper name concatenation
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

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.v_certification_audit_logs TO authenticated;
GRANT INSERT ON public.certification_audit_logs TO authenticated;
GRANT SELECT ON public.certification_audit_logs TO authenticated;

-- Step 8: If you have existing users, they'll need to update their profiles
-- This is optional - they can update through the UI or you can set defaults
-- UPDATE public.profiles SET first_name = 'Update', last_name = 'Required' WHERE first_name IS NULL; 