import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

export const useStaffLimits = (session) => {
  const [staffLimits, setStaffLimits] = useState({
    currentStaffCount: 0,
    staffLimit: 10,
    planName: 'Starter',
    unlimited: false,
    nearLimit: false,
    atLimit: false,
    canAddStaff: true,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!session?.user?.id) {
      setStaffLimits(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchStaffLimits = async () => {
      try {
        setStaffLimits(prev => ({ ...prev, loading: true, error: null }));

        // Use the view we created for easy access
        const { data, error } = await supabase
          .from('v_user_staff_limits')
          .select('*')
          .single();

        if (error) {
          throw error;
        }

        setStaffLimits({
          currentStaffCount: data?.current_staff_count || 0,
          staffLimit: data?.staff_limit || 10,
          planName: data?.plan_name || 'Starter',
          unlimited: data?.unlimited || false,
          nearLimit: data?.near_limit || false,
          atLimit: data?.at_limit || false,
          canAddStaff: data?.can_add_staff || false,
          loading: false,
          error: null
        });
      } catch (err) {
        console.error('Error fetching staff limits:', err);
        setStaffLimits(prev => ({
          ...prev,
          loading: false,
          error: err.message
        }));
      }
    };

    fetchStaffLimits();
  }, [session?.user?.id]);

  // Function to check if user can add staff (for real-time checking)
  const checkCanAddStaff = async () => {
    if (!session?.user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('can_add_staff', {
        user_uuid: session.user.id
      });

      if (error) throw error;
      return data?.canAdd || false;
    } catch (err) {
      console.error('Error checking staff limit:', err);
      return false;
    }
  };

  // Function to get detailed staff limit info
  const getStaffLimitInfo = async () => {
    if (!session?.user?.id) return null;

    try {
      const { data, error } = await supabase.rpc('get_staff_limit_info', {
        user_uuid: session.user.id
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error getting staff limit info:', err);
      return null;
    }
  };

  // Function to refresh staff limits (call after adding/removing staff)
  const refreshStaffLimits = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('v_user_staff_limits')
        .select('*')
        .single();

      if (error) throw error;

      setStaffLimits(prev => ({
        ...prev,
        currentStaffCount: data?.current_staff_count || 0,
        staffLimit: data?.staff_limit || 10,
        planName: data?.plan_name || 'Starter',
        unlimited: data?.unlimited || false,
        nearLimit: data?.near_limit || false,
        atLimit: data?.at_limit || false,
        canAddStaff: data?.can_add_staff || false,
        error: null
      }));
    } catch (err) {
      console.error('Error refreshing staff limits:', err);
      setStaffLimits(prev => ({
        ...prev,
        error: err.message
      }));
    }
  };

  return {
    ...staffLimits,
    checkCanAddStaff,
    getStaffLimitInfo,
    refreshStaffLimits
  };
}; 