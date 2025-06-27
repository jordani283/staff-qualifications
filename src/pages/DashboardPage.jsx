import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { CardSpinner, Spinner, StatusBadge, showToast } from '../components/ui';
import { Download } from 'lucide-react';

export default function DashboardPage() {
    const [metrics, setMetrics] = useState({ green: 0, amber: 0, red: 0 });
    const [certs, setCerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('v_certifications_with_status').select('*');
        if (error) {
            console.error("Error fetching dashboard data:", error);
            showToast("Error loading data.", "error");
        } else {
            const newMetrics = data.reduce((acc, cert) => {
                if (cert.status === 'Up-to-Date') acc.green++;
                if (cert.status === 'Expiring Soon') acc.amber++;
                if (cert.status === 'Expired') acc.red++;
                return acc;
            }, { green: 0, amber: 0, red: 0 });
            setMetrics(newMetrics);

            const actionNeededCerts = data.filter(c => c.status !== 'Up-to-Date').sort((a,b) => new Date(a.expiry_date) - new Date(b.expiry_date));
            setCerts(actionNeededCerts);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);
    
    const handleExportCsv = async () => {
        const { data, error } = await supabase.from('v_certifications_with_status').select('*');
        if (error) {
            showToast('Failed to fetch data for export.', 'error');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Staff Name,Job Title,Certification,Issue Date,Expiry Date,Status,Document URL\n";
        
        data.forEach(row => {
            const values = [row.staff_name, row.staff_job_title, row.template_name, row.issue_date, row.expiry_date, row.status, row.document_url || 'N/A'];
            csvContent += values.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',') + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `compliance_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400 mb-8">Here's your team's compliance overview.</p>
            
            <div id="dashboard-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {loading ? (
                    <>
                        <CardSpinner title="Up-to-Date" />
                        <CardSpinner title="Expiring Soon" />
                        <CardSpinner title="Expired" />
                    </>
                ) : (
                    <>
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                           <h3 className="text-sm font-medium text-green-400">Up-to-Date</h3>
                           <p className="text-3xl font-bold text-white mt-1">{metrics.green}</p>
                       </div>
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                           <h3 className="text-sm font-medium text-amber-400">Expiring Soon</h3>
                           <p className="text-3xl font-bold text-white mt-1">{metrics.amber}</p>
                       </div>
                        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                           <h3 className="text-sm font-medium text-red-400">Expired</h3>
                           <p className="text-3xl font-bold text-white mt-1">{metrics.red}</p>
                       </div>
                    </>
                )}
            </div>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Action Needed</h2>
                <button onClick={handleExportCsv} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center text-sm">
                    <Download className="mr-2 h-4 w-4" /> Export All to CSV
                </button>
            </div>
            <div id="dashboard-table-container" className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
                {loading ? <Spinner /> : (
                    certs.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">No actions needed. All certifications are up-to-date!</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
                                <tr>
                                    <th className="p-4">Staff Member</th>
                                    <th className="p-4">Certification</th>
                                    <th className="p-4">Expires On</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certs.map(cert => (
                                    <tr key={cert.id} className="border-t border-slate-700">
                                        <td className="p-4 font-medium text-white">{cert.staff_name}</td>
                                        <td className="p-4 text-slate-300">{cert.template_name}</td>
                                        <td className="p-4 text-slate-300">{cert.expiry_date}</td>
                                        <td className="p-4"><StatusBadge status={cert.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
        </>
    );
} 