-- Add Renewal Tracking to Staff Certifications
-- Migration to add renewal tracking columns and ensure audit logs support detailed change tracking
-- Run this in your Supabase SQL Editor

-- Step 1: Add renewal tracking columns to staff_certifications table
ALTER TABLE public.staff_certifications 
ADD COLUMN IF NOT EXISTS renewed_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS renewed_at timestamp with time zone;

-- Step 2: Add change_details column to certification_audit_logs if it doesn't exist
ALTER TABLE public.certification_audit_logs 
ADD COLUMN IF NOT EXISTS change_details jsonb;

-- Step 3: Add indexes for better query performance on renewal tracking
CREATE INDEX IF NOT EXISTS idx_staff_certifications_renewed_by_user_id 
ON public.staff_certifications (renewed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_staff_certifications_renewed_at 
ON public.staff_certifications (renewed_at);

-- Step 4: Add comments to document the new columns
COMMENT ON COLUMN public.staff_certifications.renewed_by_user_id IS 'ID of the user who performed the renewal';
COMMENT ON COLUMN public.staff_certifications.renewed_at IS 'Timestamp when the certification was renewed';
COMMENT ON COLUMN public.certification_audit_logs.change_details IS 'JSON object containing detailed information about the change, especially for complex operations like renewals';

-- Step 5: Update the v_certifications_with_status view to include renewal information
-- Drop the existing view first to avoid column structure conflicts
DROP VIEW IF EXISTS public.v_certifications_with_status;

-- Recreate the view with renewal information
CREATE VIEW public.v_certifications_with_status AS
SELECT 
  sc.id,
  sc.staff_id,
  sc.template_id,
  sc.issue_date,
  sc.expiry_date,
  sc.document_url,
  sc.notes,
  sc.created_at,
  sc.renewed_by_user_id,
  sc.renewed_at,
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
ORDER BY sc.expiry_date ASC;

-- Step 6: Grant necessary permissions
GRANT SELECT ON public.v_certifications_with_status TO authenticated;

-- Step 7: Create function to renew certification
CREATE OR REPLACE FUNCTION public.renew_certification_for_staff(
    certification_id uuid,
    new_issue_date date,
    new_expiry_date date,
    renewal_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cert_record public.staff_certifications%ROWTYPE;
    staff_record public.staff%ROWTYPE;
    current_user_id uuid;
    audit_log_id uuid;
    result json;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Get certification record with RLS applied
    SELECT * INTO cert_record
    FROM public.staff_certifications
    WHERE id = certification_id;
    
    -- Check if certification exists and user has access
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Certification not found or access denied'
        );
    END IF;
    
    -- Get staff record to verify ownership
    SELECT * INTO staff_record
    FROM public.staff
    WHERE id = cert_record.staff_id AND user_id = current_user_id;
    
    -- Check if staff record exists and belongs to current user
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Staff member not found or access denied'
        );
    END IF;
    
    -- Validation: new expiry date must be after current expiry date
    IF new_expiry_date <= cert_record.expiry_date THEN
        RETURN json_build_object(
            'success', false,
            'error', 'New expiry date (' || new_expiry_date || ') must be after current expiry date (' || cert_record.expiry_date || ')'
        );
    END IF;
    
    -- Validation: new issue date cannot be in the future (allow today)
    IF new_issue_date > CURRENT_DATE THEN
        RETURN json_build_object(
            'success', false,
            'error', 'New issue date cannot be in the future'
        );
    END IF;
    
    -- Update the certification
    UPDATE public.staff_certifications
    SET 
        issue_date = new_issue_date,
        expiry_date = new_expiry_date,
        renewed_by_user_id = current_user_id,
        renewed_at = NOW()
    WHERE id = certification_id;
    
    -- Create audit log entry
    INSERT INTO public.certification_audit_logs (
        user_id,
        certification_id,
        action_type,
        change_details,
        note,
        created_at
    ) VALUES (
        current_user_id,
        certification_id,
        'RENEW',
        json_build_object(
            'old_issue_date', cert_record.issue_date,
            'old_expiry_date', cert_record.expiry_date,
            'new_issue_date', new_issue_date,
            'new_expiry_date', new_expiry_date,
            'reason', renewal_reason
        ),
        COALESCE(renewal_reason, 'Certification renewed'),
        NOW()
    ) RETURNING id INTO audit_log_id;
    
    -- Return success response with updated certification data
    SELECT json_build_object(
        'success', true,
        'message', 'Certification renewed successfully',
        'data', json_build_object(
            'id', sc.id,
            'staff_id', sc.staff_id,
            'template_id', sc.template_id,
            'issue_date', sc.issue_date,
            'expiry_date', sc.expiry_date,
            'renewed_at', sc.renewed_at,
            'renewed_by_user_id', sc.renewed_by_user_id,
            'audit_log_id', audit_log_id
        )
    )
    INTO result
    FROM public.staff_certifications sc
    WHERE sc.id = certification_id;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return error response
        RAISE LOG 'Error in renew_certification_for_staff: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$;

-- Step 8: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.renew_certification_for_staff(uuid, date, date, text) TO authenticated;

-- Step 9: Success message
SELECT '✅ Successfully added renewal tracking to staff_certifications table and created renewal function' as result; 