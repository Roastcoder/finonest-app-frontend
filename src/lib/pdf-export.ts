import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface LoanData {
  [key: string]: any;
}

const LOAN_APPLICATION_PDF_TYPE = 'loan_application_pdf';
const PDF_LOGO_PATH = '/Finonest%20logo.png';

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
  return `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
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

const ROLE_LABELS_MAP: Record<string, string> = {
  executive: 'Executive',
  team_leader: 'Team Leader',
  branch_manager: 'Branch Manager',
  dsa: 'DSA',
  sales_manager: 'Sales Manager',
  manager: 'Manager',
  admin: 'Admin',
};

function buildProfessionalHTML(p: any): string {
  if (!p) return '';
  const isSalaried = p.profile_type === 'salaried';
  const rows: string[] = [];
  if (isSalaried) {
    rows.push(row4('Employment Type', 'Salaried', 'Company Name', fmt(p.company_name), 'Designation', fmt(p.designation), 'Salary Credit', fmt(p.salary_credit_mode?.replace(/_/g, ' '))));
    rows.push(row4('Current Exp (Yrs)', fmt(p.current_job_experience_years), 'Total Exp (Yrs)', fmt(p.total_work_experience_years), 'Net Monthly Salary', p.net_monthly_salary ? fmtCur(p.net_monthly_salary) : '—', 'Salary Slip', p.salary_slip_available ? 'Available' : 'Not Available'));
  } else {
    const subType = fmt(p.sub_type);
    rows.push(row4('Employment Type', 'Self Employed', 'Sub Type', subType, 'Business Name', fmt(p.business_name || p.professional_type || p.freelancer_type), 'Annual Income', p.annual_income ? fmtCur(p.annual_income) : '—'));
    rows.push(row4('Business Vintage (Yrs)', fmt(p.business_vintage_years), 'Practice Exp (Yrs)', fmt(p.practice_experience_years), 'ITR Available', p.itr_available ? 'Yes' : 'No', '', ''));
  }
  return `${sectionTitle('&#128188;', 'Professional Details')}${rows.join('')}`;
}

async function fetchHierarchy(loan: LoanData): Promise<{ name: string; designation: string }[]> {
  try {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` };

    // If loan came from a lead, use lead's creator for hierarchy
    let creatorId = loan.created_by;
    if (loan.lead_id) {
      try {
        const leadRes = await fetch(`${API}/leads/${loan.lead_id}`, { headers });
        if (leadRes.ok) {
          const lead = await leadRes.json();
          if (lead.created_by) creatorId = lead.created_by;
          if (lead.email) loan._lead_email = lead.email;
        }
      } catch {}
    }
    // If no lead_id, use loan's created_by directly (TL or executive who created loan)
    if (!creatorId) return [];

    const hierarchy: { name: string; designation: string }[] = [];
    let currentId = creatorId;
    let depth = 0;
    while (currentId && depth < 6) {
      const res = await fetch(`${API}/users/${currentId}`, { headers });
      if (!res.ok) break;
      const u = await res.json();
      hierarchy.push({ name: u.full_name || '—', designation: ROLE_LABELS_MAP[u.role] || u.role || '—' });
      currentId = u.reporting_to;
      depth++;
    }
    return hierarchy;
  } catch {
    return [];
  }
}

export function exportLoanPDF(loan: LoanData, docs: any[] = []) {
  Promise.all([fetchHierarchy(loan), fetchDocumentFiles(docs)]).then(async ([hierarchy, docFileObjs]) => {
    const loanWithHierarchy = { ...loan, _hierarchy: hierarchy.length > 0 ? hierarchy : undefined };
    const pdfBlob = await generatePDFBlob(loanWithHierarchy, docFileObjs);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const win = window.open(pdfUrl, '_blank');

    if (!win) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `Loan-${loan.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
  });
}

// Helper function to load image as base64
function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function getCompactMoney(val: any): string {
  return fmtCur(val);
}

function clampLines(doc: jsPDF, text: string, maxWidth: number, maxLines = 2): string[] {
  const raw = doc.splitTextToSize(fmt(text), maxWidth) as string[];
  if (raw.length <= maxLines) return raw;
  const clipped = raw.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/\s+\S*$/, '')}...`;
  return clipped;
}

async function buildCompactLoanPdf(loan: LoanData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const colors = {
    primary: [26, 58, 107] as [number, number, number],
    dark: [27, 31, 43] as [number, number, number],
    gray: [111, 119, 135] as [number, number, number],
    line: [224, 229, 236] as [number, number, number],
    soft: [244, 247, 251] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };
  const lm = 10;
  const pageW = 190;
  let y = 10;

  const addText = (text: string, x: number, yy: number, size: number, weight: 'normal' | 'bold', color: [number, number, number], align: 'left' | 'right' | 'center' = 'left') => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, x, yy, { align });
  };

  const addField = (x: number, yy: number, w: number, h: number, label: string, value: any) => {
    doc.setFillColor(...colors.white);
    doc.setDrawColor(...colors.line);
    doc.setLineWidth(0.15);
    doc.rect(x, yy, w, h, 'S');
    doc.setFillColor(247, 250, 255);
    doc.rect(x, yy, w, 4.8, 'F');
    doc.setDrawColor(237, 241, 246);
    doc.line(x, yy + 4.8, x + w, yy + 4.8);
    addText(label, x + 2.5, yy + 3.4, 4.8, 'bold', colors.gray);
    const valueLines = clampLines(doc, fmt(value), w - 5, 2);
    valueLines.forEach((line, idx) => addText(line, x + 2.5, yy + 8 + (idx * 3.8), 7.2, 'bold', colors.dark));
  };

  const addSection = (title: string, fields: [string, any][]) => {
    doc.setFillColor(...colors.soft);
    doc.setDrawColor(...colors.line);
    doc.rect(lm, y, pageW, 6.5, 'F');
    doc.line(lm, y + 6.5, lm + pageW, y + 6.5);
    addText(title, lm + 2.5, y + 4.4, 7.9, 'bold', colors.primary);
    y += 8;

    const gap = 2.5;
    const colW = (pageW - gap * 3) / 4;
    const rowH = 12.5;
    const normalized = [...fields];
    while (normalized.length % 4 !== 0) normalized.push(['', '']);

    for (let i = 0; i < normalized.length; i += 4) {
      for (let j = 0; j < 4; j++) {
        const field = normalized[i + j];
        const x = lm + j * (colW + gap);
        addField(x, y, colW, rowH, field[0], field[1]);
      }
      y += rowH + 1.8;
    }
  };

  try {
    const logoBase64 = await loadImageAsBase64(PDF_LOGO_PATH);
    doc.addImage(logoBase64, 'PNG', lm, y, 44, 13);
  } catch (logoError) {
    console.warn('Could not load logo, using text fallback:', logoError);
    addText('Finonest India', lm, y + 5, 18, 'bold', colors.primary);
    addText('Vehicle Loan Solutions', lm, y + 10, 7.5, 'normal', colors.gray);
  }

  addText('Application ID', lm + pageW, y + 2, 7, 'normal', colors.gray, 'right');
  addText(String(loan.loan_number || loan.id || '—'), lm + pageW, y + 7.2, 12, 'bold', colors.primary, 'right');
  addText('Date', lm + pageW, y + 12, 7, 'normal', colors.gray, 'right');
  addText(new Date().toLocaleDateString('en-IN'), lm + pageW, y + 17, 9.5, 'bold', colors.primary, 'right');

  y += 16;
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(lm, y, lm + pageW, y);
  y += 6;

  doc.setFillColor(...colors.primary);
  doc.rect(lm, y, pageW, 9, 'F');
  addText('Loan Application Details', lm + 4, y + 5.7, 12, 'bold', colors.white);
  addText(fmt(loan.status).toUpperCase(), lm + pageW - 4, y + 5.7, 8.5, 'bold', colors.white, 'right');
  y += 13;

  const applicantAddress = [loan.current_address || loan.address || loan.customer_address, loan.landmark || loan.current_landmark || loan.customer_landmark].filter(Boolean).join(', ');
  const cityState = [loan.city || loan.current_city || loan.current_district, loan.state || loan.current_state].filter(Boolean).join(', ');
  const summaryStatus = loan.existing_loan_status || loan.loan_status || loan.finance_status || loan.status || loan.application_stage;

  addSection('APPLICANT INFORMATION', [
    ['Applicant Name', loan.applicant_name || loan.customer_name], ['Mobile', loan.mobile || loan.phone],
    ['Email', loan.email || loan.customer_email || loan._lead_email], ['Address', applicantAddress || '—'],
    ['City & State', cityState || '—'], ['Pincode', loan.pincode || loan.current_pincode || loan.customer_pincode],
  ]);

  addSection('VEHICLE DETAILS', [
    ['Reg. No', loan.vehicle_number || loan.registration_number], ['Maker', loan.maker_name || loan.car_make || loan.vehicle_make],
    ['Model/Variant', loan.model_variant_name || loan.maker_model || loan.car_model || loan.vehicle_model || loan.variant], ['Chassis No', loan.chassis_number],
    ['Engine No', loan.engine_number], ['Fuel Type', loan.fuel_type],
  ]);

  addSection('LOAN SUMMARY', [
    ['Loan App ID', loan.loan_number || loan.id], ['Loan Amount Required', getCompactMoney(loan.loan_amount)],
    ['Loan Status', summaryStatus], ['Tenure', loan.tenure ? `${loan.tenure} months` : '—'],
    ['EMI Amount', loan.emi ? getCompactMoney(loan.emi) : loan.existing_emi ? getCompactMoney(loan.existing_emi) : '—'], ['Case Type', loan.case_type],
  ]);

  addSection('LENDER & CREATOR', [
    ['Lender', loan.financier_name || loan.selected_financier || loan.bank_name], ['Branch', loan.financier_branch_name],
    ['Sales Manager', loan.financier_executive_name], ['Area Manager', loan.financier_area_manager_name],
    ['Prepared By', loan.created_by_name || loan._hierarchy?.[0]?.name], ['Role', loan._hierarchy?.[0]?.designation || 'Creator'],
  ]);

  const footerY = 280;
  doc.setDrawColor(...colors.line);
  doc.setLineWidth(0.25);
  doc.line(lm, footerY - 4, lm + pageW, footerY - 4);
  addText(`Generated ${new Date().toLocaleString('en-IN')} • Finonest India`, lm, footerY, 6.2, 'normal', colors.gray);
  addText('System-generated document', lm + pageW, footerY, 6.2, 'normal', colors.gray, 'right');

  return doc.output('blob');
}

function generatePDFBlobWithoutImages(loan: LoanData, _docFiles: { file: File; name: string; docType: string }[] = []): Promise<Blob> {
  return buildCompactLoanPdf(loan);
}

export async function buildLoanApplicationPdfBlob(loan: LoanData): Promise<Blob> {
  return buildCompactLoanPdf(loan);
}

function generatePDFBlob(loan: LoanData, _docFiles: { file: File; name: string; docType: string }[] = []): Promise<Blob> {
  return buildCompactLoanPdf(loan);
}

const PDF_DOC_LABELS: Record<string, string> = {
  aadhar_front: 'Aadhar Front', aadhar_back: 'Aadhar Back', pan_card: 'PAN Card',
  rc_front: 'RC Front', rc_back: 'RC Back', rc_copy: 'RC Copy',
  driving_licence: 'Driving Licence', driving_license: 'Driving Licence',
  light_bill: 'Light Bill', bank_statement: 'Bank Statement', loan_statement: 'Loan Statement',
  cheque: 'Cheque', income_proof: 'Income Proof', rent_agreement: 'Rent Agreement',
  customer_photo: 'Customer Photo', photo: 'Photo', disbursement_memo: 'Disbursement Memo',
  insurance: 'Insurance', customer_ledger: 'Customer Ledger',
  co_aadhar_front: 'Co-Applicant Aadhar Front', co_aadhar_back: 'Co-Applicant Aadhar Back',
  co_pan_card: 'Co-Applicant PAN Card', co_photo: 'Co-Applicant Photo',
  guarantor_aadhar_front: 'Guarantor Aadhar Front', guarantor_aadhar_back: 'Guarantor Aadhar Back',
  guarantor_pan_card: 'Guarantor PAN Card', guarantor_rc_front: 'Guarantor RC Front',
  guarantor_rc_back: 'Guarantor RC Back', guarantor_photo: 'Guarantor Photo',
  nach: 'NACH', other: 'Other', loan_application_pdf: 'Loan Application PDF',
};

async function fetchDocumentFiles(docs: any[]): Promise<{ file: File; name: string; docType: string }[]> {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('auth_token');
  const files: { file: File; name: string; docType: string }[] = [];
  for (const doc of docs) {
    try {
      const res = await fetch(`${API}/documents/${doc.id}/download`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) continue;
      const blob = await res.blob();
      const docLabel = PDF_DOC_LABELS[doc.document_type] || doc.document_type?.replace(/_/g, ' ') || 'Document';
      const fileName = `${docLabel}-${doc.file_name}`;
      files.push({ file: new File([blob], fileName, { type: blob.type }), name: fileName, docType: docLabel });
    } catch {}
  }
  return files;
}

async function fetchStoredDocumentFile(doc: any): Promise<{ file: File; name: string; docType: string } | null> {
  try {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API}/documents/${doc.id}/download`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) return null;

    const blob = await res.blob();
    const docLabel = doc.document_type === LOAN_APPLICATION_PDF_TYPE
      ? 'Loan Application PDF'
      : PDF_DOC_LABELS[doc.document_type] || doc.document_type?.replace(/_/g, ' ') || 'Document';
    const fileName = doc.file_name || `${docLabel}.pdf`;

    return {
      file: new File([blob], fileName, { type: blob.type || 'application/pdf' }),
      name: fileName,
      docType: docLabel,
    };
  } catch {
    return null;
  }
}

function isGeneratedLoanPdf(doc: any) {
  return doc?.document_type === LOAN_APPLICATION_PDF_TYPE;
}

async function prepareStoredFilesBundle(docs: any[] = []) {
  const storedPdfDoc = docs.find(isGeneratedLoanPdf);
  const otherDocs = docs.filter(doc => !isGeneratedLoanPdf(doc));
  const [storedPdfFile, docFileObjs] = await Promise.all([
    storedPdfDoc ? fetchStoredDocumentFile(storedPdfDoc) : Promise.resolve(null),
    fetchDocumentFiles(otherDocs),
  ]);

  return {
    pdfDoc: storedPdfDoc || null,
    pdfFile: storedPdfFile?.file || null,
    docFileObjs,
  };
}

// Function to share individual documents
export async function shareDocuments(docs: any[]) {
  try {
    if (!navigator.share) {
      toast.error('Sharing not available on this device');
      return;
    }
    
    const shareableDocs = docs.filter(doc => !isGeneratedLoanPdf(doc));

    if (shareableDocs.length === 0) {
      toast.error('No documents to share');
      return;
    }
    
    const loadingToast = toast.loading('Loading saved files for sharing...');
    
    // Fetch document files
    const docFileObjs = await fetchDocumentFiles(shareableDocs);
    
    if (docFileObjs.length === 0) {
      toast.dismiss(loadingToast);
      toast.error('No documents could be prepared for sharing');
      return;
    }
    
    // Separate images and PDFs
    const imageFiles = docFileObjs.filter(docFile => {
      const fileType = docFile.file.type;
      return fileType.startsWith('image/') || fileType.includes('jpeg') || fileType.includes('jpg') || fileType.includes('png');
    });
    
    const pdfFiles = docFileObjs.filter(docFile => {
      const fileType = docFile.file.type;
      return fileType.includes('pdf');
    });
    
    toast.dismiss(loadingToast);
    
    try {
      // Try sharing all documents together first
      const allFiles = docFileObjs.map(f => f.file);
      console.log('Attempting to share documents:', allFiles.map(f => ({ name: f.name, type: f.type })));
      
      if (navigator.canShare) {
        const canShareAll = await navigator.canShare({ files: allFiles });
        if (canShareAll) {
          await navigator.share({ 
            title: 'Loan Documents',
            text: `${docFileObjs.length} loan documents`,
            files: allFiles
          });
          toast.success(`Shared ${docFileObjs.length} documents!`);
          return;
        }
      }
      
      // Fallback: Try sharing images only
      if (imageFiles.length > 0) {
        const imageFilesList = imageFiles.map(f => f.file);
        const canShareImages = navigator.canShare ? await navigator.canShare({ files: imageFilesList }) : true;
        
        if (canShareImages) {
          await navigator.share({ 
            title: 'Loan Document Images',
            text: `${imageFiles.length} loan document images`,
            files: imageFilesList
          });
          toast.success(`Shared ${imageFiles.length} document images!`);
          
          if (pdfFiles.length > 0) {
            setTimeout(() => {
              toast.info(`${pdfFiles.length} PDF documents may need separate sharing.`);
            }, 2000);
          }
          return;
        }
      }
      
      // If no images, try PDFs
      if (pdfFiles.length > 0) {
        const pdfFilesList = pdfFiles.map(f => f.file);
        const canSharePDFs = navigator.canShare ? await navigator.canShare({ files: pdfFilesList }) : true;
        
        if (canSharePDFs) {
          await navigator.share({ 
            title: 'Loan PDF Documents',
            text: `${pdfFiles.length} loan PDF documents`,
            files: pdfFilesList
          });
          toast.success(`Shared ${pdfFiles.length} PDF documents!`);
          return;
        }
      }
      
      toast.error('Unable to share documents on this device');
      
    } catch (shareError) {
      console.error('Document share error:', shareError);
      
      if (shareError.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else {
        toast.error('Failed to share documents: ' + shareError.message);
      }
    }
    
  } catch (e) {
    console.error('Error preparing documents for sharing:', e);
    toast.error('Failed to prepare documents for sharing');
  }
}

export async function shareLoanMobile(loan: LoanData, docs: any[] = []) {
  try {
    if (!navigator.share) {
      toast.error('Sharing not available on this device');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Preparing documents for sharing...');

    const [hierarchy, docFileObjs] = await Promise.all([fetchHierarchy(loan), fetchDocumentFiles(docs)]);
    const loanH = { ...loan, _hierarchy: hierarchy.length > 0 ? hierarchy : undefined };

    // Create PDF
    const pdfBlob = await generatePDFBlobWithoutImages(loanH, docFileObjs);
    const pdfFile = new File([pdfBlob], `Loan-${loan.id}.pdf`, { type: 'application/pdf' });
    const filesToShare = [pdfFile];

    toast.dismiss(loadingToast);

    try {
      // Share PDF only for predictable mobile behavior
      if (navigator.canShare && await navigator.canShare({ files: filesToShare })) {
        await navigator.share({
          title: `Loan Application - ${loan.id}`,
          text: `Loan application for ${loan.applicant_name || 'Customer'}\nID: ${loan.id}\nAmount: ₹${Number(loan.loan_amount || 0).toLocaleString()}`,
          files: filesToShare
        });
        toast.success('Shared PDF!');
        return;
      }
      await navigator.share({
        title: `Loan Application - ${loan.id}`,
        text: `Loan application for ${loan.applicant_name || 'Customer'}\nID: ${loan.id}\nAmount: ₹${Number(loan.loan_amount || 0).toLocaleString()}`
      });
      toast.info('Shared loan details as text. Use Download PDF for the document file.');

    } catch (shareError: any) {
      if (shareError.name === 'AbortError') {
        toast.info('Sharing cancelled');
      } else {
        toast.error('Failed to share: ' + shareError.message);
      }
    }

  } catch (e) {
    console.error('Share error:', e);
    toast.error('Failed to load saved files for sharing');
  }
}

export async function shareLoanPDF(loan: LoanData, docs: any[] = []) {
  try {
    const bundle = await prepareLoanShareBundle(loan, docs);
    const filesToShare = bundle.files;
    const pdfFile = filesToShare[0];
    
    // Check if native sharing is available
    if (!navigator.share) {
      toast.error('Native sharing not supported on this device/browser');
      return;
    }
    
    try {
      // Share PDF only for predictable mobile behavior
      if (navigator.canShare && typeof navigator.canShare === 'function') {
        const canShareFiles = await navigator.canShare({ files: filesToShare });
        console.log('Can share files:', canShareFiles);
        
        if (canShareFiles) {
          await navigator.share({ 
            title: bundle.title,
            text: bundle.text,
            files: filesToShare 
          });
          toast.success('Shared PDF!');
          return;
        }
      }
      
      // Fallback: share just the PDF
      const canSharePDF = navigator.canShare ? await navigator.canShare({ files: [pdfFile] }) : true;
      
      if (canSharePDF) {
        await navigator.share({ 
          title: `Loan Application - ${loan.id}`,
          text: `Loan application for ${loan.applicant_name || 'Customer'} (ID: ${loan.id}).`,
          files: [pdfFile]
        });
        toast.success('Shared PDF!');
        return;
      }

      await navigator.share({ 
        title: `Loan Application - ${loan.id}`,
        text: `Loan application details for ${loan.applicant_name || 'Customer'}\n\nID: ${loan.id}\nVehicle: ${loan.maker_name || loan.car_make || ''} ${loan.model_variant_name || loan.car_model || ''}\nLoan Amount: ₹${Number(loan.loan_amount || 0).toLocaleString()}\nStatus: ${loan.status || loan.application_stage}\n\nFinonest India Team`
      });
      toast.info('Shared loan details as text.');
      
    } catch (shareError) {
      console.error('Share error:', shareError);
      if (shareError.name === 'AbortError') {
        toast.info('Sharing cancelled by user');
      } else {
        toast.error('Failed to share: ' + shareError.message);
      }
    }
    
  } catch (e) {
    console.error('Error preparing documents for sharing:', e);
    toast.error('Failed to load saved files for sharing');
  }
}

export async function prepareLoanShareBundle(loan: LoanData, docs: any[] = []) {
  const { pdfFile } = await prepareStoredFilesBundle(docs);
  const finalPdf = pdfFile || new File([await buildLoanApplicationPdfBlob(loan)], `Loan-${loan.id}.pdf`, { type: 'application/pdf' });
  return {
    title: `Loan Application - ${loan.id}`,
    text: `Loan application for ${loan.applicant_name || 'Customer'} (ID: ${loan.id})`,
    files: [finalPdf],
    docCount: 0,
  };
}

export async function prepareDocumentShareBundle(docs: any[] = []) {
  const docFileObjs = await fetchDocumentFiles(docs.filter(doc => !isGeneratedLoanPdf(doc)));
  return {
    title: 'Loan Documents',
    text: `${docFileObjs.length} loan documents`,
    files: docFileObjs.map(docFile => docFile.file),
    docCount: docFileObjs.length,
  };
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadLoanPDF(loan: LoanData, docs: any[] = []) {
  try {
    const [hierarchy, docFileObjs] = await Promise.all([fetchHierarchy(loan), fetchDocumentFiles(docs)]);
    const loanH = { ...loan, _hierarchy: hierarchy.length > 0 ? hierarchy : undefined };
    const pdfBlob = await generatePDFBlob(loanH, docFileObjs);
    triggerDownload(pdfBlob, `Loan-${loan.id}-${loan.applicant_name?.replace(/\s+/g, '_') || 'Application'}.pdf`);
  } catch (error) {
    console.error('Error generating PDF for download:', error);
    alert('Error generating PDF. Please try again.');
  }
}
