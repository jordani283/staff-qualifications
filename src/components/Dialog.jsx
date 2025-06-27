import { X } from 'lucide-react';

export default function Dialog({ id, title, children, onClose }) {
    return (
        <div id={id} className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="dialog-content bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4 border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
} 