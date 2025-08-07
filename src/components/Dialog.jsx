import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';

export default function Dialog({ id, title, children, onClose, size = 'medium', containerSelector, overlayPosition }) {
    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'max-w-sm';
            case 'large':
                return 'max-w-4xl';
            case 'extra-large':
                return 'max-w-6xl';
            default:
                return 'max-w-md';
        }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const positionClass = overlayPosition === 'absolute' ? 'absolute inset-0' : 'fixed inset-0';

    const modalContent = (
        <div 
            className={`${positionClass} flex items-center justify-center bg-black/70 z-[9999] p-4`}
            onClick={onClose}
        >
            <div 
                id={id}
                className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full ${getSizeClasses()}`}
                onClick={e => e.stopPropagation()}
                style={{
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div className="flex justify-between items-center p-6 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );

    // Render modal content into specified container or document.body via Portal
    const container = (containerSelector && typeof document !== 'undefined') 
        ? document.querySelector(containerSelector) || document.body
        : document.body;
    return createPortal(modalContent, container);
} 