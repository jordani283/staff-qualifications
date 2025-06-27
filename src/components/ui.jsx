export function Spinner() {
    return (
        <div className="flex justify-center items-center p-12 w-full h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
        </div>
    );
}

export function CardSpinner({ title }) {
     return (
        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <h3 className="text-sm font-medium text-slate-400">{title}</h3>
            <div className="h-8 mt-1 flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500"></div>
            </div>
        </div>
     );
}

export function StatusBadge({ status }) {
    const colors = {
        'Up-to-Date': 'bg-green-500/20 text-green-400 border-green-500/30',
        'Expiring Soon': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'Expired': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colors[status] || 'bg-slate-600'}`}>{status}</span>;
}

export function showToast(message, type = 'success') {
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600'
    };
    
    const toastContainer = document.getElementById('toast-container') || (() => {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 z-50 space-y-2';
        document.body.appendChild(container);
        return container;
    })();

    toast.id = toastId;
    toast.className = `w-full max-w-sm p-4 ${colors[type]} text-white rounded-md shadow-lg transition-all transform-gpu animate-fadeInUp`;
    toast.innerHTML = `<p>${message}</p>`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        document.getElementById(toastId)?.remove();
    }, 3000);
} 