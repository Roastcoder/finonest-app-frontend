import { useState, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, XCircle, File, Image, CreditCard, Car, Building, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadProps {
  leadId: number;
  onUploadComplete?: () => void;
}

const DOCUMENT_CATEGORIES = {
  identity: {
    label: 'Identity Documents',
    icon: CreditCard,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconColor: 'text-blue-600',
    documents: [
      { 
        value: 'aadhar_card', 
        label: 'Aadhar Card',
        subDocuments: [
          { value: 'aadhar_front', label: 'Aadhar Card Front' },
          { value: 'aadhar_back', label: 'Aadhar Card Back' }
        ]
      },
      { value: 'pan_card', label: 'PAN Card' },
      { value: 'driving_licence', label: 'Driving Licence' },
    ]
  },
  vehicle: {
    label: 'Vehicle Documents',
    icon: Car,
    color: 'bg-green-50 border-green-200 text-green-700',
    iconColor: 'text-green-600',
    documents: [
      { 
        value: 'rc_document', 
        label: 'RC Document',
        subDocuments: [
          { value: 'rc_front', label: 'RC Front' },
          { value: 'rc_back', label: 'RC Back' }
        ]
      },
    ]
  },
  financial: {
    label: 'Financial Documents',
    icon: Building,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    iconColor: 'text-purple-600',
    documents: [
      { value: 'bank_statement', label: 'Bank Statement (6 months)' },
      { value: 'cheque', label: 'Cheque' },
      { value: 'income_proof', label: 'Income Proof' },
    ]
  },
  address: {
    label: 'Address Proof',
    icon: Building,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    iconColor: 'text-orange-600',
    documents: [
      { value: 'light_bill', label: 'Light Bill' },
      { value: 'rent_agreement', label: 'Rent Agreement' },
    ]
  },
  loan: {
    label: 'Loan Documents',
    icon: Shield,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    iconColor: 'text-indigo-600',
    documents: [
      { value: 'disbursement_memo', label: 'Disbursement Memo' },
      { value: 'insurance', label: 'Insurance Document' },
      { value: 'customer_ledger', label: 'Customer Ledger' },
    ]
  },
  other: {
    label: 'Other Documents',
    icon: User,
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    iconColor: 'text-gray-600',
    documents: [
      { value: 'customer_photo', label: 'Customer Photo' },
      { value: 'rto_document', label: 'RTO Document' },
      { value: 'noc', label: 'NOC' },
    ]
  }
};

export default function DocumentUpload({ leadId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleDocTypeChange = (docType: string, checked: boolean) => {
    if (checked) {
      setSelectedDocTypes(prev => [...prev, docType]);
    } else {
      setSelectedDocTypes(prev => prev.filter(type => type !== docType));
      // Remove files if document type is unchecked
      setFiles(prev => {
        const newFiles = { ...prev };
        // Find if this document has sub-documents
        Object.values(DOCUMENT_CATEGORIES).forEach(category => {
          const doc = category.documents.find(d => d.value === docType);
          if (doc?.subDocuments) {
            // Remove all sub-document files
            doc.subDocuments.forEach(subDoc => {
              delete newFiles[subDoc.value];
            });
          } else {
            delete newFiles[docType];
          }
        });
        return newFiles;
      });
    }
  };

  const getUploadFields = () => {
    const fields: Array<{docType: string, label: string}> = [];
    
    selectedDocTypes.forEach(docType => {
      Object.values(DOCUMENT_CATEGORIES).forEach(category => {
        const doc = category.documents.find(d => d.value === docType);
        if (doc) {
          if (doc.subDocuments) {
            // Add sub-documents
            doc.subDocuments.forEach(subDoc => {
              fields.push({ docType: subDoc.value, label: subDoc.label });
            });
          } else {
            // Add main document
            fields.push({ docType: doc.value, label: doc.label });
          }
        }
      });
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
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/10 rounded-lg">
          <Upload className="w-5 h-5 text-accent" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Upload Documents</h3>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">Select Document Types</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(DOCUMENT_CATEGORIES).map(([categoryKey, category]) => {
              const IconComponent = category.icon;
              return (
                <div key={categoryKey} className={`rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${category.color}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/50 rounded-lg">
                      <IconComponent className={`w-5 h-5 ${category.iconColor}`} />
                    </div>
                    <h5 className="font-semibold text-sm">{category.label}</h5>
                  </div>
                  <div className="space-y-3">
                    {category.documents.map(doc => (
                      <label key={doc.value} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedDocTypes.includes(doc.value)}
                          onChange={(e) => handleDocTypeChange(doc.value, e.target.checked)}
                          className="w-4 h-4 text-accent bg-white border-2 border-gray-300 rounded focus:ring-accent focus:ring-2 transition-colors"
                        />
                        <span className="text-sm font-medium group-hover:text-foreground transition-colors">
                          {doc.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedDocTypes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <File className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Upload Files for Selected Documents
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getUploadFields().map(({ docType, label }) => (
                <div key={docType} className="glass-panel p-4">
                  <h5 className="text-sm font-semibold mb-3 text-foreground">{label}</h5>
                  
                  {!files[docType] ? (
                    <div className="border-2 border-dashed border-accent/30 rounded-xl p-6 text-center hover:border-accent/50 transition-colors group">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange(docType, e)}
                        className="hidden"
                        id={`file-upload-${docType}`}
                      />
                      <label htmlFor={`file-upload-${docType}`} className="cursor-pointer block">
                        <div className="p-3 bg-accent/10 rounded-full w-fit mx-auto mb-3 group-hover:bg-accent/20 transition-colors">
                          <Upload className="w-6 h-6 text-accent" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Click to upload
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG or PDF (max 10MB)
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-success/20 rounded">
                          {files[docType].type.includes('image') ? 
                            <Image size={16} className="text-success" /> : 
                            <FileText size={16} className="text-success" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-32">
                            {files[docType].name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(files[docType].size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFile(docType)} 
                        className="p-1 hover:bg-destructive/10 rounded transition-colors"
                      >
                        <X size={16} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDocTypes.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <button
              onClick={handleUpload}
              disabled={Object.keys(files).length === 0 || uploading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-all duration-200 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {Object.keys(files).length} Document{Object.keys(files).length !== 1 ? 's' : ''}
                </>
              )}
            </button>
            {Object.keys(files).length > 0 && (
              <button
                onClick={() => {
                  setFiles({});
                  setSelectedDocTypes([]);
                }}
                className="px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        )}

        {selectedDocTypes.length === 0 && (
          <div className="text-center py-8">
            <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-3">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Select document types above to start uploading
            </p>
          </div>
        )}
      </div>
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
      <div className="glass-card p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-muted animate-pulse rounded-lg"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg animate-pulse">
              <div className="w-10 h-10 bg-muted rounded-lg"></div>
              <div className="flex-1">
                <div className="h-3 bg-muted rounded w-24 mb-2"></div>
                <div className="h-2 bg-muted rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-success/10 rounded-lg">
          <CheckCircle className="w-5 h-5 text-success" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">Uploaded Documents</h3>
        {documents.length > 0 && (
          <span className="ml-auto px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-3">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No documents uploaded yet</p>
          <p className="text-xs text-muted-foreground">Upload documents using the form above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const getStatusConfig = (status: string) => {
              switch (status) {
                case 'verified':
                  return { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10 border-success/20' };
                case 'rejected':
                  return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
                default:
                  return { icon: FileText, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' };
              }
            };
            
            const statusConfig = getStatusConfig(doc.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={doc.id} className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${statusConfig.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/50 rounded-lg">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-32">{doc.file_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                    <span className={`text-xs font-medium capitalize ${statusConfig.color}`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
                {doc.uploaded_at && (
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
