import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { supabase } from '../supabase.js';
import { showToast } from './ui';
import Dialog from './Dialog';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';

export default function ImportDataModal({ isOpen, onClose, user, onImportSuccess }) {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);

    // Required CSV columns
    const REQUIRED_COLUMNS = ['staff_full_name', 'staff_email', 'certification_name', 'certification_expiry_date'];
    const OPTIONAL_COLUMNS = ['staff_job_title', 'certification_issue_date', 'certification_notes', 'certification_document_url', 'validity_period_months'];

    const resetState = () => {
        setFile(null);
        setParsedData(null);
        setImportResults(null);
        setValidationErrors([]);
        setLoading(false);
    };

    const validateCSVStructure = (headers) => {
        const errors = [];
        const missingRequired = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        
        if (missingRequired.length > 0) {
            errors.push(`Missing required columns: ${missingRequired.join(', ')}`);
        }

        return errors;
    };

    const validateRowData = (data) => {
        const errors = [];
        
        data.forEach((row, index) => {
            const rowNum = index + 2; // +2 because index is 0-based and we skip header
            const rowErrors = [];

            // Required field validation
            if (!row.staff_full_name?.trim()) {
                rowErrors.push('Staff name is required');
            }
            if (!row.staff_email?.trim()) {
                rowErrors.push('Staff email is required');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.staff_email.trim())) {
                rowErrors.push('Invalid email format');
            }
            if (!row.certification_name?.trim()) {
                rowErrors.push('Certification name is required');
            }
            if (!row.certification_expiry_date?.trim()) {
                rowErrors.push('Certification expiry date is required');
            } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.certification_expiry_date.trim())) {
                rowErrors.push('Expiry date must be in YYYY-MM-DD format');
            }

            // Optional date validation
            if (row.certification_issue_date?.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(row.certification_issue_date.trim())) {
                rowErrors.push('Issue date must be in YYYY-MM-DD format');
            }

            // Validity period validation
            if (row.validity_period_months?.trim()) {
                const months = parseInt(row.validity_period_months.trim());
                if (isNaN(months) || months <= 0) {
                    rowErrors.push('Validity period must be a positive number');
                }
            }

            if (rowErrors.length > 0) {
                errors.push({
                    row: rowNum,
                    messages: rowErrors,
                    data: row
                });
            }
        });

        return errors;
    };

    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            showToast('Please upload a CSV file', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showToast('File size must be less than 10MB', 'error');
            return;
        }

        setFile(file);
        setValidationErrors([]);
        setParsedData(null);
        setImportResults(null);

        // Parse CSV
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => {
                if (results.errors.length > 0) {
                    showToast('Error parsing CSV file', 'error');
                    console.error('CSV parsing errors:', results.errors);
                    return;
                }

                const headers = Object.keys(results.data[0] || {});
                const structureErrors = validateCSVStructure(headers);
                
                if (structureErrors.length > 0) {
                    setValidationErrors(structureErrors.map(err => ({ messages: [err] })));
                    return;
                }

                const rowErrors = validateRowData(results.data);
                
                if (rowErrors.length > 0) {
                    setValidationErrors(rowErrors);
                    return;
                }

                if (results.data.length === 0) {
                    showToast('CSV file is empty', 'error');
                    return;
                }

                if (results.data.length > 1000) {
                    showToast('Maximum 1000 rows allowed per import', 'error');
                    return;
                }

                setParsedData(results.data);
                showToast(`CSV parsed successfully: ${results.data.length} rows`, 'success');
            },
            error: (error) => {
                showToast('Error reading CSV file', 'error');
                console.error('CSV parsing error:', error);
            }
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        multiple: false
    });

    const handleImport = async () => {
        if (!parsedData || !user) {
            showToast('No data to import', 'error');
            return;
        }

        setLoading(true);
        setImportResults(null);

        try {
            const { data: result, error } = await supabase.functions.invoke('mass-import', {
                body: {
                    data: parsedData,
                    fileName: file.name
                }
            });

            if (error) {
                throw error;
            }

            setImportResults(result);
            
            if (result.success) {
                showToast(`Import completed: ${result.results.staffCreated} staff, ${result.results.certificationsCreated} certifications`, 'success');
                if (onImportSuccess) {
                    onImportSuccess();
                }
            } else {
                showToast(`Import completed with ${result.results.errors.length} errors`, 'warning');
            }

        } catch (error) {
            console.error('Import error:', error);
            showToast(error.message || 'Import failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            resetState();
            onClose();
        }
    };

    const downloadErrorReport = () => {
        if (!importResults?.results?.errors || importResults.results.errors.length === 0) return;

        const errorData = importResults.results.errors.map(error => ({
            Row: error.row,
            Error: error.error,
            'Staff Name': error.data?.staff_full_name || '',
            'Staff Email': error.data?.staff_email || '',
            'Certification': error.data?.certification_name || ''
        }));

        const csv = Papa.unparse(errorData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-errors-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <Dialog 
            id="import-data-modal" 
            title="Import Staff & Certifications" 
            onClose={handleClose}
            size="large"
        >
            <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements</h3>
                    <div className="text-sm text-blue-800">
                        <p className="mb-2"><strong>Required columns:</strong> staff_full_name, staff_email, certification_name, certification_expiry_date</p>
                        <p className="mb-2"><strong>Optional columns:</strong> staff_job_title, certification_issue_date, certification_notes, certification_document_url, validity_period_months</p>
                        <p><strong>Date format:</strong> YYYY-MM-DD (e.g., 2024-12-31)</p>
                    </div>
                </div>

                {/* File Upload */}
                {!parsedData && !importResults && (
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                            isDragActive 
                                ? 'border-blue-400 bg-blue-50' 
                                : 'border-slate-300 hover:border-slate-400'
                        }`}
                    >
                        <input {...getInputProps()} />
                        <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        {isDragActive ? (
                            <p className="text-blue-600">Drop the CSV file here...</p>
                        ) : (
                            <div>
                                <p className="text-slate-600 mb-2">Drag & drop a CSV file here, or click to select</p>
                                <p className="text-sm text-slate-500">Maximum file size: 10MB, 1000 rows</p>
                            </div>
                        )}
                    </div>
                )}

                {/* File Info */}
                {file && !importResults && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <div className="flex-1">
                            <p className="font-medium text-slate-900">{file.name}</p>
                            <p className="text-sm text-slate-600">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        {parsedData && (
                            <div className="text-sm text-emerald-600 font-medium">
                                {parsedData.length} rows ready
                            </div>
                        )}
                    </div>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <h3 className="font-semibold text-red-900">Validation Errors</h3>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {validationErrors.map((error, index) => (
                                <div key={index} className="text-sm">
                                    {error.row ? (
                                        <p className="text-red-800">
                                            <strong>Row {error.row}:</strong> {error.messages.join(', ')}
                                        </p>
                                    ) : (
                                        <p className="text-red-800">{error.messages?.[0] || error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Import Results */}
                {importResults && (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className={`border rounded-lg p-4 ${
                            importResults.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                            <div className="flex items-center gap-2 mb-3">
                                {importResults.success ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                                )}
                                <h3 className={`font-semibold ${
                                    importResults.success ? 'text-green-900' : 'text-yellow-900'
                                }`}>
                                    Import {importResults.success ? 'Completed' : 'Completed with Errors'}
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="font-medium text-gray-900">Successful Rows</p>
                                    <p className="text-lg text-green-600">{importResults.results.success}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Staff Created</p>
                                    <p className="text-lg text-green-600">{importResults.results.staffCreated}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Certifications Created</p>
                                    <p className="text-lg text-blue-600">{importResults.results.certificationsCreated}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Errors</p>
                                    <p className="text-lg text-red-600">{importResults.results.errors.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Error Details */}
                        {importResults.results.errors && importResults.results.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-red-900">Row Errors ({importResults.results.errors.length})</h3>
                                    <button
                                        onClick={downloadErrorReport}
                                        className="text-sm text-red-700 hover:text-red-800 flex items-center gap-1"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download Error Report
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {importResults.results.errors.slice(0, 10).map((error, index) => (
                                        <div key={index} className="text-sm text-red-800">
                                            <strong>Row {error.row}:</strong> {error.error}
                                        </div>
                                    ))}
                                    {importResults.results.errors.length > 10 && (
                                        <p className="text-sm text-red-700 italic">
                                            ... and {importResults.results.errors.length - 10} more errors. Download full report above.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {importResults ? 'Close' : 'Cancel'}
                    </button>
                    
                    {parsedData && !importResults && (
                        <button
                            onClick={handleImport}
                            disabled={loading || validationErrors.length > 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Importing...' : `Import ${parsedData.length} Rows`}
                        </button>
                    )}
                    
                    {importResults && (
                        <button
                            onClick={() => {
                                resetState();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                        >
                            Import Another File
                        </button>
                    )}
                </div>
            </div>
        </Dialog>
    );
} 