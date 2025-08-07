import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import Dialog from '../components/Dialog';
import { Plus, Trash2 } from 'lucide-react';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';
import { logStaffCreated } from '../utils/auditLogger.js';

export default function StaffPage({ setPage, user, session, onOpenExpiredModal, currentPageData }) {
    const [staffWithCerts, setStaffWithCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState(null);

    // Get feature access permissions
    const { canCreate, canDelete, getButtonText, getButtonClass, handleRestrictedAction } = useFeatureAccess(session);

    const fetchStaffAndCerts = useCallback(async () => {
        if (!session) {
            setLoading(false);
            return;
        }
        
        setLoading(true);

        const { data: staff, error: staffError } = await supabase.from('staff').select('*').eq('user_id', session.user.id).order('created_at');
        if (staffError) {
            showToast("Error fetching staff.", "error");
            setLoading(false);
            return;
        }

        const { data: certs, error: certsError } = await supabase.from('v_certifications_with_status').select('staff_id, status').eq('user_id', session.user.id);
        if (certsError) {
            showToast("Error fetching certifications.", "error");
            setLoading(false);
            return;
        }

        const certsByStaff = certs.reduce((acc, cert) => {
            if (!acc[cert.staff_id]) {
                acc[cert.staff_id] = { green: 0, amber: 0, red: 0 };
            }
            if (cert.status === 'Up-to-Date') acc[cert.staff_id].green++;
            if (cert.status === 'Expiring Soon') acc[cert.staff_id].amber++;
            if (cert.status === 'Expired') acc[cert.staff_id].red++;
            return acc;
        }, {});
        
        const combinedData = staff.map(s => ({
            ...s,
            certs: certsByStaff[s.id] || { green: 0, amber: 0, red: 0 }
        }));
        
        setStaffWithCerts(combinedData);
        setLoading(false);
    }, [session]);

    useEffect(() => {
        fetchStaffAndCerts();
    }, [fetchStaffAndCerts]);

    // Auto-open dialog if navigated from dashboard
    useEffect(() => {
        if (currentPageData?.autoOpenDialog && canCreate) {
            setShowDialog(true);
        }
    }, [currentPageData?.autoOpenDialog, canCreate]);
    
    const handleAddStaff = async (e) => {
        e.preventDefault();
        if (!session) {
            showToast('No active session.', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const newStaff = {
            user_id: user.id,
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            job_title: formData.get('job_title'),
        };
        
        const { data: createdStaff, error } = await supabase
            .from('staff')
            .insert(newStaff)
            .select()
            .single();
            
        if(error) {
            showToast(error.message, 'error');
        } else {
            // Log staff creation to audit trail
            const auditResult = await logStaffCreated(createdStaff.id, newStaff);
            if (auditResult.error) {
                console.warn('Failed to log staff creation audit:', auditResult.error);
                // Don't fail the operation for audit logging issues
            }
            
            showToast('Staff member added!', 'success');
            setShowDialog(false);
            fetchStaffAndCerts();
        }
    };

    const handleShowUpgradePrompt = () => {
        if (onOpenExpiredModal) {
            onOpenExpiredModal();
        } else {
            setShowUpgradeModal(true);
            showToast('Upgrade your plan to add staff members', 'error');
        }
        console.log('Upgrade prompt triggered for Add Staff');
    };

    const confirmDeleteStaff = (staff) => {
        if (!canDelete) {
            handleShowUpgradePrompt();
            return;
        }
        setStaffToDelete(staff);
        setShowDeleteDialog(true);
    };

    const handleDeleteStaff = async () => {
        if (!staffToDelete || !session) return;

        setShowDeleteDialog(false);

        try {
            // Get certification count for this staff member
            const certificationCount = staffToDelete.certs.green + staffToDelete.certs.amber + staffToDelete.certs.red;

            // Clean up associated documents in Supabase Storage
            const { data: certsToCleanup, error: certsCleanupError } = await supabase
                .from('staff_certifications')
                .select('document_url')
                .eq('staff_id', staffToDelete.id)
                .not('document_url', 'is', null);

            if (certsCleanupError) {
                console.error("Error fetching certs for document cleanup:", certsCleanupError);
                showToast("Warning: Could not fetch all document paths for cleanup. Staff will still be deleted.", "warning");
            }

            // Clean up storage files if they exist
            if (certsToCleanup && certsToCleanup.length > 0) {
                const filePaths = certsToCleanup.map(cert => {
                    try {
                        // Extract the path from the full URL
                        const url = new URL(cert.document_url);
                        const pathParts = url.pathname.split('/');
                        const pathIndex = pathParts.indexOf('certificates');
                        if (pathIndex !== -1 && pathIndex < pathParts.length - 1) {
                            return pathParts.slice(pathIndex + 1).join('/');
                        }
                        return null;
                    } catch (error) {
                        console.error("Error parsing document URL:", error);
                        return null;
                    }
                }).filter(path => path);

                if (filePaths.length > 0) {
                    console.log("Attempting to delete files from storage:", filePaths);
                    const { error: removeError } = await supabase.storage
                        .from('certificates')
                        .remove(filePaths);

                    if (removeError) {
                        console.error("Error deleting files from storage:", removeError);
                        showToast("Warning: Failed to delete some associated documents from storage.", "warning");
                    }
                }
            }

            // Call the Supabase RPC function to delete staff and cascade certifications
            const { data, error } = await supabase.rpc('delete_staff_member', { 
                p_staff_id: staffToDelete.id 
            });

            if (error) {
                console.error("Error deleting staff:", error);
                showToast(`Failed to delete staff member: ${error.message}`, "error");
            } else if (data && data.status === 'error') {
                showToast(`Failed to delete staff member: ${data.message}`, "error");
            } else {
                showToast(data.message || 'Staff member deleted successfully', "success");
                fetchStaffAndCerts(); // Refresh the staff list
            }
        } catch (err) {
            console.error("An unexpected error occurred during staff deletion:", err);
            showToast("An unexpected error occurred during staff deletion.", "error");
        } finally {
            setStaffToDelete(null);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Staff Management</h1>
                    <p className="text-slate-600">View, add, and manage your team members.</p>
                </div>
                <button 
                    onClick={() => handleRestrictedAction(
                        () => setShowDialog(true), 
                        handleShowUpgradePrompt
                    )}
                    disabled={!canCreate}
                    className={`${getButtonClass('bg-blue-600 hover:bg-blue-700 shadow-sm', 'bg-gray-400 cursor-not-allowed')} text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center`}
                    title={canCreate ? 'Add a new staff member' : 'Upgrade to add staff members'}
                >
                   <Plus className="mr-2 h-4 w-4" /> 
                   {getButtonText('Add Staff', 'Upgrade to Add Staff')}
                </button>
            </div>
            <div id="staff-table-container" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? <Spinner /> : (
                    staffWithCerts.length === 0 ? (
                        <p className="p-6 text-center text-slate-500">
                            {canCreate 
                                ? "No staff members added yet. Click 'Add Staff' to begin."
                                : "No staff members found. Upgrade your plan to add and manage staff members."
                            }
                        </p>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs text-slate-600 uppercase font-medium">
                                <tr>
                                    <th className="p-4">Full Name</th>
                                    <th className="p-4">Job Title</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4 text-center">Up-to-Date</th>
                                    <th className="p-4 text-center">Expiring Soon</th>
                                    <th className="p-4 text-center">Expired</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                            {staffWithCerts.map(s => (
                                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-900 cursor-pointer hover:text-emerald-600" onClick={() => setPage('staffDetail', { staffMember: s })} title="Click to view details">{s.full_name}</td>
                                    <td className="p-4 text-slate-700 cursor-pointer" onClick={() => setPage('staffDetail', { staffMember: s })}>{s.job_title || '-'}</td>
                                    <td className="p-4 text-slate-700 cursor-pointer" onClick={() => setPage('staffDetail', { staffMember: s })}>{s.email || '-'}</td>
                                    <td className="p-4 text-center font-medium text-emerald-600 cursor-pointer" onClick={() => setPage('staffDetail', { staffMember: s })}>{s.certs.green}</td>
                                    <td className="p-4 text-center font-medium text-amber-600 cursor-pointer" onClick={() => setPage('staffDetail', { staffMember: s })}>{s.certs.amber}</td>
                                    <td className="p-4 text-center font-medium text-red-600 cursor-pointer" onClick={() => setPage('staffDetail', { staffMember: s })}>{s.certs.red}</td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDeleteStaff(s);
                                            }}
                                            disabled={!canDelete}
                                            className={`${canDelete ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'} p-1 rounded transition-colors`}
                                            title={canDelete ? `Delete ${s.full_name}` : 'Upgrade to delete staff'}
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
                <Dialog id="add-staff-dialog" title="Add New Staff Member" onClose={() => setShowDialog(false)}>
                    <form id="add-staff-form" onSubmit={handleAddStaff} className="space-y-4">
                        <div>
                            <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                            <input id="full_name" name="full_name" type="text" required placeholder="Enter full name" className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="email_staff" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <input id="email_staff" name="email" type="email" placeholder="Enter email address" className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                        </div>
                        <div>
                            <label htmlFor="job_title" className="block text-sm font-medium text-slate-700 mb-2">Job Title</label>
                            <input id="job_title" name="job_title" type="text" placeholder="Enter job title" className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                        </div>
                        <div className="flex justify-end pt-4 gap-3">
                            <button type="button" onClick={() => setShowDialog(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors">Cancel</button>
                            <button type="submit" form="add-staff-form" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm">Add Staff</button>
                        </div>
                    </form>
                 </Dialog>
            )}
            {showUpgradeModal && (
                <Dialog id="upgrade-prompt-dialog" title="Upgrade Required" onClose={() => setShowUpgradeModal(false)}>
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Your trial has expired. Upgrade your plan to add and manage staff members.
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
                                    setPage('subscription');
                                }} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                            >
                                Upgrade Now
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}

            {/* Delete Staff Confirmation Dialog */}
            {showDeleteDialog && staffToDelete && (
                <Dialog
                    id="delete-staff-dialog"
                    title="Confirm Staff Deletion"
                onClose={() => {
                        setShowDeleteDialog(false);
                        setStaffToDelete(null);
                    }}
                >
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Are you sure you want to permanently delete <span className="font-semibold text-slate-900">{staffToDelete.full_name}</span>?
                        </p>
                        {(staffToDelete.certs.green + staffToDelete.certs.amber + staffToDelete.certs.red) > 0 && (
                            <p className="text-red-600 font-medium">
                                This will also permanently delete {staffToDelete.certs.green + staffToDelete.certs.amber + staffToDelete.certs.red} associated certifications and their audit records.
                            </p>
                        )}
                        <p className="text-red-600 text-sm font-semibold">
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                onClick={() => {
                                    setShowDeleteDialog(false);
                                    setStaffToDelete(null);
                                }} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteStaff} 
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                            >
                                Delete Staff Member
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}
        </>
    );
} 