import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { Spinner, showToast } from '../components/ui';
import Dialog from '../components/Dialog';
import { Plus, Trash2 } from 'lucide-react';

export default function CertificatesPage({ user }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('certification_templates').select('*').order('name');
        if(error) {
            showToast("Error fetching certificates.", "error");
        } else {
            setTemplates(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleAddTemplate = async (e) => {
        e.preventDefault();
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
    
    const handleDeleteTemplate = async (id) => {
        if(confirm('Are you sure you want to delete this certificate? This will also delete all assigned certifications of this type.')) {
            const { error } = await supabase.from('certification_templates').delete().eq('id', id);
            if(error) {
                showToast(error.message, 'error');
            } else {
                showToast('Certificate deleted.', 'success');
                fetchTemplates();
            }
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Certificate Management</h1>
                    <p className="text-slate-400">Create and manage reusable certificate types.</p>
                </div>
                <button onClick={() => setShowDialog(true)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center">
                   <Plus className="mr-2 h-4 w-4" /> Add Certificate
                </button>
            </div>
            <div id="templates-table-container" className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                {loading ? <Spinner /> : (
                    templates.length === 0 ? (
                        <p className="p-6 text-center text-slate-400">No certificates created yet. Click 'Add Certificate' to begin.</p>
                    ) : (
                        <table className="w-full text-left">
                             <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
                                <tr>
                                    <th className="p-4">Certificate Name</th><th className="p-4">Validity (Months)</th><th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map(template => (
                                     <tr key={template.id} className="border-t border-slate-700">
                                        <td className="p-4 font-medium text-white">{template.name}</td>
                                        <td className="p-4 text-slate-300">{template.validity_period_months}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
            {showDialog && (
                <Dialog id="add-template-dialog" title="Add New Certificate" onClose={() => setShowDialog(false)}>
                    <form id="add-template-form" onSubmit={handleAddTemplate} className="space-y-4">
                        <div>
                            <label htmlFor="template_name" className="block text-sm font-medium text-slate-300 mb-1">Certificate Name</label>
                            <input id="template_name" name="template_name" type="text" required className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500" placeholder="e.g., First Aid at Work" />
                        </div>
                        <div>
                            <label htmlFor="validity" className="block text-sm font-medium text-slate-300 mb-1">Validity Period (Months)</label>
                            <input id="validity" name="validity" type="number" required className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500" placeholder="e.g., 36" />
                        </div>
                        <div className="flex justify-end pt-4 gap-3">
                           <button type="button" onClick={() => setShowDialog(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                           <button type="submit" form="add-template-form" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md">Add Certificate</button>
                        </div>
                    </form>
                </Dialog>
            )}
        </>
    );
} 