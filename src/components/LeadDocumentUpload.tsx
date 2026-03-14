import { useState } from 'react';
import { X, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface LeadDocumentUploadProps {
  onDocumentsChange: (documents: { [key: string]: File }) => void;
}

const REQUIRED_DOCUMENTS = [
  { value: 'aadhar_front', label: 'Aadhar Front', required: true },
  { value: 'aadhar_back', label: 'Aadhar Back', required: true },
  { value: 'pan_card', label: 'PAN Card', required: true },
  { value: 'rc_front', label: 'RC Front', required: false },
  { value: 'rc_back', label: 'RC Back', required: false },
  { value: 'bank_statement', label: 'Bank Statement', required: false },
  { value: 'loan_statement', label: 'Loan Account Statement', required: false },
];

export default function LeadDocumentUpload({ onDocumentsChange }: LeadDocumentUploadProps) {
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);

  const handleDocTypeClick = (docType: string) => {
    if (!selectedDocTypes.includes(docType)) {
      setSelectedDocTypes(prev => [...prev, docType]);
    }
    // Trigger file input
    setTimeout(() => {
      document.getElementById(`file-upload-${docType}`)?.click();
    }, 100);
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
      const newFiles = { ...files, [docType]: selectedFile };
      setFiles(newFiles);
      onDocumentsChange(newFiles);
    }
  };

  const removeFile = (docType: string) => {
    const newFiles = { ...files };
    delete newFiles[docType];
    setFiles(newFiles);
    onDocumentsChange(newFiles);
  };

  const viewDocument = (file: File) => {
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">Documents</h2>

      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Required Documents <span className="text-red-500">*</span></h3>
        <div className="flex flex-wrap gap-4">
          {REQUIRED_DOCUMENTS.map(doc => (
            <div key={doc.value} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleDocTypeClick(doc.value)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
              >
                {doc.label} {doc.required && <span className="text-red-500">*</span>}
              </button>
              {files[doc.value] && (
                <div className="flex items-center gap-2 ml-0">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-green-600 truncate max-w-[150px]">
                    {files[doc.value].name}
                  </span>
                  <button
                    type="button"
                    onClick={() => viewDocument(files[doc.value])}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                    title="View document"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(doc.value)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    title="Remove document"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileChange(doc.value, e)}
                className="hidden"
                id={`file-upload-${doc.value}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
