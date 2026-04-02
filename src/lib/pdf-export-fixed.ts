import { formatCurrency } from '@/lib/mock-data';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface LoanData {
  [key: string]: any;
}

function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('en-IN'); } catch { return '—'; }
}

function fmt(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  return String(val);
}

function fmtCur(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  return formatCurrency(n);
}

// Convert image file to base64 using FileReader
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get image dimensions
async function getImageDimensions(base64: string, mimeType: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

function row4(l1: string, v1: string, l2: string, v2: string, l3: string, v3: string, l4: string, v4: string): string {
  return `<tr>
    <td class="lbl">${l1}</td><td class="val">${v1}</td>
    <td class="lbl">${l2}</td><td class="val">${v2}</td>
    <td class="lbl">${l3}</td><td class="val">${v3}</td>
    <td class="lbl">${l4}</td><td class="val">${v4}</td>
  </tr>`;
}

function sectionTitle(icon: string, title: string): string {
  return `<tr><td colspan="8" class="sec-title">${icon} ${title}</td></tr>`;
}

async function generatePDFBlobWithImages(
  loan: LoanData,
  docFiles: { file: File; name: string; docType: string }[] = []
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
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('Finonest India', lm, y);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.gray);
      doc.text('Vehicle Loan Solutions • Since 2015', lm, y + 5);

      doc.setFontSize(7);
      doc.setTextColor(...colors.gray);
      doc.text('Application ID', lm + pw, y - 4, { align: 'right' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(String(loan.id || ''), lm + pw, y + 1, { align: 'right' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.gray);
      doc.text('Date', lm + pw, y + 5, { align: 'right' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(new Date().toLocaleDateString('en-IN'), lm + pw, y + 10, { align: 'right' });

      y += 14;
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.5);
      doc.line(lm, y, lm + pw, y);
      y += 6;

      // Title bar
      doc.setFillColor(...colors.primary);
      doc.rect(lm, y, pw, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      doc.text('Loan Application Details', lm + 4, y + 5.5);
      doc.setFontSize(8);
      doc.text(fmt(loan.status).toUpperCase(), lm + pw - 4, y + 5.5, { align: 'right' });
      y += 12;

      // Helper to draw sections
      function drawSection(title: string, fields: [string, string][]) {
        const rowCount = Math.ceil(fields.length / 4);
        const needed = 8 + rowCount * 10;
        if (y + needed > 280) {
          doc.addPage();
          y = 12;
        }

        doc.setFillColor(240, 244, 248);
        doc.rect(lm, y, pw, 6, 'F');
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.4);
        doc.line(lm, y + 6, lm + pw, y + 6);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text(title, lm + 2, y + 4.2);
        y += 7;

        const colW = pw / 4;
        for (let i = 0; i < fields.length; i += 4) {
          const rowFields = fields.slice(i, i + 4);

          let maxHeight = 7;
          for (let j = 0; j < 4; j++) {
            if (rowFields[j] && rowFields[j][1]) {
              const textLines = doc.splitTextToSize(rowFields[j][1], colW - 3);
              const requiredHeight = Math.max(7, textLines.length * 2.5 + 4);
              maxHeight = Math.max(maxHeight, requiredHeight);
            }
          }

          for (let j = 0; j < 4; j++) {
            const x = lm + j * colW;
            doc.setDrawColor(...colors.light);
            doc.setLineWidth(0.2);
            doc.rect(x, y, colW, maxHeight);

            if (rowFields[j]) {
              doc.setFontSize(5.5);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...colors.gray);
              doc.text(rowFields[j][0], x + 1.5, y + 2.5);
              doc.setFontSize(8);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...colors.dark);

              const textLines = doc.splitTextToSize(rowFields[j][1], colW - 3);
              textLines.forEach((line: string, lineIndex: number) => {
                doc.text(line, x + 1.5, y + 5.8 + lineIndex * 2.5);
              });
            }
          }
          y += maxHeight;
        }
        y += 2;
      }

      // Add sections
      drawSection('APPLICANT INFORMATION', [
        ['LoanApp ID', fmt(loan.loan_number || loan.id)],
        ['Applicant Name', fmt(loan.applicant_name || loan.customer_name)],
        ['Mobile', fmt(loan.mobile || loan.phone)],
        ['Email', fmt(loan.email || loan.customer_email)],
        ['Co-Applicant', fmt(loan.co_applicant_name)],
        ['Co-App Mobile', fmt(loan.co_applicant_mobile)],
        ['Guarantor', fmt(loan.guarantor_name)],
        ['Guarantor Mobile', fmt(loan.guarantor_mobile)],
        ['Address', fmt(loan.current_address || loan.address)],
        ['Landmark', fmt(loan.landmark || loan.current_landmark)],
        ['City & State', fmt((loan.city || loan.current_district || '') + (loan.state ? ', ' + loan.state : ''))],
        ['Pincode', fmt(loan.pincode || loan.current_pincode)],
      ]);

      drawSection('VEHICLE DETAILS', [
        ['Reg. No', fmt(loan.vehicle_number)],
        ['Maker', fmt(loan.maker_name)],
        ['Model/Variant', fmt(loan.model_variant_name || loan.maker_model)],
        ['Engine Number', fmt(loan.engine_number)],
        ['Chassis Number', fmt(loan.chassis_number)],
        ['Owner Name', fmt(loan.owner_name)],
        ['Fuel Type', fmt(loan.fuel_type)],
        ['Mfg Date', formatDate(loan.manufacturing_date)],
        ['Ownership Type', fmt(loan.ownership_type)],
        ['Financer', fmt(loan.financer)],
        ['Finance Status', fmt(loan.finance_status)],
        ['Insurance Company', fmt(loan.insurance_company)],
      ]);

      drawSection('LENDER DETAILS', [
        ['Lender', fmt(loan.financier_name || loan.selected_financier)],
        ['Branch', fmt(loan.financier_branch_name)],
        ['Sales Manager', fmt(loan.financier_executive_name)],
        ['SM Mobile', fmt(loan.financier_executive_mobile)],
        ['Area Manager', fmt(loan.financier_area_manager_name)],
        ['AM Mobile', fmt(loan.financier_area_manager_mobile)],
        ['Loan Amount', fmtCur(loan.loan_amount)],
        ['Case Type', fmt(loan.case_type)],
      ]);

      // Add documents section with embedded images
      if (docFiles.length > 0) {
        if (y + 25 > 280) {
          doc.addPage();
          y = 12;
        }

        doc.setFillColor(240, 244, 248);
        doc.rect(lm, y, pw, 6, 'F');
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.4);
        doc.line(lm, y + 6, lm + pw, y + 6);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text('UPLOADED DOCUMENTS', lm + 2, y + 4.2);
        y += 10;

        // Process each document
        for (const docFile of docFiles) {
          try {
            const fileType = docFile.file.type;

            if (fileType.startsWith('image/')) {
              // Add new page for image
              doc.addPage();
              y = 12;

              // Header
              doc.setFillColor(...colors.primary);
              doc.rect(0, 0, 210, 14, 'F');
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 255, 255);
              doc.text(docFile.docType, 105, 9, { align: 'center' });

              // Convert image to base64
              const base64 = await fileToBase64(docFile.file);
              const dims = await getImageDimensions(base64, fileType);

              // Calculate dimensions to fit page
              const maxW = 190;
              const maxH = 265;
              let imgW = dims.width;
              let imgH = dims.height;
              const ratio = Math.min(maxW / imgW, maxH / imgH);
              imgW = imgW * ratio;
              imgH = imgH * ratio;

              // Add image
              const imgFormat = fileType === 'image/png' ? 'PNG' : 'JPEG';
              doc.addImage(`data:${fileType};base64,${base64}`, imgFormat, (210 - imgW) / 2, 18, imgW, imgH);

              // Add filename
              doc.setFontSize(7);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...colors.gray);
              doc.text(docFile.name, 105, 18 + imgH + 5, { align: 'center' });
            } else if (fileType === 'application/pdf') {
              // Add page for PDF reference
              doc.addPage();
              y = 12;

              doc.setFillColor(248, 249, 251);
              doc.rect(0, 0, 210, 297, 'F');
              doc.setFillColor(...colors.primary);
              doc.rect(0, 0, 210, 14, 'F');
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 255, 255);
              doc.text(docFile.docType, 105, 9, { align: 'center' });
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...colors.gray);
              doc.text(docFile.name, 105, 150, { align: 'center' });
              doc.setFontSize(8);
              doc.text('(PDF document attached separately)', 105, 160, { align: 'center' });
            }
          } catch (e) {
            console.warn(`Could not embed document ${docFile.name}:`, e);
            // Add text reference instead
            doc.addPage();
            doc.setFillColor(248, 249, 251);
            doc.rect(0, 0, 210, 297, 'F');
            doc.setFillColor(...colors.primary);
            doc.rect(0, 0, 210, 14, 'F');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(docFile.docType, 105, 9, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.gray);
            doc.text(docFile.name, 105, 150, { align: 'center' });
          }
        }
      }

      resolve(doc.output('blob'));
    } catch (error) {
      reject(error);
    }
  });
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

export async function buildLoanApplicationPdfBlob(loan: LoanData, docs: any[] = []): Promise<Blob> {
  try {
    const docFileObjs = await fetchDocumentFiles(docs);
    return await generatePDFBlobWithImages(loan, docFileObjs);
  } catch (error) {
    console.error('Error generating PDF blob:', error);
    throw error;
  }
}

export async function downloadLoanPDF(loan: LoanData, docs: any[] = []) {
  try {
    const pdfBlob = await buildLoanApplicationPdfBlob(loan, docs);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Loan-${loan.id}-${loan.applicant_name?.replace(/\s+/g, '_') || 'Application'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF downloaded successfully!');
  } catch (error) {
    console.error('Error downloading PDF:', error);
    toast.error('Failed to download PDF');
  }
}

export async function shareLoanPDF(loan: LoanData, docs: any[] = []) {
  try {
    if (!navigator.share) {
      toast.error('Sharing not supported on this device');
      return;
    }

    const loadingToast = toast.loading('Preparing PDF for sharing...');
    const pdfBlob = await buildLoanApplicationPdfBlob(loan, docs);
    const pdfFile = new File([pdfBlob], `Loan-${loan.id}.pdf`, { type: 'application/pdf' });

    toast.dismiss(loadingToast);

    await navigator.share({
      title: `Loan Application - ${loan.id}`,
      text: `Loan application for ${loan.applicant_name || 'Customer'}`,
      files: [pdfFile]
    });

    toast.success('PDF shared successfully!');
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('Share error:', error);
      toast.error('Failed to share PDF');
    }
  }
}
