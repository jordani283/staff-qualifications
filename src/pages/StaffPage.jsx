import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import Dialog from '../components/Dialog';
import { Plus } from 'lucide-react';

export default function StaffPage({ setPage, user }) {
    const [staffWithCerts, setStaffWithCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);

    const fetchStaffAndCerts = useCallback(async () => {
        setLoading(true);

        const { data: staff, error: staffError } = await supabase.from('staff').select('*').order('created_at');
        if (staffError) {
            showToast("Error fetching staff.", "error");
            setLoading(false);
            return;
        }

        const { data: certs, error: certsError } = await supabase.from('v_certifications_with_status').select('staff_id, status');
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
    }, []);

    useEffect(() => {
        fetchStaffAndCerts();
    }, [fetchStaffAndCerts]);
    
    const handleAddStaff = async (e) => {
        e.preventDefault();
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

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Staff Management</h1>
                    <p className="text-slate-400">View, add, and manage your team members.</p>
                </div>
                <button onClick={() => setShowDialog(true)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center">
                   <Plus className="mr-2 h-4 w-4" /> Add Staff
                </button>
            </div>
            <div id="staff-table-container" className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                {loading ? <Spinner /> : (
                    staffWithCerts.length === 0 ? (
                        <p className="p-6 text-center text-slate-400">No staff members added yet. Click 'Add Staff' to begin.</p>
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
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                            {staffWithCerts.map(s => (
                                <tr key={s.id} className="border-t border-slate-700">
                                    <td className="p-4 font-medium text-white">{s.full_name}</td>
                                    <td className="p-4 text-slate-300">{s.job_title || '-'}</td>
                                    <td className="p-4 text-slate-300">{s.email || '-'}</td>
                                    <td className="p-4 text-center font-medium text-green-400">{s.certs.green}</td>
                                    <td className="p-4 text-center font-medium text-amber-400">{s.certs.amber}</td>
                                    <td className="p-4 text-center font-medium text-red-400">{s.certs.red}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => setPage('staffDetail', { staffMember: s })} className="text-sky-400 hover:text-sky-300">View</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
            {showDialog && (
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
        </>
    );
} 