import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface LeadDocumentUploadProps {
  onDocumentsChange: (documents: { [key: string]: File }) => void;
}

const REQUIRED_DOCUMENTS = [
  { value: 'aadhar_front', label: 'Aadhar Front' },
  { value: 'aadhar_back', label: 'Aadhar Back' },
  { value: 'pan_card', label: 'PAN Card' },
];

const OPTIONAL_DOCUMENTS = [
  { value: 'rc_front', label: 'RC Front' },
  { value: 'rc_back', label: 'RC Back' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'loan_statement', label: 'Loan Account Statement' },
];

export default function LeadDocumentUpload({ onDocumentsChange }: LeadDocumentUploadProps) {
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);

  const handleDocTypeChange = (docType: string, checked: boolean) => {
    if (checked) {
      setSelectedDocTypes(prev => [...prev, docType]);
    } else {
      setSelectedDocTypes(prev => prev.filter(type => type !== docType));
      const newFiles = { ...files };
      delete newFiles[docType];
      setFiles(newFiles);
      onDocumentsChange(newFiles);
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">Documents</h2>

      <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Required Documents <span className="text-red-500">*</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
          {REQUIRED_DOCUMENTS.map(doc => (
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
                {doc.label} <span className="text-red-500">*</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Optional Documents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
          {OPTIONAL_DOCUMENTS.map(doc => (
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
            {[...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS]
              .filter(doc => selectedDocTypes.includes(doc.value))
              .map(({ value: docType, label }) => {
                const isRequired = REQUIRED_DOCUMENTS.some(d => d.value === docType);
                return (
                  <div key={docType} className="flex flex-col">
                    <label className="text-[12px] font-medium text-slate-500 mb-1.5 ml-1">
                      {label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
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
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
