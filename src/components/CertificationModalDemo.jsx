import React, { useState } from 'react';
import CertificationModal from './CertificationModal';
import { FileText, Calendar, User, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const CertificationModalDemo = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);

  // Sample certification data
  const sampleCertifications = [
    {
      id: 1,
      certification_name: 'First Aid at Work',
      issue_date: '2023-06-15',
      expiry_date: '2026-06-15',
      status: 'Valid',
      document_filename: 'first-aid-certificate.pdf'
    },
    {
      id: 2,
      certification_name: 'Manual Handling Training',
      issue_date: '2023-12-01',
      expiry_date: '2024-12-31',
      status: 'Expiring Soon',
      document_filename: 'manual-handling-cert.pdf'
    },
    {
      id: 3,
      certification_name: 'Fire Safety Training',
      issue_date: '2022-03-10',
      expiry_date: '2024-03-10',
      status: 'Expired',
      document_filename: null
    }
  ];

  // Sample audit trail data
  const sampleAuditTrails = {
    1: [
      {
        id: 1,
        action: 'Certificate uploaded',
        created_at: '2023-06-15T10:30:00Z',
        performed_by: 'John Admin'
      },
      {
        id: 2,
        action: 'Document verified',
        created_at: '2023-06-15T14:15:00Z',
        performed_by: 'Sarah Manager'
      },
      {
        id: 3,
        action: 'Expiry reminder scheduled',
        created_at: '2023-06-16T09:00:00Z',
        performed_by: 'System'
      }
    ],
    2: [
      {
        id: 4,
        action: 'Certificate assigned',
        created_at: '2023-12-01T11:00:00Z',
        performed_by: 'Mike Supervisor'
      },
      {
        id: 5,
        action: 'Expiry warning sent',
        created_at: '2024-11-01T08:00:00Z',
        performed_by: 'System'
      }
    ],
    3: [
      {
        id: 6,
        action: 'Certificate uploaded',
        created_at: '2022-03-10T13:45:00Z',
        performed_by: 'Lisa HR'
      },
      {
        id: 7,
        action: 'Certificate expired',
        created_at: '2024-03-10T00:01:00Z',
        performed_by: 'System'
      },
      {
        id: 8,
        action: 'Renewal reminder sent',
        created_at: '2024-03-15T09:00:00Z',
        performed_by: 'System'
      }
    ]
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'expiring soon':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'valid':
        return 'text-green-400 bg-green-400/10';
      case 'expiring soon':
        return 'text-amber-400 bg-amber-400/10';
      case 'expired':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const handleCertClick = (cert) => {
    setSelectedCert(cert);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCert(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Certification Modal Demo</h1>
          <p className="text-slate-400">Click on any certification to view details in the modal</p>
        </div>

        <div className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-sky-400" />
              John Smith - Staff Certifications
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-800 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Certification</th>
                  <th className="p-4">Issue Date</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Document</th>
                </tr>
              </thead>
              <tbody>
                {sampleCertifications.map(cert => (
                  <tr
                    key={cert.id}
                    className="border-t border-slate-700 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => handleCertClick(cert)}
                  >
                    <td className="p-4 font-medium text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400" />
                      {cert.certification_name}
                    </td>
                    <td className="p-4 text-slate-300 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(cert.issue_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-slate-300 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(cert.expiry_date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(cert.status)}`}>
                        {getStatusIcon(cert.status)}
                        {cert.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {cert.document_filename ? (
                        <span className="text-sky-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Available
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 p-6 bg-slate-800/30 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">Features Demonstrated:</h3>
          <ul className="text-slate-300 space-y-1">
            <li>• Click any row to open the certification details modal</li>
            <li>• Modal shows all certification fields with proper formatting</li>
            <li>• Audit trail section shows activity history</li>
            <li>• Document download/view buttons (placeholder functionality)</li>
            <li>• Accessible modal with keyboard navigation and focus management</li>
            <li>• Smooth animations and responsive design</li>
            <li>• ESC key and backdrop click to close</li>
          </ul>
        </div>
      </div>

      <CertificationModal
        isOpen={showModal}
        onClose={handleCloseModal}
        certification={selectedCert}
        auditTrail={selectedCert ? sampleAuditTrails[selectedCert.id] || [] : []}
      />
    </div>
  );
};

export default CertificationModalDemo; 