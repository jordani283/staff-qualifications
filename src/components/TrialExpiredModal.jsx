import { AlertTriangle, CreditCard, Eye, X } from 'lucide-react';

export default function TrialExpiredModal({ isOpen, onUpgradeClick, onViewOnlyClick, onClose }) {
    if (!isOpen) {
        return null;
    }

    const handleUpgradeClick = () => {
        if (onUpgradeClick) {
            onUpgradeClick();
        }
    };

    const handleViewOnlyClick = () => {
        if (onViewOnlyClick) {
            onViewOnlyClick();
        }
    };

    const handleBackdropClick = (e) => {
        // Prevent closing on backdrop click - user must choose an action
        e.stopPropagation();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div 
                className="bg-slate-800 rounded-lg border border-slate-700 shadow-2xl max-w-md w-full mx-auto"
                onClick={handleBackdropClick}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-t-lg px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6 text-red-200" />
                        <h2 className="text-xl font-bold text-white">Trial Expired</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-red-200 hover:text-white transition-colors duration-200 p-1"
                        title="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-4">
                    <div className="text-center space-y-3">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Your trial period has ended
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                To continue adding staff, managing certifications, and exporting data, 
                                please upgrade to a paid plan. You can still view your existing data.
                            </p>
                        </div>
                    </div>

                    {/* Features lost */}
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Features requiring upgrade:</h4>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li>• Add new staff members</li>
                            <li>• Create and assign certifications</li>
                            <li>• Export data to CSV</li>
                            <li>• Edit existing records</li>
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 space-y-3">
                    <button
                        onClick={handleUpgradeClick}
                        className="w-full bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-semibold py-3 px-4 rounded-md transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
                    >
                        <CreditCard className="h-5 w-5" />
                        <span>Upgrade Now</span>
                    </button>
                    
                    <button
                        onClick={handleViewOnlyClick}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center space-x-2 border border-slate-600"
                    >
                        <Eye className="h-4 w-4" />
                        <span>Continue in View-Only Mode</span>
                    </button>
                </div>

                {/* Footer note */}
                <div className="px-6 pb-4">
                    <p className="text-xs text-slate-500 text-center">
                        Your data is safe and will be preserved during the upgrade process.
                    </p>
                </div>
            </div>
        </div>
    );
} 