import { toast } from 'sonner';

interface LoanData {
  [key: string]: any;
}

const PDF_DOC_LABELS: Record<string, string> = {
  aadhar_front: 'Aadhar Front',
  aadhar_back: 'Aadhar Back',
  pan_card: 'PAN Card',
  rc_front: 'RC Front',
  rc_back: 'RC Back',
  driving_licence: 'Driving Licence',
  light_bill: 'Light Bill',
  bank_statement: 'Bank Statement',
  loan_statement: 'Loan Statement',
  cheque: 'Cheque',
  income_proof: 'Income Proof',
  rent_agreement: 'Rent Agreement',
  customer_photo: 'Customer Photo',
  disbursement_memo: 'Disbursement Memo',
  insurance: 'Insurance',
  customer_ledger: 'Customer Ledger',
};

async function fetchDocumentFiles(docs: any[]): Promise<{ file: File; name: string; docType: string }[]> {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const files: { file: File; name: string; docType: string }[] = [];

  if (!docs || docs.length === 0) {
    return files;
  }

  for (const doc of docs) {
    try {
      if (!doc.id) continue;

      const res = await fetch(`${API}/documents/${doc.id}/download`);
      if (!res.ok) continue;

      const blob = await res.blob();
      if (!blob || blob.size === 0) continue;

      const docLabel = PDF_DOC_LABELS[doc.document_type] || doc.document_type?.replace(/_/g, ' ') || 'Document';
      const fileName = `${docLabel}-${doc.file_name}`;
      files.push({ file: new File([blob], fileName, { type: blob.type }), name: fileName, docType: docLabel });
    } catch (error) {
      console.warn(`Error fetching document ${doc.id}:`, error);
    }
  }

  return files;
}

export async function shareLoanWithDocumentsMobile(loan: LoanData, pdfFile: File, docs: any[] = []) {
  try {
    if (!navigator.share) {
      toast.error('Sharing not supported on this device');
      return;
    }

    const loadingToast = toast.loading('Preparing documents for sharing...');

    // Fetch all document files
    const docFileObjs = await fetchDocumentFiles(docs);

    // Separate images and PDFs
    const imageFiles = docFileObjs.filter(d => d.file.type.startsWith('image/'));
    const pdfDocuments = docFileObjs.filter(d => d.file.type.includes('pdf'));

    toast.dismiss(loadingToast);

    const loanMessage = `Loan Application - ${loan.id}\n\nApplicant: ${loan.applicant_name || 'Customer'}\nVehicle: ${loan.maker_name || ''} ${loan.model_variant_name || ''}\nAmount: ₹${Number(loan.loan_amount || 0).toLocaleString()}\nStatus: ${loan.status || loan.application_stage}`;

    // Strategy 1: Try sharing PDF + all images together
    try {
      const allFiles = [pdfFile, ...imageFiles.map(f => f.file)];
      
      if (navigator.canShare && typeof navigator.canShare === 'function') {
        const canShare = await navigator.canShare({ files: allFiles });
        
        if (canShare) {
          await navigator.share({
            title: `Loan Application - ${loan.id}`,
            text: loanMessage + `\n\n📎 PDF + ${imageFiles.length} images attached`,
            files: allFiles
          });
          
          toast.success(`Shared PDF with ${imageFiles.length} images!`);
          return;
        }
      }
    } catch (e) {
      console.log('Strategy 1 failed, trying Strategy 2...');
    }

    // Strategy 2: Share PDF + images separately (for Android)
    try {
      // First share PDF
      await navigator.share({
        title: `Loan Application - ${loan.id}`,
        text: loanMessage,
        files: [pdfFile]
      });

      toast.success('PDF shared! Images can be shared separately.');

      // Offer to share images
      if (imageFiles.length > 0) {
        setTimeout(async () => {
          const shareImages = confirm(`Share ${imageFiles.length} document images separately?`);
          if (shareImages) {
            try {
              await navigator.share({
                title: 'Loan Document Images',
                text: `Document images for loan ${loan.id}`,
                files: imageFiles.map(f => f.file)
              });
              toast.success('Images shared!');
            } catch (e) {
              console.log('Image sharing cancelled or failed');
            }
          }
        }, 1000);
      }
      return;
    } catch (e) {
      console.log('Strategy 2 failed, trying Strategy 3...');
    }

    // Strategy 3: Share images only
    if (imageFiles.length > 0) {
      try {
        await navigator.share({
          title: `Loan Documents - ${loan.id}`,
          text: loanMessage + `\n\n📷 ${imageFiles.length} document images`,
          files: imageFiles.map(f => f.file)
        });
        
        toast.success(`Shared ${imageFiles.length} images!`);
        toast.info('PDF can be shared separately if needed.');
        return;
      } catch (e) {
        console.log('Strategy 3 failed, trying Strategy 4...');
      }
    }

    // Strategy 4: Text only fallback
    await navigator.share({
      title: `Loan Application - ${loan.id}`,
      text: loanMessage + `\n\n📎 ${docFileObjs.length} documents available\n\nFor complete PDF and documents, please contact us.`
    });

    toast.success('Shared loan details as text');

  } catch (error: any) {
    if (error.name === 'AbortError') {
      toast.info('Sharing cancelled');
      return;
    }
    console.error('Share error:', error);
    toast.error('Failed to share: ' + error.message);
  }
}

export async function shareDocumentsOnlyMobile(docs: any[] = []) {
  try {
    if (!navigator.share) {
      toast.error('Sharing not supported on this device');
      return;
    }

    const loadingToast = toast.loading('Preparing documents for sharing...');
    const docFileObjs = await fetchDocumentFiles(docs);
    toast.dismiss(loadingToast);

    if (docFileObjs.length === 0) {
      toast.error('No documents to share');
      return;
    }

    // Separate by type
    const imageFiles = docFileObjs.filter(d => d.file.type.startsWith('image/'));
    const pdfFiles = docFileObjs.filter(d => d.file.type.includes('pdf'));
    const otherFiles = docFileObjs.filter(d => !d.file.type.startsWith('image/') && !d.file.type.includes('pdf'));

    // Strategy 1: Share all together
    try {
      const allFiles = [...imageFiles, ...pdfFiles, ...otherFiles].map(f => f.file);
      
      if (navigator.canShare && typeof navigator.canShare === 'function') {
        const canShare = await navigator.canShare({ files: allFiles });
        
        if (canShare) {
          await navigator.share({
            title: 'Loan Documents',
            text: `${docFileObjs.length} loan documents`,
            files: allFiles
          });
          
          toast.success(`Shared ${docFileObjs.length} documents!`);
          return;
        }
      }
    } catch (e) {
      console.log('Strategy 1 failed, trying Strategy 2...');
    }

    // Strategy 2: Share images first
    if (imageFiles.length > 0) {
      try {
        await navigator.share({
          title: 'Loan Document Images',
          text: `${imageFiles.length} document images`,
          files: imageFiles.map(f => f.file)
        });

        toast.success(`Shared ${imageFiles.length} images!`);

        // Offer to share PDFs
        if (pdfFiles.length > 0) {
          setTimeout(async () => {
            const sharePDFs = confirm(`Share ${pdfFiles.length} PDF documents separately?`);
            if (sharePDFs) {
              try {
                await navigator.share({
                  title: 'Loan PDF Documents',
                  text: `${pdfFiles.length} PDF documents`,
                  files: pdfFiles.map(f => f.file)
                });
                toast.success('PDFs shared!');
              } catch (e) {
                console.log('PDF sharing cancelled');
              }
            }
          }, 1000);
        }
        return;
      } catch (e) {
        console.log('Strategy 2 failed, trying Strategy 3...');
      }
    }

    // Strategy 3: Share PDFs only
    if (pdfFiles.length > 0) {
      try {
        await navigator.share({
          title: 'Loan PDF Documents',
          text: `${pdfFiles.length} PDF documents`,
          files: pdfFiles.map(f => f.file)
        });

        toast.success(`Shared ${pdfFiles.length} PDFs!`);
        return;
      } catch (e) {
        console.log('Strategy 3 failed, trying Strategy 4...');
      }
    }

    // Strategy 4: Text fallback
    await navigator.share({
      title: 'Loan Documents',
      text: `${docFileObjs.length} documents available for loan application`
    });

    toast.success('Shared document info as text');

  } catch (error: any) {
    if (error.name === 'AbortError') {
      toast.info('Sharing cancelled');
      return;
    }
    console.error('Share error:', error);
    toast.error('Failed to share documents');
  }
}

export async function downloadDocumentsMobile(docs: any[] = []) {
  try {
    const docFileObjs = await fetchDocumentFiles(docs);

    if (docFileObjs.length === 0) {
      toast.error('No documents to download');
      return;
    }

    // Download each document
    for (const docFile of docFileObjs) {
      const url = URL.createObjectURL(docFile.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = docFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast.success(`Downloaded ${docFileObjs.length} documents!`);
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to download documents');
  }
}
