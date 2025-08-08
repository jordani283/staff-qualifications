import { useState } from 'react';
import { Upload } from 'lucide-react';
import ImportDataModal from '../components/ImportDataModal.jsx';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';
import { showToast } from '../components/ui.jsx';

export default function ImportDataPage({ user, profile, session, setPage, onOpenExpiredModal }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { canCreate, getButtonText, getButtonClass, handleRestrictedAction } = useFeatureAccess(session);

  const handleImportSuccess = () => {
    showToast('Import completed successfully', 'success');
  };

  // Always render page scaffold; drive import through the existing modal component for reuse
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Upload className="w-8 h-8 text-emerald-600" />
        <h1 className="text-3xl font-bold text-slate-900">Import Data</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-600 mb-4">
          Import staff and certifications from a CSV file following the required format.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleRestrictedAction(() => setIsModalOpen(true), () => onOpenExpiredModal?.())}
            disabled={!canCreate}
            className={`${getButtonClass('bg-blue-600 hover:bg-blue-700 shadow-sm', 'bg-gray-400 cursor-not-allowed')} text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center`}
          >
            <Upload className="mr-2 h-4 w-4" />
            {getButtonText('Upload CSV', 'Upgrade to Import')}
          </button>
        </div>
      </div>

      <ImportDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={profile}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}


