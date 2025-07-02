import { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

export const useTrialStatus = (session) => {
  const [trialStatus, setTrialStatus] = useState({
    loading: true,
    error: null,
    isTrialActive: false,
    isExpired: false,
    daysRemaining: 0,
    accessAllowed: false,
    subscriptionStatus: null,
    trialEndsAt: null
  });

  useEffect(() => {
    const fetchTrialStatus = async () => {
      // Reset to loading state
      setTrialStatus(prev => ({ ...prev, loading: true, error: null }));

      // If no session, user is not authenticated
      if (!session?.user) {
        setTrialStatus({
          loading: false,
          error: null,
          isTrialActive: false,
          isExpired: false,
          daysRemaining: 0,
          accessAllowed: false,
          subscriptionStatus: null,
          trialEndsAt: null
        });
        return;
      }

      try {
        // Fetch trial status from the view
        const { data, error } = await supabase
          .from('v_trial_status')
          .select('*')
          .single();

        if (error) {
          console.error('Error fetching trial status:', error);
          setTrialStatus(prev => ({
            ...prev,
            loading: false,
            error: error.message,
            accessAllowed: false // Default to no access on error
          }));
          return;
        }

        // Parse the trial status data
        const isTrialUser = data?.subscription_status === 'trial' || data?.subscription_status === 'trial_expired';
        const trialStatusValue = data?.trial_status || 'not_trial';
        const isTrialActive = trialStatusValue === 'active' || trialStatusValue === 'expires_today';
        const isExpired = trialStatusValue === 'expired' || data?.subscription_status === 'trial_expired';
        const daysRemaining = data?.days_remaining || 0;
        
        // Access is allowed if:
        // 1. User has active subscription (not trial)
        // 2. User has active trial that hasn't expired
        // 3. The database function says access is allowed
        const accessAllowed = data?.access_allowed === true || 
                             (!isTrialUser && data?.subscription_status === 'active') ||
                             (isTrialUser && isTrialActive);

        setTrialStatus({
          loading: false,
          error: null,
          isTrialActive,
          isExpired,
          daysRemaining: Math.max(0, daysRemaining),
          accessAllowed,
          subscriptionStatus: data?.subscription_status,
          trialEndsAt: data?.trial_ends_at
        });

      } catch (err) {
        console.error('Unexpected error fetching trial status:', err);
        setTrialStatus(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load trial status',
          accessAllowed: false
        }));
      }
    };

    fetchTrialStatus();
  }, [session?.user?.id]); // Re-fetch when user changes

  return trialStatus;
}; 