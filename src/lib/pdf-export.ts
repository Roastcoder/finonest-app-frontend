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

const ROLE_LABELS_MAP: Record<string, string> = {
  executive: 'Executive',
  team_leader: 'Team Leader',
  branch_manager: 'Branch Manager',
  dsa: 'DSA',
  sales_manager: 'Sales Manager',
  manager: 'Manager',
  admin: 'Admin',
};

async function fetchHierarchy(loan: LoanData): Promise<{ name: string; designation: string }[]> {
  try {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` };

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

function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not get canvas context')); return; }
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
    primary:    [26, 58, 107]   as [number, number, number],
    dark:       [27, 31, 43]    as [number, number, number],
    gray:       [111, 119, 135] as [number, number, number],
    line:       [224, 229, 236] as [number, number, number],
    soft:       [244, 247, 251] as [number, number, number],
    white:      [255, 255, 255] as [number, number, number],
    accentBar:  [26, 58, 107]   as [number, number, number],
  };

  const lm    = 12;          // left margin
  const pageW = 186;         // usable width (210 - 2*12)
  const gap   = 3;           // gap between field cards
  const cols  = 4;
  const colW  = (pageW - gap * (cols - 1)) / cols;  // ≈ 43.5 mm
  const rowH  = 13;          // ▼ reduced from 15 — less empty space
  let y = 10;

  // ── helpers ──────────────────────────────────────────────────────────────
  const setFont = (weight: 'normal' | 'bold', size: number, color: [number, number, number]) => {
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const txt = (
    text: string, x: number, yy: number,
    size: number, weight: 'normal' | 'bold',
    color: [number, number, number],
    align: 'left' | 'right' | 'center' = 'left'
  ) => {
    setFont(weight, size, color);
    doc.text(text, x, yy, { align });
  };

  // Field card — draws a rounded rect with a left accent bar, label on top, value below
  const addField = (x: number, yy: number, w: number, h: number, label: string, value: any) => {
    // Card background
    doc.setFillColor(...colors.white);
    doc.setDrawColor(...colors.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, yy, w, h, 1.5, 1.5, 'FD');

    // Left accent bar
    doc.setFillColor(...colors.accentBar);
    doc.rect(x, yy, 1.4, h, 'F');

    // Label
    txt(label, x + 2.8, yy + 3.8, 5, 'normal', colors.gray);

    // Value — clamp to 2 lines
    const valueStr = fmt(value);
    const valueLines = clampLines(doc, valueStr, w - 5, 2);
    valueLines.forEach((line, idx) => {
      txt(line, x + 2.8, yy + 7.6 + idx * 3.4, 7, 'bold', colors.dark);
    });
  };

  // Section header bar
  const addSection = (title: string, fields: [string, any][]) => {
    // Soft background strip
    doc.setFillColor(...colors.soft);
    doc.setDrawColor(...colors.line);
    doc.setLineWidth(0.2);
    doc.rect(lm, y, pageW, 6.5, 'FD');
    txt(title, lm + 3, y + 4.4, 7.5, 'bold', colors.primary);
    y += 8;   // ▼ was 9

    // Pad fields to multiple of 4
    const normalized = [...fields];
    while (normalized.length % cols !== 0) normalized.push(['', '']);

    for (let i = 0; i < normalized.length; i += cols) {
      for (let j = 0; j < cols; j++) {
        const [lbl, val] = normalized[i + j];
        const x = lm + j * (colW + gap);
        if (lbl) {
          addField(x, y, colW, rowH, lbl, val);
        }
        // empty placeholder — draw nothing (no blank card)
      }
      y += rowH + 2;   // ▼ was rowH + 2.5
    }

    y += 2;   // breathing room after section
  };

  // ── HEADER ───────────────────────────────────────────────────────────────
  try {
    const logoBase64 = await loadImageAsBase64(PDF_LOGO_PATH);
    doc.addImage(logoBase64, 'PNG', lm, y, 40, 12);
  } catch {
    txt('Finonest India', lm, y + 6, 16, 'bold', colors.primary);
    txt('Vehicle Loan Solutions', lm, y + 11, 7, 'normal', colors.gray);
  }

  // Application ID block (top-right) — FIX: use plain text, no decoration
  const rightX = lm + pageW;
  txt('Application ID', rightX, y + 3, 6.5, 'normal', colors.gray, 'right');
  txt(String(loan.loan_number || loan.id || '—'), rightX, y + 8, 11, 'bold', colors.primary, 'right');
  txt('Date', rightX, y + 12.5, 6.5, 'normal', colors.gray, 'right');

  // ▼ FIX for strikethrough date: build date string manually so no CSS affects it
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  txt(dateStr, rightX, y + 17, 9, 'bold', colors.dark, 'right');

  y += 20;

  // Separator line
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.4);
  doc.line(lm, y, lm + pageW, y);
  y += 5;

  // ── TITLE BAR ────────────────────────────────────────────────────────────
  doc.setFillColor(...colors.primary);
  doc.rect(lm, y, pageW, 8, 'F');
  txt('Loan Application Details', lm + 4, y + 5.5, 10.5, 'bold', colors.white);

  // Status badge (right side)
  const statusStr = fmt(loan.status).toUpperCase();
  txt(statusStr, rightX - 3, y + 5.5, 8, 'bold', colors.white, 'right');

  y += 11;

  // ── SECTIONS ─────────────────────────────────────────────────────────────
  const applicantAddress = [
    loan.current_address || loan.address || loan.customer_address,
    loan.landmark || loan.current_landmark || loan.customer_landmark,
  ].filter(Boolean).join(', ');

  const cityState = [
    loan.city || loan.current_city || loan.current_district,
    loan.state || loan.current_state,
  ].filter(Boolean).join(', ');

  const summaryStatus =
    loan.existing_loan_status || loan.loan_status ||
    loan.finance_status || loan.status || loan.application_stage;

  addSection('APPLICANT INFORMATION', [
    ['Applicant Name', loan.applicant_name || loan.customer_name],
    ['Mobile',         loan.mobile || loan.phone],
    ['Email',          loan.email || loan.customer_email || loan._lead_email],
    ['Address',        applicantAddress || '—'],
    ['City & State',   cityState || '—'],
    ['Pincode',        loan.pincode || loan.current_pincode || loan.customer_pincode],
  ]);

  addSection('VEHICLE DETAILS', [
    ['Reg. No',        loan.vehicle_number || loan.registration_number],
    ['Maker',          loan.maker_name || loan.car_make || loan.vehicle_make],
    ['Model/Variant',  loan.model_variant_name || loan.maker_model || loan.car_model || loan.vehicle_model || loan.variant],
    ['Chassis No',     loan.chassis_number],
    ['Engine No',      loan.engine_number],
    ['Fuel Type',      loan.fuel_type],
  ]);

  addSection('LOAN SUMMARY', [
    ['Loan App ID',          loan.loan_number || loan.id],
    ['Loan Amount Required', getCompactMoney(loan.loan_amount)],
    ['Loan Status',          summaryStatus],
    ['Tenure',               loan.tenure ? `${loan.tenure} months` : '—'],
    ['EMI Amount',           loan.emi ? getCompactMoney(loan.emi) : loan.existing_emi ? getCompactMoney(loan.existing_emi) : '—'],
    ['Case Type',            loan.case_type],
  ]);

  addSection('LENDER & CREATOR', [
    ['Lender',        loan.financier_name || loan.selected_financier || loan.bank_name],
    ['Branch',        loan.financier_branch_name],
    ['Sales Manager', loan.financier_executive_name],
    ['Area Manager',  loan.financier_area_manager_name],
    ['Prepared By',   loan.created_by_name || loan._hierarchy?.[0]?.name],
    ['Role',          loan._hierarchy?.[0]?.designation || 'Creator'],
  ]);

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = 280;
  doc.setDrawColor(...colors.line);
  doc.setLineWidth(0.25);
  doc.line(lm, footerY, lm + pageW, footerY);

  const genTime = new Date().toLocaleString('en-IN');
  txt(`Generated ${genTime}  •  Finonest India`, lm, footerY + 4.5, 6, 'normal', colors.gray);
  txt('System-generated document', rightX, footerY + 4.5, 6, 'normal', colors.gray, 'right');

  return doc.output('blob');
}

// ── Public API (unchanged signatures) ────────────────────────────────────────

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

export async function shareDocuments(docs: any[]) {
  try {
    if (!navigator.share) { toast.error('Sharing not available on this device'); return; }
    const shareableDocs = docs.filter(doc => !isGeneratedLoanPdf(doc));
    if (shareableDocs.length === 0) { toast.error('No documents to share'); return; }

    const loadingToast = toast.loading('Loading saved files for sharing...');
    const docFileObjs = await fetchDocumentFiles(shareableDocs);
    if (docFileObjs.length === 0) {
      toast.dismiss(loadingToast);
      toast.error('No documents could be prepared for sharing');
      return;
    }

    const imageFiles = docFileObjs.filter(d => d.file.type.startsWith('image/'));
    const pdfFiles   = docFileObjs.filter(d => d.file.type.includes('pdf'));
    toast.dismiss(loadingToast);

    try {
      const allFiles = docFileObjs.map(f => f.file);
      if (navigator.canShare) {
        if (await navigator.canShare({ files: allFiles })) {
          await navigator.share({ title: 'Loan Documents', text: `${docFileObjs.length} loan documents`, files: allFiles });
          toast.success(`Shared ${docFileObjs.length} documents!`);
          return;
        }
      }
      if (imageFiles.length > 0) {
        const imgList = imageFiles.map(f => f.file);
        if (!navigator.canShare || await navigator.canShare({ files: imgList })) {
          await navigator.share({ title: 'Loan Document Images', text: `${imageFiles.length} loan document images`, files: imgList });
          toast.success(`Shared ${imageFiles.length} document images!`);
          if (pdfFiles.length > 0) setTimeout(() => toast.info(`${pdfFiles.length} PDF documents may need separate sharing.`), 2000);
          return;
        }
      }
      if (pdfFiles.length > 0) {
        const pdfList = pdfFiles.map(f => f.file);
        if (!navigator.canShare || await navigator.canShare({ files: pdfList })) {
          await navigator.share({ title: 'Loan PDF Documents', text: `${pdfFiles.length} loan PDF documents`, files: pdfList });
          toast.success(`Shared ${pdfFiles.length} PDF documents!`);
          return;
        }
      }
      toast.error('Unable to share documents on this device');
    } catch (shareError: any) {
      if (shareError.name === 'AbortError') toast.info('Sharing cancelled');
      else toast.error('Failed to share documents: ' + shareError.message);
    }
  } catch (e) {
    console.error('Error preparing documents for sharing:', e);
    toast.error('Failed to prepare documents for sharing');
  }
}

export async function shareLoanMobile(loan: LoanData, docs: any[] = []) {
  try {
    if (!navigator.share) { toast.error('Sharing not available on this device'); return; }
    const loadingToast = toast.loading('Preparing documents for sharing...');
    const [hierarchy, docFileObjs] = await Promise.all([fetchHierarchy(loan), fetchDocumentFiles(docs)]);
    const loanH = { ...loan, _hierarchy: hierarchy.length > 0 ? hierarchy : undefined };
    const pdfBlob = await generatePDFBlobWithoutImages(loanH, docFileObjs);
    const pdfFile = new File([pdfBlob], `Loan-${loan.id}.pdf`, { type: 'application/pdf' });
    toast.dismiss(loadingToast);

    try {
      if (navigator.canShare && await navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({ title: `Loan Application - ${loan.id}`, text: `Loan application for ${loan.applicant_name || 'Customer'}\nID: ${loan.id}\nAmount: ₹${Number(loan.loan_amount || 0).toLocaleString()}`, files: [pdfFile] });
        toast.success('Shared PDF!');
        return;
      }
      await navigator.share({ title: `Loan Application - ${loan.id}`, text: `Loan application for ${loan.applicant_name || 'Customer'}\nID: ${loan.id}\nAmount: ₹${Number(loan.loan_amount || 0).toLocaleString()}` });
      toast.info('Shared loan details as text. Use Download PDF for the document file.');
    } catch (shareError: any) {
      if (shareError.name === 'AbortError') toast.info('Sharing cancelled');
      else toast.error('Failed to share: ' + shareError.message);
    }
  } catch (e) {
    console.error('Share error:', e);
    toast.error('Failed to load saved files for sharing');
  }
}

export async function shareLoanPDF(loan: LoanData, docs: any[] = []) {
  try {
    const bundle = await prepareLoanShareBundle(loan, docs);
    if (!navigator.share) { toast.error('Native sharing not supported on this device/browser'); return; }
    try {
      if (navigator.canShare && typeof navigator.canShare === 'function') {
        if (await navigator.canShare({ files: bundle.files })) {
          await navigator.share({ title: bundle.title, text: bundle.text, files: bundle.files });
          toast.success('Shared PDF!');
          return;
        }
      }
      if (!navigator.canShare || await navigator.canShare({ files: [bundle.files[0]] })) {
        await navigator.share({ title: `Loan Application - ${loan.id}`, text: `Loan application for ${loan.applicant_name || 'Customer'} (ID: ${loan.id}).`, files: [bundle.files[0]] });
        toast.success('Shared PDF!');
        return;
      }
      await navigator.share({ title: `Loan Application - ${loan.id}`, text: `Loan application details for ${loan.applicant_name || 'Customer'}\n\nID: ${loan.id}\nAmount: ₹${Number(loan.loan_amount || 0).toLocaleString()}\nStatus: ${loan.status || loan.application_stage}\n\nFinonest India Team` });
      toast.info('Shared loan details as text.');
    } catch (shareError: any) {
      if (shareError.name === 'AbortError') toast.info('Sharing cancelled by user');
      else toast.error('Failed to share: ' + shareError.message);
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
    files: docFileObjs.map(d => d.file),
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