import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface LoanData {
  [key: string]: any;
}

// Image compression for mobile
async function compressImage(file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

// Convert file to Base64 (Mobile Friendly)
async function getBase64Image(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Fetch documents from server
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

      const docLabel = doc.document_type?.replace(/_/g, ' ') || 'Document';
      const fileName = `${docLabel}-${doc.file_name}`;
      files.push({ file: new File([blob], fileName, { type: blob.type }), name: fileName, docType: docLabel });
    } catch (error) {
      console.warn(`Error fetching document ${doc.id}:`, error);
    }
  }

  return files;
}

// Mobile-optimized PDF generation
export async function generateMobileFriendlyPDF(
  loan: LoanData,
  docs: any[] = []
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pw = 190;
      const lm = 10;
      let y = 12;

      const colors = {
        primary: [26, 58, 107] as [number, number, number],
        dark: [26, 26, 46] as [number, number, number],
        gray: [136, 136, 136] as [number, number, number],
        light: [232, 236, 241] as [number, number, number],
        white: [255, 255, 255] as [number, number, number]
      };

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('Finonest India', lm, y);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.gray);
      doc.text('Vehicle Loan Solutions', lm, y + 5);

      // Right side info
      doc.setFontSize(7);
      doc.text('Application ID', lm + pw, y - 2, { align: 'right' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(String(loan.id || ''), lm + pw, y + 2, { align: 'right' });

      y += 12;
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.5);
      doc.line(lm, y, lm + pw, y);
      y += 6;

      // Title
      doc.setFillColor(...colors.primary);
      doc.rect(lm, y, pw, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      doc.text('Loan Application Details', lm + 4, y + 4.5);
      y += 10;

      // Applicant Info
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.dark);
      doc.text('APPLICANT INFORMATION', lm, y);
      y += 6;

      const infoData = [
        ['Name', loan.applicant_name || loan.customer_name || '—'],
        ['Mobile', loan.mobile || loan.phone || '—'],
        ['Email', loan.email || '—'],
        ['Address', loan.current_address || '—'],
        ['City', loan.current_district || '—'],
        ['State', loan.current_state || '—'],
      ];

      doc.setFontSize(7);
      for (const [label, value] of infoData) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.gray);
        doc.text(label + ':', lm, y);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.dark);
        const textLines = doc.splitTextToSize(String(value), pw - 40);
        doc.text(textLines, lm + 40, y);
        
        y += 5;
      }

      y += 3;

      // Vehicle Info
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.dark);
      doc.text('VEHICLE DETAILS', lm, y);
      y += 6;

      const vehicleData = [
        ['Registration', loan.vehicle_number || '—'],
        ['Maker', loan.maker_name || '—'],
        ['Model', loan.model_variant_name || loan.maker_model || '—'],
        ['Engine No', loan.engine_number || '—'],
        ['Chassis No', loan.chassis_number || '—'],
        ['Fuel Type', loan.fuel_type || '—'],
      ];

      doc.setFontSize(7);
      for (const [label, value] of vehicleData) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.gray);
        doc.text(label + ':', lm, y);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.dark);
        doc.text(String(value), lm + 40, y);
        
        y += 5;
      }

      y += 3;

      // Loan Info
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.dark);
      doc.text('LOAN DETAILS', lm, y);
      y += 6;

      const loanData = [
        ['Loan Amount', `₹${Number(loan.loan_amount || 0).toLocaleString()}`],
        ['Tenure', `${loan.tenure || '—'} months`],
        ['EMI', `₹${Number(loan.emi || 0).toLocaleString()}`],
        ['Status', loan.status || loan.application_stage || '—'],
        ['Lender', loan.financier_name || loan.selected_financier || '—'],
      ];

      doc.setFontSize(7);
      for (const [label, value] of loanData) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.gray);
        doc.text(label + ':', lm, y);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.dark);
        doc.text(String(value), lm + 40, y);
        
        y += 5;
      }

      // Fetch and add documents
      const docFileObjs = await fetchDocumentFiles(docs);

      if (docFileObjs.length > 0) {
        // Limit to 5 images for mobile performance
        const imagesToAdd = docFileObjs.filter(d => d.file.type.startsWith('image/')).slice(0, 5);

        for (const docFile of imagesToAdd) {
          try {
            // Compress image for mobile
            const compressedBlob = await compressImage(docFile.file, 800, 600, 0.7);
            const compressedFile = new File([compressedBlob], docFile.file.name, { type: 'image/jpeg' });
            
            // Get base64
            const imgData = await getBase64Image(compressedFile);

            // Add new page for image
            doc.addPage();
            
            // Header
            doc.setFillColor(...colors.primary);
            doc.rect(0, 0, 210, 12, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(docFile.docType, 105, 7, { align: 'center' });

            // Add image
            try {
              doc.addImage(imgData, 'JPEG', 10, 15, 190, 160, undefined, 'FAST');
            } catch (imgErr) {
              console.warn('Could not add image:', imgErr);
              doc.setFontSize(8);
              doc.setTextColor(...colors.gray);
              doc.text('Image could not be embedded', 105, 100, { align: 'center' });
            }

            // Filename at bottom
            doc.setFontSize(7);
            doc.setTextColor(...colors.gray);
            doc.text(docFile.name, 105, 280, { align: 'center' });

          } catch (error) {
            console.warn(`Could not process image ${docFile.name}:`, error);
          }
        }

        // Add PDF documents as text references
        const pdfDocs = docFileObjs.filter(d => d.file.type.includes('pdf'));
        if (pdfDocs.length > 0) {
          doc.addPage();
          doc.setFillColor(...colors.primary);
          doc.rect(0, 0, 210, 12, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('PDF Documents', 105, 7, { align: 'center' });

          doc.setFontSize(8);
          doc.setTextColor(...colors.dark);
          let pdfY = 30;
          for (const pdf of pdfDocs) {
            doc.text(`• ${pdf.docType}`, 20, pdfY);
            pdfY += 8;
          }
        }
      }

      // Footer
      doc.setFontSize(6);
      doc.setTextColor(...colors.gray);
      doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 105, 290, { align: 'center' });

      resolve(doc.output('blob'));

    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}

// Mobile-friendly download
export async function downloadMobilePDF(loan: LoanData, docs: any[] = []) {
  try {
    const loadingToast = toast.loading('Generating PDF...');

    const pdfBlob = await generateMobileFriendlyPDF(loan, docs);
    const url = URL.createObjectURL(pdfBlob);

    // Mobile-friendly download
    const link = document.createElement('a');
    link.href = url;
    link.download = `Loan-${loan.id}-${loan.applicant_name?.replace(/\s+/g, '_') || 'Application'}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);

    toast.dismiss(loadingToast);
    toast.success('PDF downloaded successfully!');

  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to download PDF');
  }
}

// Mobile-friendly share
export async function shareMobilePDF(loan: LoanData, docs: any[] = []) {
  try {
    if (!navigator.share) {
      toast.error('Sharing not supported on this device');
      return;
    }

    const loadingToast = toast.loading('Preparing PDF for sharing...');

    const pdfBlob = await generateMobileFriendlyPDF(loan, docs);
    const pdfFile = new File([pdfBlob], `Loan-${loan.id}.pdf`, { type: 'application/pdf' });

    toast.dismiss(loadingToast);

    // Try to share with files
    try {
      if (navigator.canShare && await navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Loan Application - ${loan.id}`,
          text: `Loan application for ${loan.applicant_name || 'Customer'}`,
          files: [pdfFile]
        });
        toast.success('PDF shared successfully!');
      } else {
        // Fallback: share as text
        await navigator.share({
          title: `Loan Application - ${loan.id}`,
          text: `Loan application for ${loan.applicant_name || 'Customer'}\n\nLoan Amount: ₹${Number(loan.loan_amount || 0).toLocaleString()}\nStatus: ${loan.status || loan.application_stage}`
        });
        toast.success('Shared as text');
      }
    } catch (shareError: any) {
      if (shareError.name !== 'AbortError') {
        console.error('Share error:', shareError);
        toast.error('Failed to share');
      }
    }

  } catch (error) {
    console.error('Error preparing PDF:', error);
    toast.error('Failed to prepare PDF for sharing');
  }
}
