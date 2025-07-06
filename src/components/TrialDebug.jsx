import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { useTrialStatus } from '../hooks/useTrialStatus.js';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';

export default function TrialDebug({ session }) {
    const [rawTrialData, setRawTrialData] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [error, setError] = useState(null);
    
    const trialStatus = useTrialStatus(session);
    const featureAccess = useFeatureAccess(session);

    useEffect(() => {
        const fetchDebugData = async () => {
            if (!session?.user) return;

            try {
                // 1. Check raw v_trial_status view
                const { data: trialData, error: trialError } = await supabase
                    .from('v_trial_status')
                    .select('*')
                    .single();

                if (trialError) {
                    console.error('Trial status view error:', trialError);
                    setError('Trial view error: ' + trialError.message);
                } else {
                    setRawTrialData(trialData);
                }

                // 2. Check raw profile data
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, subscription_status, trial_ends_at, created_at')
                    .eq('id', session.user.id)
                    .single();

                if (profileError) {
                    console.error('Profile error:', profileError);
                    setError('Profile error: ' + profileError.message);
                } else {
                    setProfileData(profileData);
                }

            } catch (err) {
                console.error('Debug fetch error:', err);
                setError('Debug error: ' + err.message);
            }
        };

        fetchDebugData();
    }, [session?.user?.id]);

    if (!session?.user) {
        return <div className="bg-slate-800 p-4 rounded">No session</div>;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-600 rounded-lg p-4 max-w-lg text-xs text-white z-50">
            <h3 className="font-bold mb-2">Trial Debug Info</h3>
            
            {error && (
                <div className="bg-red-900/50 p-2 rounded mb-2">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="space-y-2">
                <div>
                    <strong>User ID:</strong> {session.user.id}
                </div>

                <div>
                    <strong>Raw Profile Data:</strong>
                    <pre className="text-xs bg-slate-900 p-2 rounded overflow-auto">
                        {JSON.stringify(profileData, null, 2)}
                    </pre>
                </div>

                <div>
                    <strong>Raw Trial View Data:</strong>
                    <pre className="text-xs bg-slate-900 p-2 rounded overflow-auto">
                        {JSON.stringify(rawTrialData, null, 2)}
                    </pre>
                </div>

                <div>
                    <strong>useTrialStatus Hook:</strong>
                    <pre className="text-xs bg-slate-900 p-2 rounded overflow-auto">
                        {JSON.stringify(trialStatus, null, 2)}
                    </pre>
                </div>

                <div>
                    <strong>useFeatureAccess Hook:</strong>
                    <pre className="text-xs bg-slate-900 p-2 rounded overflow-auto">
                        {JSON.stringify({
                            canCreate: featureAccess.canCreate,
                            canDelete: featureAccess.canDelete,
                            canAssign: featureAccess.canAssign,
                            showUpgradePrompt: featureAccess.showUpgradePrompt,
                            isLoading: featureAccess.isLoading,
                            hasError: featureAccess.hasError
                        }, null, 2)}
                    </pre>
                </div>

                <div>
                    <strong>Current Date:</strong> {new Date().toISOString()}
                </div>
            </div>
        </div>
    );
} 