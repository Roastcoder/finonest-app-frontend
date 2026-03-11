import { useState, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, XCircle, File, Image, CreditCard, Car, Building, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadProps {
  leadId: number;
  onUploadComplete?: () => void;
}

const FLAT_DOCUMENTS = [
  { value: 'aadhar_card', label: 'Aadhar Card', subDocuments: [{ value: 'aadhar_front', label: 'Aadhar Card Front' }, { value: 'aadhar_back', label: 'Aadhar Card Back' }] },
  { value: 'pan_card', label: 'Pan Card' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'rc_document', label: 'RC', subDocuments: [{ value: 'rc_front', label: 'RC Front' }, { value: 'rc_back', label: 'RC Back' }] },
  { value: 'income_proof', label: 'Income Proof' },
  { value: 'customer_photo', label: 'Customer Photo' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'customer_ledger', label: 'Customer Ledger' },
];

export default function DocumentUpload({ leadId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleDocTypeChange = (docType: string, checked: boolean) => {
    if (checked) {
      setSelectedDocTypes(prev => [...prev, docType]);
    } else {
      setSelectedDocTypes(prev => prev.filter(type => type !== docType));
      setFiles(prev => {
        const newFiles = { ...prev };
        const doc = FLAT_DOCUMENTS.find(d => d.value === docType);
        if (doc?.subDocuments) {
          doc.subDocuments.forEach(subDoc => {
            delete newFiles[subDoc.value];
          });
        } else {
          delete newFiles[docType];
        }
        return newFiles;
      });
    }
  };

  const getUploadFields = () => {
    const fields: Array<{docType: string, label: string}> = [];
    
    selectedDocTypes.forEach(docType => {
      const doc = FLAT_DOCUMENTS.find(d => d.value === docType);
      if (doc) {
        if (doc.subDocuments) {
          doc.subDocuments.forEach(subDoc => {
            fields.push({ docType: subDoc.value, label: subDoc.label });
          });
        } else {
          fields.push({ docType: doc.value, label: doc.label });
        }
      }
    });
    
    return fields;
  };

  const handleFileChange = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(selectedFile.type)) {
        toast.error('Only JPG, PNG, and PDF files are allowed');
        return;
      }
      setFiles(prev => ({ ...prev, [docType]: selectedFile }));
    }
  };

  const removeFile = (docType: string) => {
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[docType];
      return newFiles;
    });
  };

  const handleUpload = async () => {
    const filesToUpload = Object.entries(files);
    if (filesToUpload.length === 0) {
      toast.error('Please select at least one document to upload');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [docType, file] of filesToUpload) {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('lead_id', leadId.toString());
      formData.append('document_type', docType);

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to upload ${docType}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} document(s) uploaded successfully`);
      setFiles({});
      setSelectedDocTypes([]);
      onUploadComplete?.();
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} document(s) failed to upload`);
    }

    setUploading(false);
  };

  return (
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">Customer Documents</h2>
        
        <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6">
            {FLAT_DOCUMENTS.map(doc => (
              <label key={doc.value} className="flex items-center gap-2.5 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedDocTypes.includes(doc.value)}
                    onChange={(e) => handleDocTypeChange(doc.value, e.target.checked)}
                    className="peer w-4.5 h-4.5 appearance-none border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                  />
                  <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                  {doc.label}
                </span>
              </label>
            ))}
          </div>
        </div>

          {selectedDocTypes.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {getUploadFields().map(({ docType, label }) => (
                  <div key={docType} className="flex flex-col">
                    <label className="text-[12px] font-medium text-slate-500 mb-1.5 ml-1">{label}</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange(docType, e)}
                        className="hidden"
                        id={`file-upload-${docType}`}
                      />
                      <label 
                        htmlFor={`file-upload-${docType}`} 
                        className={`flex items-center w-full h-11 px-3 border border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 overflow-hidden ${files[docType] ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
                      >
                        <div className="flex items-center py-1 px-3 bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700 mr-3 shrink-0 uppercase shadow-sm">
                          Choose file
                        </div>
                        <span className="text-sm text-slate-500 truncate min-w-0 flex-1">
                          {files[docType] ? (
                            <span className="text-slate-800 font-medium">{files[docType].name}</span>
                          ) : (
                            'No file chosen'
                          )}
                        </span>
                        {files[docType] && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeFile(docType);
                            }}
                            className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 gap-3 mt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setFiles({});
                    setSelectedDocTypes([]);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={Object.keys(files).length === 0 || uploading}
                  className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Selected'
                  )}
                </button>
              </div>
            </div>
          )}
      </div>
  );
}

interface DocumentListProps {
  leadId: number;
}

export function DocumentList({ leadId }: DocumentListProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents/lead/${leadId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [leadId]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-muted animate-pulse rounded-lg"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-3 bg-muted/30 rounded-lg animate-pulse">
              <div className="h-3 bg-muted rounded w-20 mb-2"></div>
              <div className="h-2 bg-muted rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 md:p-8 rounded-2xl border border-border/60 shadow-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-success/20 to-success/5 rounded-xl shadow-inner text-success">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Uploaded Documents</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Manage files attached to this lead.</p>
          </div>
        </div>
        {documents.length > 0 && (
          <span className="flex items-center justify-center w-8 h-8 bg-success/10 text-success text-sm font-bold rounded-full border border-success/20 shadow-sm">
            {documents.length}
          </span>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-6">
          <div className="p-3 bg-muted/30 rounded-full w-fit mx-auto mb-2">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No documents uploaded yet</p>
          <p className="text-xs text-muted-foreground">Upload documents using the form above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const getStatusConfig = (status: string) => {
              switch (status) {
                case 'verified':
                  return { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-200/60 shadow-emerald-900/5', iconBg: 'bg-emerald-100' };
                case 'rejected':
                  return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50/50 border-red-200/60 shadow-red-900/5', iconBg: 'bg-red-100' };
                default:
                  return { icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-200/60 shadow-amber-900/5', iconBg: 'bg-amber-100' };
              }
            };
            
            const statusConfig = getStatusConfig(doc.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={doc.id} className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${statusConfig.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg shadow-sm ${statusConfig.iconBg} ${statusConfig.color}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/60 shadow-sm border ${statusConfig.color} border-current/10`}>
                    <StatusIcon className="w-3 h-3" />
                    {doc.status || 'Pending'}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground mb-1 truncate" title={doc.document_type.replace(/_/g, ' ')}>
                    {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title={doc.file_name}>{doc.file_name}</p>
                  {doc.uploaded_at && (
                    <p className="text-[11px] font-medium text-muted-foreground/60 mt-2 bg-background/50 inline-block px-2 py-0.5 rounded-md border border-border/30">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
