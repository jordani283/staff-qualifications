import { useTrialStatus } from './useTrialStatus.js';

export const useFeatureAccess = (session) => {
  const trialStatus = useTrialStatus(session);

  // Determine feature access based on trial status
  const accessAllowed = trialStatus.accessAllowed && !trialStatus.isExpired;
  
  return {
    // Trial status information
    trialStatus,
    
    // Feature permissions
    canCreate: accessAllowed,
    canEdit: accessAllowed,
    canDelete: accessAllowed,
    canExport: accessAllowed,
    canAssign: accessAllowed, // For certification assignments
    
    // UI state flags
    showUpgradePrompt: trialStatus.isExpired || !accessAllowed,
    isLoading: trialStatus.loading,
    hasError: !!trialStatus.error,
    
    // Convenience methods for UI
    getButtonText: (defaultText, upgradeText = `Upgrade to ${defaultText}`) => {
      return accessAllowed ? defaultText : upgradeText;
    },
    
    getButtonClass: (defaultClass, disabledClass = 'bg-gray-500 cursor-not-allowed') => {
      return accessAllowed ? defaultClass : disabledClass;
    },
    
    // Method to handle click events - either perform action or show upgrade prompt
    handleRestrictedAction: (allowedAction, restrictedAction) => {
      if (accessAllowed) {
        allowedAction();
      } else {
        restrictedAction();
      }
    }
  };
}; 