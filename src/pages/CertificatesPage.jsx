import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import Dialog from '../components/Dialog';
import { Plus, Trash2 } from 'lucide-react';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';

export default function CertificatesPage({ user, session, onOpenExpiredModal, currentPageData }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Get feature access permissions
    const { canCreate, canDelete, getButtonText, getButtonClass, handleRestrictedAction } = useFeatureAccess(session);

    const fetchTemplates = useCallback(async () => {
        if (!session) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        const { data, error } = await supabase.from('certification_templates').select('*').order('name');
        if(error) {
            showToast("Error fetching certificates.", "error");
        } else {
            setTemplates(data);
        }
        setLoading(false);
    }, [session]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Auto-open dialog if navigated from dashboard
    useEffect(() => {
        if (currentPageData?.autoOpenDialog && canCreate) {
            setShowDialog(true);
        }
    }, [currentPageData?.autoOpenDialog, canCreate]);

    const handleAddTemplate = async (e) => {
        e.preventDefault();
        if (!session) {
            showToast('No active session.', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const newTemplate = {
            user_id: user.id,
            name: formData.get('template_name'),
            validity_period_months: parseInt(formData.get('validity')),
        };
        const { error } = await supabase.from('certification_templates').insert(newTemplate);
        if(error) {
            showToast(error.message, 'error');
        } else {
            showToast('Certificate created!', 'success');
            setShowDialog(false);
            fetchTemplates();
        }
    };
    
    const confirmDeleteTemplate = (template) => {
        if (!canDelete) {
            handleShowUpgradePrompt();
            return;
        }
        setTemplateToDelete(template);
        setShowDeleteDialog(true);
    };

    const handleDeleteTemplate = async () => {
        if (!session || !templateToDelete) {
            showToast('No active session.', 'error');
            return;
        }
        
        const { error } = await supabase.from('certification_templates').delete().eq('id', templateToDelete.id);
            if(error) {
                showToast(error.message, 'error');
            } else {
                showToast('Certificate deleted.', 'success');
                fetchTemplates();
            }
        
        // Close dialog and reset state
        setShowDeleteDialog(false);
        setTemplateToDelete(null);
    };

    const handleShowUpgradePrompt = () => {
        if (onOpenExpiredModal) {
            onOpenExpiredModal();
        } else {
            setShowUpgradeModal(true);
            showToast('Upgrade your plan to manage certificates', 'error');
        }
        console.log('Upgrade prompt triggered for certificate management');
    };

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Certificate Management</h1>
                    <p className="text-slate-600">Create and manage reusable certificate types.</p>
                </div>
                <button 
                    onClick={() => handleRestrictedAction(
                        () => setShowDialog(true), 
                        handleShowUpgradePrompt
                    )}
                    disabled={!canCreate}
                    className={`${getButtonClass('bg-emerald-600 hover:bg-emerald-700 shadow-sm', 'bg-gray-400 cursor-not-allowed')} text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center`}
                    title={canCreate ? 'Create a new certificate template' : 'Upgrade to create certificates'}
                >
                   <Plus className="mr-2 h-4 w-4" /> 
                   {getButtonText('Add Certificate', 'Upgrade to Add')}
                </button>
            </div>
            <div id="templates-table-container" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? <Spinner /> : (
                    templates.length === 0 ? (
                        <p className="p-6 text-center text-slate-500">
                            {canCreate 
                                ? "No certificates created yet. Click 'Add Certificate' to begin."
                                : "No certificates found. Upgrade your plan to create and manage certificate templates."
                            }
                        </p>
                    ) : (
                        <table className="w-full text-left">
                             <thead className="bg-slate-50 text-xs text-slate-600 uppercase font-medium">
                                <tr>
                                    <th className="p-4">Certificate Name</th><th className="p-4">Validity (Months)</th><th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map(template => (
                                     <tr key={template.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-900">{template.name}</td>
                                        <td className="p-4 text-slate-700">{template.validity_period_months}</td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => confirmDeleteTemplate(template)} 
                                                disabled={!canDelete}
                                                className={`${canDelete ? 'text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded' : 'text-gray-400 cursor-not-allowed'}`}
                                                title={canDelete ? 'Delete certificate template' : 'Upgrade to delete certificates'}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
            {showDialog && canCreate && (
                <Dialog id="add-template-dialog" title="Add New Certificate" onClose={() => setShowDialog(false)}>
                    <form id="add-template-form" onSubmit={handleAddTemplate} className="space-y-4">
                        <div>
                            <label htmlFor="template_name" className="block text-sm font-medium text-slate-700 mb-2">Certificate Name</label>
                            <input id="template_name" name="template_name" type="text" required placeholder="Enter certificate name" className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="validity" className="block text-sm font-medium text-slate-700 mb-2">Validity Period (Months)</label>
                            <input id="validity" name="validity" type="number" min="1" max="120" required placeholder="e.g., 12" className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                        </div>
                        <div className="flex justify-end pt-4 gap-3">
                            <button type="button" onClick={() => setShowDialog(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors">Cancel</button>
                            <button type="submit" form="add-template-form" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm">Add Certificate</button>
                        </div>
                    </form>
                </Dialog>
            )}
            {showDeleteDialog && templateToDelete && canDelete && (
                <Dialog id="delete-template-dialog" title="Confirm Deletion" onClose={() => setShowDeleteDialog(false)}>
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Are you sure you want to delete the certificate template <span className="font-semibold text-slate-900">"{templateToDelete.name}"</span>?
                        </p>
                        <p className="text-red-600 text-sm">
                            This action cannot be undone and will also delete all assigned certifications of this type.
                        </p>
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                onClick={() => setShowDeleteDialog(false)} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteTemplate} 
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                            >
                                Delete Certificate
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}
            {showUpgradeModal && (
                <Dialog id="upgrade-prompt-dialog" title="Upgrade Required" onClose={() => setShowUpgradeModal(false)}>
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Your trial has expired. Upgrade your plan to create and manage certificate templates.
                        </p>
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                onClick={() => setShowUpgradeModal(false)} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                    // TODO: Navigate to subscription page in Phase 2
                                    showToast('Redirecting to subscription page...', 'success');
                                }} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                            >
                                Upgrade Now
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}
        </>
    );
} 