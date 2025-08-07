import { Check, X, Minus } from 'lucide-react';

export default function GapAnalysisTable({ staffData, templateData, certificationMatrix }) {
    const getCellStyle = (status) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-100 text-emerald-600 border border-emerald-300';
            case 'expired':
                return 'bg-red-100 text-red-600 border border-red-300';
            case 'missing':
            default:
                return 'bg-slate-100 text-slate-600 border border-slate-300';
        }
    };

    const getCellIcon = (status) => {
        switch (status) {
            case 'active':
                return <Check className="w-3 h-3" />;
            case 'expired':
                return <X className="w-3 h-3" />;
            case 'missing':
            default:
                return <Minus className="w-3 h-3" />;
        }
    };

    const getCellTitle = (status, staffName, templateName) => {
        switch (status) {
            case 'active':
                return `${staffName} has active ${templateName} certification`;
            case 'expired':
                return `${staffName} has expired ${templateName} certification`;
            case 'missing':
            default:
                return `${staffName} does not have ${templateName} certification`;
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                    <thead className="bg-slate-50">
                        <tr>
                            {/* Top-left corner cell */}
                            <th className="p-2 pb-4 text-xs text-slate-600 uppercase font-medium border-r border-slate-200 sticky left-0 bg-slate-50 z-10 h-48 align-bottom" style={{ width: '140px' }}>
                                <div className="flex items-end h-full">
                                    Staff / Certificates
                                </div>
                            </th>
                            
                            {/* Certificate template headers */}
                            {templateData.map(template => (
                                <th 
                                    key={template.id} 
                                    className="p-2 text-sm text-slate-600 uppercase font-medium text-center relative"
                                    title={template.name}
                                    style={{ width: '90px' }}
                                >
                                    <div className="h-60 flex items-end justify-start pb-0 pl-1">
                                        <div 
                                            className="transform -rotate-45 whitespace-nowrap text-center max-w-none"
                                            style={{ transformOrigin: 'bottom left' }}
                                        >
                                            {template.name}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {staffData.map((staff, staffIndex) => (
                            <tr 
                                key={staff.id} 
                                className={`hover:bg-slate-50 transition-colors ${
                                    staffIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                }`}
                            >
                                {/* Staff name cell - sticky left column */}
                                <td className="p-4 font-medium text-slate-900 border-r border-slate-200 sticky left-0 bg-white z-10" style={{ width: '140px' }}>
                                    <div className="truncate" title={staff.full_name}>
                                        {staff.full_name}
                                    </div>
                                </td>
                                
                                {/* Certification status cells */}
                                {templateData.map(template => {
                                    const status = certificationMatrix[staff.id]?.[template.id] || 'missing';
                                    return (
                                        <td 
                                            key={template.id} 
                                            className="p-1 text-left pl-2 pt-2"
                                        >
                                            <div 
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${getCellStyle(status)} transition-colors cursor-default`}
                                                title={getCellTitle(status, staff.full_name, template.name)}
                                            >
                                                {getCellIcon(status)}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Summary row */}
            <div className="border-t border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Summary:</span> 
                    {' '}{staffData.length} staff member{staffData.length !== 1 ? 's' : ''} × {templateData.length} certificate{templateData.length !== 1 ? 's' : ''} 
                    {' '}= {staffData.length * templateData.length} total certification requirements
                </div>
            </div>
        </div>
    );
} 