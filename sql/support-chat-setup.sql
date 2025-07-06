-- Support Chat System Setup
-- This script sets up the complete support chat system with proper RLS policies and functions

-- 1. Add is_admin column to profiles if it doesn't exist (MOVE THIS FIRST!)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Create support_chats table
CREATE TABLE IF NOT EXISTS public.support_chats (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    message text NOT NULL,
    attachment_url text,
    attachment_name text,
    attachment_size integer,
    sender text NOT NULL CHECK (sender IN ('user', 'admin')),
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT support_chats_pkey PRIMARY KEY (id),
    CONSTRAINT support_chats_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users (id) ON DELETE CASCADE
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS support_chats_user_id_idx ON public.support_chats (user_id);
CREATE INDEX IF NOT EXISTS support_chats_created_at_idx ON public.support_chats (created_at DESC);
CREATE INDEX IF NOT EXISTS support_chats_sender_idx ON public.support_chats (sender);
CREATE INDEX IF NOT EXISTS support_chats_is_read_idx ON public.support_chats (is_read);

-- 4. Create user_support_summary table for unread message tracking
CREATE TABLE IF NOT EXISTS public.user_support_summary (
    user_id uuid NOT NULL,
    last_user_message_at timestamp with time zone,
    last_admin_message_at timestamp with time zone,
    unread_admin_messages integer NOT NULL DEFAULT 0,
    total_messages integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT user_support_summary_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_support_summary_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users (id) ON DELETE CASCADE
);

-- 5. Create rate limiting table for spam protection
CREATE TABLE IF NOT EXISTS public.support_rate_limits (
    user_id uuid NOT NULL,
    messages_sent integer NOT NULL DEFAULT 0,
    window_start timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT support_rate_limits_pkey PRIMARY KEY (user_id),
    CONSTRAINT support_rate_limits_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users (id) ON DELETE CASCADE
);

-- 6. Enable Row Level Security
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_support_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_rate_limits ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for support_chats
-- Users can only see their own messages
CREATE POLICY "Users can view their own support messages"
    ON public.support_chats
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only insert their own messages
CREATE POLICY "Users can insert their own support messages"
    ON public.support_chats
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() AND sender = 'user');

-- Users can mark their own messages as read
CREATE POLICY "Users can update read status of their messages"
    ON public.support_chats
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admin bypass (hardcoded email + optional is_admin flag)
CREATE POLICY "Admin can access all support messages"
    ON public.support_chats
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = auth.uid() 
            AND (u.email = 'jordaningram283@gmail.com' OR p.is_admin = true)
        )
    );

-- 8. Create RLS policies for user_support_summary
CREATE POLICY "Users can view their own support summary"
    ON public.user_support_summary
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admin can view all support summaries"
    ON public.user_support_summary
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = auth.uid() 
            AND (u.email = 'jordaningram283@gmail.com' OR p.is_admin = true)
        )
    );

-- 9. Create RLS policies for support_rate_limits
CREATE POLICY "Users can access their own rate limits"
    ON public.support_rate_limits
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- 10. Create function to update support summary
CREATE OR REPLACE FUNCTION public.update_support_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update user support summary
    INSERT INTO public.user_support_summary (
        user_id,
        last_user_message_at,
        last_admin_message_at,
        unread_admin_messages,
        total_messages
    ) VALUES (
        NEW.user_id,
        CASE WHEN NEW.sender = 'user' THEN NEW.created_at ELSE NULL END,
        CASE WHEN NEW.sender = 'admin' THEN NEW.created_at ELSE NULL END,
        CASE WHEN NEW.sender = 'admin' THEN 1 ELSE 0 END,
        1
    )
    ON CONFLICT (user_id) DO UPDATE SET
        last_user_message_at = CASE 
            WHEN NEW.sender = 'user' THEN NEW.created_at 
            ELSE user_support_summary.last_user_message_at 
        END,
        last_admin_message_at = CASE 
            WHEN NEW.sender = 'admin' THEN NEW.created_at 
            ELSE user_support_summary.last_admin_message_at 
        END,
        unread_admin_messages = CASE 
            WHEN NEW.sender = 'admin' THEN user_support_summary.unread_admin_messages + 1
            ELSE user_support_summary.unread_admin_messages
        END,
        total_messages = user_support_summary.total_messages + 1,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger to update support summary
DROP TRIGGER IF EXISTS update_support_summary_trigger ON public.support_chats;
CREATE TRIGGER update_support_summary_trigger
    AFTER INSERT ON public.support_chats
    FOR EACH ROW
    EXECUTE FUNCTION public.update_support_summary();

-- 12. Create function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_admin_messages_as_read(target_user_id uuid)
RETURNS void AS $$
BEGIN
    -- Mark all admin messages as read for the user
    UPDATE public.support_chats 
    SET is_read = true 
    WHERE user_id = target_user_id 
    AND sender = 'admin' 
    AND is_read = false;
    
    -- Reset unread count in summary
    UPDATE public.user_support_summary 
    SET unread_admin_messages = 0,
        updated_at = now()
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to check rate limit
CREATE OR REPLACE FUNCTION public.check_support_rate_limit(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
    rate_limit_record public.support_rate_limits%ROWTYPE;
    max_messages_per_hour integer := 10;
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

-- 14. Create function to increment rate limit counter
CREATE OR REPLACE FUNCTION public.increment_support_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment for user messages
    IF NEW.sender = 'user' THEN
        UPDATE public.support_rate_limits
        SET messages_sent = messages_sent + 1
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create trigger for rate limiting
DROP TRIGGER IF EXISTS increment_support_rate_limit_trigger ON public.support_chats;
CREATE TRIGGER increment_support_rate_limit_trigger
    AFTER INSERT ON public.support_chats
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_support_rate_limit();

-- 16. Create view for recent support chats (last 7 days)
CREATE OR REPLACE VIEW public.v_recent_support_chats AS
SELECT 
    sc.id,
    sc.user_id,
    sc.message,
    sc.attachment_url,
    sc.attachment_name,
    sc.attachment_size,
    sc.sender,
    sc.is_read,
    sc.created_at,
    p.first_name,
    p.last_name,
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
    ) as user_name
FROM public.support_chats sc
LEFT JOIN public.profiles p ON sc.user_id = p.id
WHERE sc.created_at >= now() - INTERVAL '7 days'
ORDER BY sc.created_at ASC;

-- 17. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.support_chats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_support_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_rate_limits TO authenticated;
GRANT SELECT ON public.v_recent_support_chats TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_support_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_admin_messages_as_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_support_rate_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_support_rate_limit() TO authenticated;

-- 18. Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_support_summary;

-- Success message
SELECT '✅ Support chat system setup completed successfully!' as result; 