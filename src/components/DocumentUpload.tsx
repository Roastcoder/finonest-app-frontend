import { useState } from 'react';
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
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !documentType) {
      toast.error('Please select document type and file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lead_id', leadId.toString());
    formData.append('document_type', documentType);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success('Document uploaded successfully');
      setFile(null);
      setDocumentType('');
      onUploadComplete?.();
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Document Type</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background"
          >
            <option value="">Select document type</option>
            {DOCUMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Select File</label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mx-auto mb-2 text-muted-foreground" size={32} />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG or PDF (max 10MB)
              </p>
            </label>
          </div>

          {file && (
            <div className="mt-3 flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileText size={20} />
                <span className="text-sm">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || !documentType || uploading}
          className="w-full px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
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

  useState(() => {
    fetchDocuments();
  });

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
