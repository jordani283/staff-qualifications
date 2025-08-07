-- Deploy Renewal Function for TeamCertify
-- Run this in your Supabase SQL Editor to fix the renewal functionality

-- Create function to renew certification
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
        expiry_date = new_expiry_date
    WHERE id = certification_id;
    
    -- Create audit log entry (if audit table exists)
    BEGIN
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
    EXCEPTION
        WHEN OTHERS THEN
            -- If audit table doesn't exist, continue without audit log
            audit_log_id := NULL;
    END;
    
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.renew_certification_for_staff(uuid, date, date, text) TO authenticated;

-- Success message
SELECT '✅ Successfully deployed renewal function' as result; 