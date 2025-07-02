import { Check, X, Minus } from 'lucide-react';

export default function GapAnalysisTable({ staffData, templateData, certificationMatrix }) {
    const getCellStyle = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-400 border border-green-500/30';
            case 'expired':
                return 'bg-red-500/20 text-red-400 border border-red-500/30';
            case 'missing':
            default:
                return 'bg-slate-700/50 text-slate-500 border border-slate-600/30';
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
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-800">
                        <tr>
                            {/* Top-left corner cell */}
                            <th className="p-2 pb-4 text-xs text-slate-400 uppercase font-medium border-r border-slate-700 sticky left-0 bg-slate-800 z-10 min-w-[200px] h-24 align-bottom">
                                <div className="flex items-end h-full">
                                    Staff / Certificates
                                </div>
                            </th>
                            
                            {/* Certificate template headers */}
                            {templateData.map(template => (
                                <th 
                                    key={template.id} 
                                    className="p-2 text-xs text-slate-400 uppercase font-medium text-center border-l border-slate-700 min-w-[120px] relative"
                                    title={template.name}
                                >
                                    <div className="h-20 flex items-end justify-center">
                                        <div 
                                            className="transform -rotate-45 origin-bottom-left whitespace-nowrap text-center max-w-none"
                                            style={{ transformOrigin: 'bottom center' }}
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
                                className={`border-t border-slate-700 hover:bg-slate-700/20 transition-colors ${
                                    staffIndex % 2 === 0 ? 'bg-slate-900/20' : 'bg-slate-800/20'
                                }`}
                            >
                                {/* Staff name cell - sticky left column */}
                                <td className="p-4 font-medium text-white border-r border-slate-700 sticky left-0 bg-slate-800/90 z-10 min-w-[200px]">
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
                                            className="p-2 text-center border-l border-slate-700"
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
            <div className="border-t border-slate-700 bg-slate-800/30 p-4">
                <div className="text-sm text-slate-400">
                    <span className="font-medium text-slate-300">Summary:</span> 
                    {' '}{staffData.length} staff member{staffData.length !== 1 ? 's' : ''} × {templateData.length} certificate{templateData.length !== 1 ? 's' : ''} 
                    {' '}= {staffData.length * templateData.length} total certification requirements
                </div>
            </div>
        </div>
    );
} 