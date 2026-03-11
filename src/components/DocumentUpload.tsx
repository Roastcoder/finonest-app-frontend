import { useState, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadProps {
  leadId: number;
  onUploadComplete?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'aadhaar_front', label: 'Aadhaar Front' },
  { value: 'aadhaar_back', label: 'Aadhaar Back' },
  { value: 'pan_card', label: 'PAN Card' },
  { value: 'rc_front', label: 'RC Front' },
  { value: 'rc_back', label: 'RC Back' },
  { value: 'loan_soa', label: 'Loan SOA' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'income_proof', label: 'Income Proof' },
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
      // Remove file if document type is unchecked
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[docType];
        return newFiles;
      });
    }
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
    <div className="stat-card">
      <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-3">Select Document Types</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DOCUMENT_TYPES.map(type => (
              <div key={type.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={type.value}
                  checked={selectedDocTypes.includes(type.value)}
                  onChange={(e) => handleDocTypeChange(type.value, e.target.checked)}
                  className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
                />
                <label htmlFor={type.value} className="text-sm font-medium text-foreground cursor-pointer">
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {selectedDocTypes.length > 0 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Upload Files for Selected Documents</label>
            {selectedDocTypes.map(docType => {
              const docLabel = DOCUMENT_TYPES.find(t => t.value === docType)?.label || docType;
              return (
                <div key={docType} className="border border-border rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">{docLabel}</h4>
                  
                  {!files[docType] ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange(docType, e)}
                        className="hidden"
                        id={`file-upload-${docType}`}
                      />
                      <label htmlFor={`file-upload-${docType}`} className="cursor-pointer">
                        <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
                        <p className="text-xs text-muted-foreground">
                          Click to upload {docLabel}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG or PDF (max 10MB)
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText size={16} />
                        <span className="text-sm">{files[docType].name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(files[docType].size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button 
                        onClick={() => removeFile(docType)} 
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedDocTypes.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={Object.keys(files).length === 0 || uploading}
            className="w-full px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploading ? 'Uploading...' : `Upload ${Object.keys(files).length} Document(s)`}
          </button>
        )}

        {selectedDocTypes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select document types above to start uploading
          </p>
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

  if (loading) return <div>Loading documents...</div>;

  return (
    <div className="stat-card mt-4">
      <h3 className="text-lg font-semibold mb-4">Uploaded Documents</h3>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText size={20} />
                <div>
                  <p className="text-sm font-medium">{doc.document_type.replace(/_/g, ' ').toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.status === 'verified' && <CheckCircle size={20} className="text-green-500" />}
                {doc.status === 'rejected' && <XCircle size={20} className="text-red-500" />}
                {doc.status === 'pending' && <span className="text-xs text-yellow-500">Pending</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
