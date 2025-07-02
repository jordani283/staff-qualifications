import { useState } from 'react';
import { X, AlertTriangle, CreditCard } from 'lucide-react';

export default function TrialExpiryBanner({ trialStatus, onUpgradeClick }) {
    const [isDismissed, setIsDismissed] = useState(false);

    // Don't show banner if dismissed or trial is not expired
    if (isDismissed || !trialStatus.isExpired) {
        return null;
    }

    const handleUpgradeClick = () => {
        if (onUpgradeClick) {
            onUpgradeClick();
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
    };

    return (
        <div className="bg-gradient-to-r from-red-600 to-red-700 border-b border-red-500 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-200 flex-shrink-0" />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <span className="font-semibold text-sm sm:text-base">
                            Your trial has expired.
                        </span>
                        <span className="text-red-100 text-sm">
                            Upgrade now to continue managing your team's certifications.
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                    <button
                        onClick={handleUpgradeClick}
                        className="bg-white text-red-600 hover:bg-red-50 font-semibold py-1.5 px-4 rounded-md transition-colors duration-200 flex items-center space-x-2 text-sm whitespace-nowrap"
                    >
                        <CreditCard className="h-4 w-4" />
                        <span>Upgrade Now</span>
                    </button>
                    
                    <button
                        onClick={handleDismiss}
                        className="text-red-200 hover:text-white transition-colors duration-200 p-1"
                        title="Dismiss banner"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
} 