import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';

export const useSupportUnread = (session) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const realtimeChannel = useRef(null);

    // Fetch unread count
    const fetchUnreadCount = async () => {
        if (!session?.user) {
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        try {
            // First, ensure the user has a support summary record
            await supabase.rpc('ensure_user_support_summary');
            
            // Then fetch the unread count
            const { data, error } = await supabase
                .from('user_support_summary')
                .select('unread_admin_messages')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching unread count:', error);
                setUnreadCount(0);
            } else {
                setUnreadCount(data?.unread_admin_messages || 0);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    };

    // Mark messages as read (call this when user opens support page)
    const markAsRead = async () => {
        if (!session?.user) return;

        try {
            await supabase.rpc('mark_admin_messages_as_read', {
                target_user_id: session.user.id
            });
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    // Set up real-time subscription
    useEffect(() => {
        if (!session?.user) {
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        // Initial fetch
        fetchUnreadCount();

        // Set up real-time subscription for support summary changes
        const channel = supabase
            .channel('support-unread')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'user_support_summary',
                    filter: `user_id=eq.${session.user.id}`
                }, 
                (payload) => {
                    if (payload.new) {
                        setUnreadCount(payload.new.unread_admin_messages || 0);
                    }
                }
            )
            .subscribe();

        realtimeChannel.current = channel;

        return () => {
            if (realtimeChannel.current) {
                supabase.removeChannel(realtimeChannel.current);
            }
        };
    }, [session?.user?.id]);

    return {
        unreadCount,
        loading,
        markAsRead,
        fetchUnreadCount
    };
}; 