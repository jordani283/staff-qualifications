import { X } from 'lucide-react';

export default function Dialog({ id, title, children, onClose }) {
    return (
        <div 
            id={id} 
            className="fixed inset-0 bg-black/70 z-[9999] flex justify-center items-start p-4"
            onClick={onClose}
            style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                paddingTop: '80px'
            }}
        >
            <div 
                className="dialog-content bg-slate-800 rounded-lg shadow-xl w-full max-w-md border border-slate-700" 
                onClick={e => e.stopPropagation()}
                style={{
                    maxHeight: 'calc(100vh - 160px)',
                    overflowY: 'auto'
                }}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
} 