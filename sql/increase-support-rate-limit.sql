-- Increase Support Message Rate Limit to 20 messages per hour
-- This updates the rate limiting function to allow more messages

-- Update the rate limit check function
CREATE OR REPLACE FUNCTION public.check_support_rate_limit(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
    rate_limit_record public.support_rate_limits%ROWTYPE;
    max_messages_per_hour integer := 20; -- Increased from 10 to 20
    current_hour timestamp with time zone := date_trunc('hour', now());
BEGIN
    -- Get or create rate limit record
    SELECT * INTO rate_limit_record
    FROM public.support_rate_limits
    WHERE user_id = target_user_id;
    
    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.support_rate_limits (user_id, messages_sent, window_start)
        VALUES (target_user_id, 0, current_hour);
        RETURN true;
    END IF;
    
    -- If we're in a new hour window, reset the counter
    IF rate_limit_record.window_start < current_hour THEN
        UPDATE public.support_rate_limits
        SET messages_sent = 0,
            window_start = current_hour
        WHERE user_id = target_user_id;
        RETURN true;
    END IF;
    
    -- Check if user has exceeded rate limit
    IF rate_limit_record.messages_sent >= max_messages_per_hour THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT '✅ Support message rate limit increased to 20 messages per hour!' as result; 