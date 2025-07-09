export function Spinner() {
    return (
        <div className="flex justify-center items-center p-12 w-full h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
    );
}

export function CardSpinner({ title }) {
     return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-600">{title}</h3>
            <div className="h-8 mt-1 flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400"></div>
            </div>
        </div>
     );
}

export function StatusBadge({ status }) {
    const colors = {
        'Up-to-Date': 'bg-emerald-50 text-emerald-600 border-emerald-200',
        'Expiring Soon': 'bg-amber-50 text-amber-600 border-amber-200',
        'Expired': 'bg-red-50 text-red-600 border-red-200'
    };
    return <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colors[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{status}</span>;
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