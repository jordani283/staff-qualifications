import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import Dialog from '../components/Dialog';
import { Plus } from 'lucide-react';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';

export default function StaffPage({ setPage, user, session, onOpenExpiredModal, currentPageData }) {
    const [staffWithCerts, setStaffWithCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Get feature access permissions
    const { canCreate, getButtonText, getButtonClass, handleRestrictedAction } = useFeatureAccess(session);

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
        const { error } = await supabase.from('staff').insert(newStaff);
        if(error) {
            showToast(error.message, 'error');
        } else {
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

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Staff Management</h1>
                    <p className="text-slate-400">View, add, and manage your team members.</p>
                </div>
                <button 
                    onClick={() => handleRestrictedAction(
                        () => setShowDialog(true), 
                        handleShowUpgradePrompt
                    )}
                    disabled={!canCreate}
                    className={`${getButtonClass('bg-sky-600 hover:bg-sky-700', 'bg-gray-500 cursor-not-allowed')} text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center`}
                    title={canCreate ? 'Add a new staff member' : 'Upgrade to add staff members'}
                >
                   <Plus className="mr-2 h-4 w-4" /> 
                   {getButtonText('Add Staff', 'Upgrade to Add Staff')}
                </button>
            </div>
            <div id="staff-table-container" className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                {loading ? <Spinner /> : (
                    staffWithCerts.length === 0 ? (
                        <p className="p-6 text-center text-slate-400">
                            {canCreate 
                                ? "No staff members added yet. Click 'Add Staff' to begin."
                                : "No staff members found. Upgrade your plan to add and manage staff members."
                            }
                        </p>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
                                <tr>
                                    <th className="p-4">Full Name</th>
                                    <th className="p-4">Job Title</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4 text-center">Up-to-Date</th>
                                    <th className="p-4 text-center">Expiring Soon</th>
                                    <th className="p-4 text-center">Expired</th>
                                </tr>
                            </thead>
                            <tbody>
                            {staffWithCerts.map(s => (
                                <tr key={s.id} className="border-t border-slate-700 hover:bg-slate-700/30 cursor-pointer transition-colors" onClick={() => setPage('staffDetail', { staffMember: s })}>
                                    <td className="p-4 font-medium text-white">{s.full_name}</td>
                                    <td className="p-4 text-slate-300">{s.job_title || '-'}</td>
                                    <td className="p-4 text-slate-300">{s.email || '-'}</td>
                                    <td className="p-4 text-center font-medium text-green-400">{s.certs.green}</td>
                                    <td className="p-4 text-center font-medium text-amber-400">{s.certs.amber}</td>
                                    <td className="p-4 text-center font-medium text-red-400">{s.certs.red}</td>
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
                            <label htmlFor="full_name" className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                            <input id="full_name" name="full_name" type="text" required className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="email_staff" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                            <input id="email_staff" name="email" type="email" className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="job_title" className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
                            <input id="job_title" name="job_title" type="text" className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500" />
                        </div>
                        <div className="flex justify-end pt-4 gap-3">
                            <button type="button" onClick={() => setShowDialog(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                            <button type="submit" form="add-staff-form" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md">Add Staff</button>
                        </div>
                    </form>
                 </Dialog>
            )}
            {showUpgradeModal && (
                <Dialog id="upgrade-prompt-dialog" title="Upgrade Required" onClose={() => setShowUpgradeModal(false)}>
                    <div className="space-y-4">
                        <p className="text-slate-300">
                            Your trial has expired. Upgrade your plan to add and manage staff members.
                        </p>
                        <div className="flex justify-end pt-4 gap-3">
                            <button 
                                onClick={() => setShowUpgradeModal(false)} 
                                className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                    setPage('subscription');
                                }} 
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md"
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