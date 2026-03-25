import { formatCurrency } from '@/lib/mock-data';
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
  return formatCurrency(n);
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

function buildLoanHTML(loan: LoanData): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Loan Application - ${loan.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a2e; font-size: 10px; line-height: 1.4; padding: 10px; }
  
  .hdr-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-bottom: 2px solid #1a3a6b; padding-bottom: 6px; }
  .hdr-table td { vertical-align: middle; padding: 4px; }
  .company-logo { height: 35px; width: auto; }
  .company-name { font-size: 18px; font-weight: 800; color: #1a3a6b; }
  .company-sub { font-size: 9px; color: #666; }
  .hdr-right { text-align: right; }
  .hdr-lbl { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .hdr-val { font-size: 12px; font-weight: 700; color: #1a3a6b; }

  .title-bar { background: #1a3a6b; color: #fff; padding: 6px 12px; margin-bottom: 8px; }
  .title-bar table { width: 100%; }
  .title-bar td { color: #fff; }
  .title-bar .t-left { font-size: 13px; font-weight: 700; }
  .title-bar .t-right { text-align: right; font-size: 9px; font-weight: 600; text-transform: uppercase; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; }

  .data-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .data-table td { padding: 3px 5px; border: 1px solid #e0e4ea; vertical-align: top; }
  .data-table .lbl { font-size: 7px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; width: 9%; background: #f8f9fb; }
  .data-table .val { font-size: 10px; font-weight: 600; color: #1a1a2e; width: 16%; word-break: break-word; }
  .data-table .sec-title { font-size: 10px; font-weight: 700; color: #1a3a6b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #1a3a6b; background: #f0f4f8; padding: 5px; }

  .sig-table { width: 100%; margin-top: 25px; border-collapse: collapse; }
  .sig-table td { width: 33%; text-align: center; padding-top: 40px; border-top: 1px solid #333; font-size: 9px; color: #555; }

  .footer-table { width: 100%; margin-top: 12px; border-top: 1.5px solid #e8ecf1; padding-top: 6px; }
  .footer-table td { font-size: 8px; color: #999; padding: 2px; }
</style></head><body>

<table class="hdr-table">
  <tr>
    <td style="width:70%">
      <img src="${PDF_LOGO_PATH}" alt="Finonest India" class="company-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
      <div style="display:none;">
        <span class="company-name">Finonest India</span><br/>
        <span class="company-sub">Vehicle Loan Solutions &bull; Since 2015</span>
      </div>
    </td>
    <td class="hdr-right">
      <span class="hdr-lbl">Application ID</span><br/>
      <span class="hdr-val">${loan.id}</span><br/>
      <span class="hdr-lbl">Date</span><br/>
      <span class="hdr-val" style="font-size:11px">${new Date().toLocaleDateString('en-IN')}</span>
    </td>
  </tr>
</table>

<div class="title-bar">
  <table><tr>
    <td class="t-left">Loan Application Details</td>
    <td><span class="t-right">${fmt(loan.status)}</span></td>
  </tr></table>
</div>

<table class="data-table">
  ${sectionTitle('&#128100;', 'Applicant Information')}
  ${row4('LoanApp ID', fmt(loan.loan_number || loan.id), 'Applicant Name', fmt(loan.applicant_name || loan.customer_name), 'Mobile', fmt(loan.mobile || loan.phone), 'Email', fmt(loan.email || loan._lead_email || loan.customer_email))}
  ${row4('Co-Applicant', fmt(loan.co_applicant_name), 'Co-App Mobile', fmt(loan.co_applicant_mobile), 'Guarantor', fmt(loan.guarantor_name), 'Guarantor Mobile', fmt(loan.guarantor_mobile))}
  <tr>
    <td class="lbl">Address</td><td class="val" colspan="3">${fmt(loan.current_address || loan.address || loan.customer_address)}</td>
    <td class="lbl">Landmark</td><td class="val">${fmt(loan.landmark || loan.current_landmark || loan.customer_landmark)}</td>
    <td class="lbl">City & State</td><td class="val">${fmt((loan.city || loan.current_city || loan.current_district || '') + (loan.state || loan.current_state ? ', ' + (loan.state || loan.current_state) : ''))}</td>
  </tr>
  <tr>
    <td class="lbl">Pincode</td><td class="val">${fmt(loan.pincode || loan.current_pincode || loan.customer_pincode)}</td>
    <td class="lbl"></td><td class="val"></td>
    <td class="lbl"></td><td class="val"></td>
    <td class="lbl"></td><td class="val"></td>
  </tr>

  ${sectionTitle('&#128663;', 'Vehicle Details')}
  ${row4('Reg. No', fmt(loan.vehicle_number || loan.registration_number), 'Maker', fmt(loan.maker_name || loan.car_make || loan.vehicle_make), 'Model/Variant', fmt(loan.model_variant_name || loan.maker_model || loan.car_model || loan.vehicle_model || loan.variant), 'Engine Number', fmt(loan.engine_number))}
  ${row4('Chassis Number', fmt(loan.chassis_number), 'Owner Name', fmt(loan.owner_name || loan.rc_owner_name), 'Fuel Type', fmt(loan.fuel_type), 'Mfg Date', formatDate(loan.manufacturing_date || loan.mfg_date))}
  ${row4('Ownership Type', fmt(loan.ownership_type), 'Financer', fmt(loan.financer || loan.existing_financier), 'Finance Status', fmt(loan.finance_status), 'Insurance Company', fmt(loan.insurance_company))}
  ${row4('Insurance Valid Upto', formatDate(loan.insurance_valid_upto || loan.insurance_expiry), 'PUCC Valid Upto', formatDate(loan.pucc_valid_upto || loan.pucc_expiry), 'Case Type', fmt(loan.case_type), '', '')}

  ${sectionTitle('&#128176;', 'Existing Loan & EMI Details')}
  ${row4('Loan Status', fmt(loan.existing_loan_status || loan.loan_status || loan.finance_status), 'Loan Amount', loan.existing_loan_status === 'Active' ? fmtCur(loan.existing_loan_amount) : '—', 'Tenure', loan.existing_loan_status === 'Active' && (loan.existing_tenure || loan.tenure) ? (loan.existing_tenure || loan.tenure) + ' months' : '—', 'EMI Amount', loan.existing_loan_status === 'Active' ? fmtCur(loan.existing_emi || loan.emi_amount || loan.emi) : '—')}
  ${loan.existing_loan_status === 'Active' ? row4('No of EMI Paid', fmt(loan.no_of_emi_paid || 0), 'Total Interest', fmtCur(loan.total_interest || 0), 'Bouncing in Last 3M', fmt(loan.bouncing_3_months || 0), 'Bouncing in Last 6M', fmt(loan.bouncing_6_months || 0)) : ''}
  ${row4('Financier Name', fmt(loan.rto_financier_name || loan.financer), '', '', '', '', '', '')}

  ${(() => {
    const profFields: [string, string][] = [];
    if (loan.income_source) profFields.push(['Income Source', fmt(loan.income_source)]);
    if (loan.monthly_income || loan.net_monthly_salary) profFields.push(['Monthly Income', loan.monthly_income ? fmtCur(loan.monthly_income) : fmtCur(loan.net_monthly_salary)]);
    if (loan.company_name) profFields.push(['Company Name', fmt(loan.company_name)]);
    if (loan.designation) profFields.push(['Designation', fmt(loan.designation)]);
    if (loan.current_job_years) profFields.push(['Current Job (Yrs)', fmt(loan.current_job_years)]);
    if (loan.total_work_exp || loan.work_experience) profFields.push(['Total Work Exp (Yrs)', fmt(loan.total_work_exp || loan.work_experience)]);
    if (loan.salary_credit_mode) profFields.push(['Salary Credit Mode', fmt(loan.salary_credit_mode.replace(/_/g, ' '))]);
    if (loan.salary_slip_available != null) profFields.push(['Salary Slip', loan.salary_slip_available ? 'Available' : 'Not Available']);
    if (loan.business_name) profFields.push(['Business Name', fmt(loan.business_name)]);
    if (loan.business_type) profFields.push(['Business Type', fmt(loan.business_type)]);
    if (loan.business_vintage) profFields.push(['Business Vintage (Yrs)', fmt(loan.business_vintage)]);
    if (loan.annual_income_itr) profFields.push(['Annual Income (ITR)', fmtCur(loan.annual_income_itr)]);
    if (loan.itr_available != null) profFields.push(['ITR Available', loan.itr_available ? 'Yes' : 'No']);
    if (loan.professional_subtype) profFields.push(['Professional Sub Type', fmt(loan.professional_subtype)]);
    if (loan.practice_experience) profFields.push(['Practice Exp (Yrs)', fmt(loan.practice_experience)]);
    if (loan.freelancer_subtype) profFields.push(['Freelancer Type', fmt(loan.freelancer_subtype)]);
    if (profFields.length === 0) return '';
    while (profFields.length % 4 !== 0) profFields.push(['', '']);
    return sectionTitle('&#128188;', 'Professional Details') + profFields.reduce((acc, _, i) => {
      if (i % 4 === 0) acc += row4(profFields[i]?.[0]||'', profFields[i]?.[1]||'', profFields[i+1]?.[0]||'', profFields[i+1]?.[1]||'', profFields[i+2]?.[0]||'', profFields[i+2]?.[1]||'', profFields[i+3]?.[0]||'', profFields[i+3]?.[1]||'');
      return acc;
    }, '');
  })()}

  ${sectionTitle('&#127974;', 'Lender Details')}
  ${row4('Lender', fmt(loan.financier_name || loan.selected_financier || loan.bank_name), 'Branch', fmt(loan.financier_branch_name), 'Sales Manager', fmt(loan.financier_executive_name), 'SM Mobile', fmt(loan.financier_executive_mobile))}
  ${row4('Area Manager', fmt(loan.financier_area_manager_name), 'AM Mobile', fmt(loan.financier_area_manager_mobile), 'Loan Amount Required', fmtCur(loan.loan_amount), 'Case Type', fmt(loan.case_type))}

  ${loan.application_stage === 'APPROVED' || loan.application_stage === 'DISBURSED' || loan.application_stage === 'CANCELLED' || loan.status === 'approved' || loan.status === 'disbursed' || loan.status === 'cancelled' ? `
  ${sectionTitle('&#128203;', 'Deductions & Disbursement')}
  ${row4('File Charge', fmtCur(loan.file_charge), 'Loan Suraksha', fmtCur(loan.loan_suraksha), 'Stamping', fmtCur(loan.stamping), 'Processing Fee', fmtCur(loan.processing_fee))}
  ${row4('Total Deduction', fmtCur(loan.total_deduction), 'Net Disbursement', fmtCur(loan.net_disbursement_amount), 'Payment Recd.', formatDate(loan.payment_received_date), 'Disburse Date', formatDate(loan.financier_disburse_date))}
  ` : ''}
</table>

<div style="margin-top: 20px;">
  <h3 style="font-size: 12px; font-weight: bold; color: #1a3a6b; margin-bottom: 10px;">REFERENCES</h3>
</div>

<table class="sig-table">
  <tr>
    ${(() => {
      const refs = loan._hierarchy || [
        { name: loan.created_by_name || '—', designation: 'Creator' }
      ];
      const w = Math.floor(100 / refs.length);
      return refs.map((ref: any) => `
        <td style="padding-top:20px;width:${w}%;text-align:center;border-top:1px solid #333;font-size:9px;color:#555;">
          <div style="font-size:10px;font-weight:bold;color:#1a1a2e;margin-bottom:5px;">${ref.name}</div>
          <div style="margin-top:5px;">${ref.designation}</div>
        </td>`).join('');
    })()}
  </tr>
</table>

<table class="footer-table">
  <tr>
    <td>Generated on ${new Date().toLocaleString('en-IN')} &bull; Finonest India</td>
    <td style="text-align:right">This is a system-generated document</td>
  </tr>
</table>

</body></html>`;
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

function generatePDFBlobWithoutImages(loan: LoanData, docFiles: { file: File; name: string; docType: string }[] = []): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pw = 190;
      const lm = 10;
      let y = 12;

      const colors = { primary: [26, 58, 107] as [number, number, number], dark: [26, 26, 46] as [number, number, number], gray: [136, 136, 136] as [number, number, number], light: [232, 236, 241] as [number, number, number], white: [255, 255, 255] as [number, number, number] };

      // Try to load and add logo
      try {
        const logoBase64 = await loadImageAsBase64(PDF_LOGO_PATH);
        doc.addImage(logoBase64, 'PNG', lm, y - 2, 40, 12); // x, y, width, height
      } catch (logoError) {
        console.warn('Could not load logo, using text fallback:', logoError);
        // Fallback to text if logo fails
        doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
        doc.text('Finonest India', lm, y);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
        doc.text('Vehicle Loan Solutions • Since 2015', lm, y + 5);
      }

      doc.setFontSize(7); doc.setTextColor(...colors.gray);
      doc.text('Application ID', lm + pw, y - 4, { align: 'right' });
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
      doc.text(String(loan.id || ''), lm + pw, y + 1, { align: 'right' });
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
      doc.text('Date', lm + pw, y + 5, { align: 'right' });
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
      doc.text(new Date().toLocaleDateString('en-IN'), lm + pw, y + 10, { align: 'right' });

      y += 14;
      doc.setDrawColor(...colors.primary); doc.setLineWidth(0.5); doc.line(lm, y, lm + pw, y);
      y += 6;

  // Title bar
  doc.setFillColor(...colors.primary); doc.rect(lm, y, pw, 8, 'F');
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.white);
  doc.text('Loan Application Details', lm + 4, y + 5.5);
  doc.setFontSize(8); doc.text(fmt(loan.status).toUpperCase(), lm + pw - 4, y + 5.5, { align: 'right' });
  y += 12;

  // Helper to draw a cleaner two-card section
  function drawSection(title: string, fields: [string, string][]) {
    const sectionHeader = () => {
      if (y + 12 > 280) { doc.addPage(); y = 12; }
      doc.setFillColor(237, 243, 250);
      doc.rect(lm, y, pw, 8, 'F');
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.35);
      doc.line(lm, y + 8, lm + pw, y + 8);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(title, lm + 2, y + 5.3);
      y += 11;
    };

    const cardGap = 4;
    const cardW = (pw - cardGap) / 2;
    const minCardH = 16;
    sectionHeader();

    for (let i = 0; i < fields.length; i += 2) {
      const rowFields = fields.slice(i, i + 2);
      const rowHeights = rowFields.map((field) => {
        if (!field || !field[1]) return minCardH;
        const lines = doc.splitTextToSize(field[1], cardW - 6);
        return Math.max(minCardH, 9 + lines.length * 4.2);
      });
      const rowHeight = Math.max(...rowHeights, minCardH);

      if (y + rowHeight > 280) {
        doc.addPage();
        y = 12;
        sectionHeader();
      }

      for (let j = 0; j < 2; j++) {
        const x = lm + j * (cardW + cardGap);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.roundedRect(x, y, cardW, rowHeight, 2, 2, 'FD');
        doc.setFillColor(...colors.primary);
        doc.rect(x, y, 1.5, rowHeight, 'F');

        if (rowFields[j]) {
          const [label, value] = rowFields[j];
          doc.setFontSize(5.8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.gray);
          doc.text(label, x + 3, y + 4.5);

          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.dark);
          const lines = doc.splitTextToSize(value, cardW - 6);
          lines.forEach((line: string, lineIndex: number) => {
            doc.text(line, x + 3, y + 9 + (lineIndex * 4));
          });
        }
      }

      y += rowHeight + 4;
    }
  }

  drawSection('APPLICANT INFORMATION', [
    ['LoanApp ID', fmt(loan.loan_number || loan.id)], ['Applicant Name', fmt(loan.applicant_name || loan.customer_name)], ['Mobile', fmt(loan.mobile || loan.phone)], ['Email', fmt(loan.email || loan._lead_email || loan.customer_email)],
    ['Co-Applicant', fmt(loan.co_applicant_name)], ['Co-App Mobile', fmt(loan.co_applicant_mobile)], ['Guarantor', fmt(loan.guarantor_name)], ['Guarantor Mobile', fmt(loan.guarantor_mobile)],
    ['Address', fmt(loan.current_address || loan.address || loan.customer_address)], ['Landmark', fmt(loan.landmark || loan.current_landmark || loan.customer_landmark)], ['City & State', fmt((loan.city || loan.current_city || loan.current_district || '') + (loan.state || loan.current_state ? ', ' + (loan.state || loan.current_state) : ''))], ['Pincode', fmt(loan.pincode || loan.current_pincode || loan.customer_pincode)],
  ]);

  drawSection('VEHICLE DETAILS', [
    ['Reg. No', fmt(loan.vehicle_number || loan.registration_number)], ['Maker', fmt(loan.maker_name || loan.car_make || loan.vehicle_make)], ['Model/Variant', fmt(loan.model_variant_name || loan.maker_model || loan.car_model || loan.vehicle_model || loan.variant)], ['Engine Number', fmt(loan.engine_number)],
    ['Chassis Number', fmt(loan.chassis_number)], ['Owner Name', fmt(loan.owner_name || loan.rc_owner_name)], ['Fuel Type', fmt(loan.fuel_type)], ['Mfg Date', formatDate(loan.manufacturing_date || loan.mfg_date)],
    ['Ownership Type', fmt(loan.ownership_type)], ['Financer', fmt(loan.financer || loan.existing_financier)], ['Finance Status', fmt(loan.finance_status)], ['Insurance Company', fmt(loan.insurance_company)],
    ['Insurance Valid Upto', formatDate(loan.insurance_valid_upto || loan.insurance_expiry)], ['PUCC Valid Upto', formatDate(loan.pucc_valid_upto || loan.pucc_expiry)], ['Case Type', fmt(loan.case_type)], ['', ''],
  ]);

  drawSection('EXISTING LOAN & EMI DETAILS', [
    ['Loan Status', fmt(loan.existing_loan_status || loan.loan_status || loan.finance_status)], ['Loan Amount', loan.existing_loan_status === 'Active' ? fmtCur(loan.existing_loan_amount) : '—'], ['Tenure', loan.existing_loan_status === 'Active' && (loan.existing_tenure || loan.tenure) ? (loan.existing_tenure || loan.tenure) + ' months' : '—'], ['EMI Amount', loan.existing_loan_status === 'Active' ? fmtCur(loan.existing_emi || loan.emi_amount || loan.emi) : '—'],
    ...(loan.existing_loan_status === 'Active' ? [
      ['No of EMI Paid', fmt(loan.no_of_emi_paid || 0)], ['Total Interest', fmtCur(loan.total_interest || 0)], ['Bouncing in Last 3M', fmt(loan.bouncing_3_months ?? loan.bouncing_last_3m ?? 0)], ['Bouncing in Last 6M', fmt(loan.bouncing_6_months ?? loan.bouncing_last_6m ?? 0)],
      ['Financier Name', fmt(loan.financer || loan.rto_financier_name)], ['', ''], ['', ''], ['', ''],
    ] as [string,string][] : [['Financier Name', fmt(loan.financer || loan.rto_financier_name)], ['', ''], ['', ''], ['', '']] as [string,string][]),
  ]);

  const profFields: [string, string][] = [];
  if (loan.income_source) profFields.push(['Income Source', fmt(loan.income_source)]);
  if (loan.monthly_income || loan.net_monthly_salary) profFields.push(['Monthly Income', loan.monthly_income ? fmtCur(loan.monthly_income) : fmtCur(loan.net_monthly_salary)]);
  if (loan.company_name) profFields.push(['Company Name', fmt(loan.company_name)]);
  if (loan.designation) profFields.push(['Designation', fmt(loan.designation)]);
  if (loan.current_job_years) profFields.push(['Current Job (Yrs)', fmt(loan.current_job_years)]);
  if (loan.total_work_exp || loan.work_experience) profFields.push(['Total Work Exp (Yrs)', fmt(loan.total_work_exp || loan.work_experience)]);
  if (loan.salary_credit_mode) profFields.push(['Salary Credit Mode', fmt(loan.salary_credit_mode.replace(/_/g, ' '))]);
  if (loan.salary_slip_available != null) profFields.push(['Salary Slip', loan.salary_slip_available ? 'Available' : 'Not Available']);
  if (loan.business_name) profFields.push(['Business Name', fmt(loan.business_name)]);
  if (loan.business_type) profFields.push(['Business Type', fmt(loan.business_type)]);
  if (loan.business_vintage) profFields.push(['Business Vintage (Yrs)', fmt(loan.business_vintage)]);
  if (loan.annual_income_itr) profFields.push(['Annual Income (ITR)', fmtCur(loan.annual_income_itr)]);
  if (loan.itr_available != null) profFields.push(['ITR Available', loan.itr_available ? 'Yes' : 'No']);
  if (loan.professional_subtype) profFields.push(['Professional Sub Type', fmt(loan.professional_subtype)]);
  if (loan.practice_experience) profFields.push(['Practice Exp (Yrs)', fmt(loan.practice_experience)]);
  if (loan.freelancer_subtype) profFields.push(['Freelancer Type', fmt(loan.freelancer_subtype)]);
  if (profFields.length > 0) {
    while (profFields.length % 4 !== 0) profFields.push(['', '']);
    drawSection('PROFESSIONAL DETAILS', profFields as [string, string][]);
  }

  drawSection('LENDER DETAILS', [
    ['Lender', fmt(loan.financier_name || loan.selected_financier || loan.bank_name)], ['Branch', fmt(loan.financier_branch_name)], ['Sales Manager', fmt(loan.financier_executive_name)], ['SM Mobile', fmt(loan.financier_executive_mobile)],
    ['Area Manager', fmt(loan.financier_area_manager_name)], ['AM Mobile', fmt(loan.financier_area_manager_mobile)], ['Loan Amount Required', fmtCur(loan.loan_amount)], ['Case Type', fmt(loan.case_type)],
  ]);

  // Only show Deductions & Disbursement section for approved/disbursed/cancelled loans
  const showDisbursementSection = loan.application_stage === 'APPROVED' || 
                                  loan.application_stage === 'DISBURSED' || 
                                  loan.application_stage === 'CANCELLED' ||
                                  loan.status === 'approved' ||
                                  loan.status === 'disbursed' ||
                                  loan.status === 'cancelled';

  if (showDisbursementSection) {
    drawSection('DEDUCTIONS & DISBURSEMENT', [
      ['File Charge', fmtCur(loan.file_charge)], ['Loan Suraksha', fmtCur(loan.loan_suraksha)], ['Stamping', fmtCur(loan.stamping)], ['Processing Fee', fmtCur(loan.processing_fee)],
      ['Total Deduction', fmtCur(loan.total_deduction)], ['Net Disbursement', fmtCur(loan.net_disbursement_amount)], ['Payment Recd.', formatDate(loan.payment_received_date)], ['Disburse Date', formatDate(loan.disbursement_date || loan.financier_disburse_date)],
    ]);
  }

  // Add document list (without embedding images)
  if (docFiles.length > 0) {
    if (y + 25 > 280) { doc.addPage(); y = 12; }
    
    doc.setFillColor(240, 244, 248); doc.rect(lm, y, pw, 6, 'F');
    doc.setDrawColor(...colors.primary); doc.setLineWidth(0.4); doc.line(lm, y + 6, lm + pw, y + 6);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
    doc.text('UPLOADED DOCUMENTS', lm + 2, y + 4.2);
    y += 10;
    
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.dark);
    docFiles.forEach((docFile, index) => {
      if (y > 280) { doc.addPage(); y = 12; }
      const status = docFile.file.type.startsWith('image/') ? '(Attached as separate file)' : '(PDF document)';
      doc.text(`${index + 1}. ${docFile.docType} - ${docFile.name} ${status}`, lm + 2, y);
      y += 4;
    });
    y += 4;
  }

  // Signature area - References section
  if (y + 35 > 280) { doc.addPage(); y = 12; }
  y += 8;
  
  // References title
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
  doc.text('REFERENCES', lm, y);
  y += 8;
  
  const refData: { name: string; designation: string }[] = loan._hierarchy || [
    { name: fmt(loan.created_by_name), designation: 'Creator' }
  ];
  const sigWFinal = pw / refData.length;
  refData.forEach((ref, i) => {
    const x = lm + i * sigWFinal + sigWFinal / 2;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.dark);
    doc.text(ref.name, x, y + 10, { align: 'center' });
    doc.setDrawColor(51, 51, 51); doc.setLineWidth(0.3);
    doc.line(lm + i * sigWFinal + 5, y + 15, lm + (i + 1) * sigWFinal - 5, y + 15);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(85, 85, 85);
    doc.text(ref.designation, x, y + 19, { align: 'center' });
  });
  y += 24;

  // Footer
  doc.setDrawColor(...colors.light); doc.setLineWidth(0.3); doc.line(lm, y, lm + pw, y);
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')} • Finonest India`, lm, y + 4);
  doc.text('This is a system-generated document', lm + pw, y + 4, { align: 'right' });

  resolve(doc.output('blob'));
    } catch (error) {
      reject(error);
    }
  });
}

export async function buildLoanApplicationPdfBlob(loan: LoanData): Promise<Blob> {
  return generatePDFBlobWithoutImages(loan, []);
}

function generatePDFBlob(loan: LoanData, docFiles: { file: File; name: string; docType: string }[] = []): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pw = 190;
      const lm = 10;
      let y = 12;

      const colors = { primary: [26, 58, 107] as [number, number, number], dark: [26, 26, 46] as [number, number, number], gray: [136, 136, 136] as [number, number, number], light: [232, 236, 241] as [number, number, number], white: [255, 255, 255] as [number, number, number] };

      // Try to load and add logo
      try {
        const logoBase64 = await loadImageAsBase64(PDF_LOGO_PATH);
        doc.addImage(logoBase64, 'PNG', lm, y - 2, 40, 12); // x, y, width, height
      } catch (logoError) {
        console.warn('Could not load logo, using text fallback:', logoError);
        // Fallback to text if logo fails
        doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
        doc.text('Finonest India', lm, y);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
        doc.text('Vehicle Loan Solutions • Since 2015', lm, y + 5);
      }

      doc.setFontSize(7); doc.setTextColor(...colors.gray);
      doc.text('Application ID', lm + pw, y - 4, { align: 'right' });
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
      doc.text(String(loan.id || ''), lm + pw, y + 1, { align: 'right' });
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
      doc.text('Date', lm + pw, y + 5, { align: 'right' });
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
      doc.text(new Date().toLocaleDateString('en-IN'), lm + pw, y + 10, { align: 'right' });

      y += 14;
      doc.setDrawColor(...colors.primary); doc.setLineWidth(0.5); doc.line(lm, y, lm + pw, y);
      y += 6;

  // Title bar
  doc.setFillColor(...colors.primary); doc.rect(lm, y, pw, 8, 'F');
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.white);
  doc.text('Loan Application Details', lm + 4, y + 5.5);
  doc.setFontSize(8); doc.text(fmt(loan.status).toUpperCase(), lm + pw - 4, y + 5.5, { align: 'right' });
  y += 12;

  // Helper to draw a cleaner two-card section
  function drawSection(title: string, fields: [string, string][]) {
    const sectionHeader = () => {
      if (y + 12 > 280) { doc.addPage(); y = 12; }
      doc.setFillColor(237, 243, 250);
      doc.rect(lm, y, pw, 8, 'F');
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.35);
      doc.line(lm, y + 8, lm + pw, y + 8);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(title, lm + 2, y + 5.3);
      y += 11;
    };

    const cardGap = 4;
    const cardW = (pw - cardGap) / 2;
    const minCardH = 16;
    sectionHeader();

    for (let i = 0; i < fields.length; i += 2) {
      const rowFields = fields.slice(i, i + 2);
      const rowHeights = rowFields.map((field) => {
        if (!field || !field[1]) return minCardH;
        const lines = doc.splitTextToSize(field[1], cardW - 6);
        return Math.max(minCardH, 9 + lines.length * 4.2);
      });
      const rowHeight = Math.max(...rowHeights, minCardH);

      if (y + rowHeight > 280) {
        doc.addPage();
        y = 12;
        sectionHeader();
      }

      for (let j = 0; j < 2; j++) {
        const x = lm + j * (cardW + cardGap);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.roundedRect(x, y, cardW, rowHeight, 2, 2, 'FD');
        doc.setFillColor(...colors.primary);
        doc.rect(x, y, 1.5, rowHeight, 'F');

        if (rowFields[j]) {
          const [label, value] = rowFields[j];
          doc.setFontSize(5.8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.gray);
          doc.text(label, x + 3, y + 4.5);

          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.dark);
          const lines = doc.splitTextToSize(value, cardW - 6);
          lines.forEach((line: string, lineIndex: number) => {
            doc.text(line, x + 3, y + 9 + (lineIndex * 4));
          });
        }
      }

      y += rowHeight + 4;
    }
  }

  drawSection('APPLICANT INFORMATION', [
    ['LoanApp ID', fmt(loan.loan_number || loan.id)], ['Applicant Name', fmt(loan.applicant_name || loan.customer_name)], ['Mobile', fmt(loan.mobile || loan.phone)], ['Email', fmt(loan.email || loan._lead_email || loan.customer_email)],
    ['Co-Applicant', fmt(loan.co_applicant_name)], ['Co-App Mobile', fmt(loan.co_applicant_mobile)], ['Guarantor', fmt(loan.guarantor_name)], ['Guarantor Mobile', fmt(loan.guarantor_mobile)],
    ['Address', fmt(loan.current_address || loan.address || loan.customer_address)], ['Landmark', fmt(loan.landmark || loan.current_landmark || loan.customer_landmark)], ['City & State', fmt((loan.city || loan.current_city || loan.current_district || '') + (loan.state || loan.current_state ? ', ' + (loan.state || loan.current_state) : ''))], ['Pincode', fmt(loan.pincode || loan.current_pincode || loan.customer_pincode)],
  ]);

  drawSection('VEHICLE DETAILS', [
    ['Reg. No', fmt(loan.vehicle_number || loan.registration_number)], ['Maker', fmt(loan.maker_name || loan.car_make || loan.vehicle_make)], ['Model/Variant', fmt(loan.model_variant_name || loan.maker_model || loan.car_model || loan.vehicle_model || loan.variant)], ['Engine Number', fmt(loan.engine_number)],
    ['Chassis Number', fmt(loan.chassis_number)], ['Owner Name', fmt(loan.owner_name || loan.rc_owner_name)], ['Fuel Type', fmt(loan.fuel_type)], ['Mfg Date', formatDate(loan.manufacturing_date || loan.mfg_date)],
    ['Ownership Type', fmt(loan.ownership_type)], ['Financer', fmt(loan.financer || loan.existing_financier)], ['Finance Status', fmt(loan.finance_status)], ['Insurance Company', fmt(loan.insurance_company)],
    ['Insurance Valid Upto', formatDate(loan.insurance_valid_upto || loan.insurance_expiry)], ['PUCC Valid Upto', formatDate(loan.pucc_valid_upto || loan.pucc_expiry)], ['Case Type', fmt(loan.case_type)], ['', ''],
  ]);

  drawSection('EXISTING LOAN & EMI DETAILS', [
    ['Loan Status', fmt(loan.existing_loan_status || loan.loan_status || loan.finance_status)], ['Loan Amount', loan.existing_loan_status === 'Active' ? fmtCur(loan.existing_loan_amount) : '—'], ['Tenure', loan.existing_loan_status === 'Active' && (loan.existing_tenure || loan.tenure) ? (loan.existing_tenure || loan.tenure) + ' months' : '—'], ['EMI Amount', loan.existing_loan_status === 'Active' ? fmtCur(loan.existing_emi || loan.emi_amount || loan.emi) : '—'],
    ...(loan.existing_loan_status === 'Active' ? [
      ['No of EMI Paid', fmt(loan.no_of_emi_paid || 0)], ['Total Interest', fmtCur(loan.total_interest || 0)], ['Bouncing in Last 3M', fmt(loan.bouncing_3_months ?? loan.bouncing_last_3m ?? 0)], ['Bouncing in Last 6M', fmt(loan.bouncing_6_months ?? loan.bouncing_last_6m ?? 0)],
      ['Financier Name', fmt(loan.financer || loan.rto_financier_name)], ['', ''], ['', ''], ['', ''],
    ] as [string,string][] : [['Financier Name', fmt(loan.financer || loan.rto_financier_name)], ['', ''], ['', ''], ['', '']] as [string,string][]),
  ]);

  const profFields: [string, string][] = [];
  if (loan.income_source) profFields.push(['Income Source', fmt(loan.income_source)]);
  if (loan.monthly_income || loan.net_monthly_salary) profFields.push(['Monthly Income', loan.monthly_income ? fmtCur(loan.monthly_income) : fmtCur(loan.net_monthly_salary)]);
  if (loan.company_name) profFields.push(['Company Name', fmt(loan.company_name)]);
  if (loan.designation) profFields.push(['Designation', fmt(loan.designation)]);
  if (loan.current_job_years) profFields.push(['Current Job (Yrs)', fmt(loan.current_job_years)]);
  if (loan.total_work_exp || loan.work_experience) profFields.push(['Total Work Exp (Yrs)', fmt(loan.total_work_exp || loan.work_experience)]);
  if (loan.salary_credit_mode) profFields.push(['Salary Credit Mode', fmt(loan.salary_credit_mode.replace(/_/g, ' '))]);
  if (loan.salary_slip_available != null) profFields.push(['Salary Slip', loan.salary_slip_available ? 'Available' : 'Not Available']);
  if (loan.business_name) profFields.push(['Business Name', fmt(loan.business_name)]);
  if (loan.business_type) profFields.push(['Business Type', fmt(loan.business_type)]);
  if (loan.business_vintage) profFields.push(['Business Vintage (Yrs)', fmt(loan.business_vintage)]);
  if (loan.annual_income_itr) profFields.push(['Annual Income (ITR)', fmtCur(loan.annual_income_itr)]);
  if (loan.itr_available != null) profFields.push(['ITR Available', loan.itr_available ? 'Yes' : 'No']);
  if (loan.professional_subtype) profFields.push(['Professional Sub Type', fmt(loan.professional_subtype)]);
  if (loan.practice_experience) profFields.push(['Practice Exp (Yrs)', fmt(loan.practice_experience)]);
  if (loan.freelancer_subtype) profFields.push(['Freelancer Type', fmt(loan.freelancer_subtype)]);
  if (profFields.length > 0) {
    while (profFields.length % 4 !== 0) profFields.push(['', '']);
    drawSection('PROFESSIONAL DETAILS', profFields as [string, string][]);
  }

  drawSection('LENDER DETAILS', [
    ['Lender', fmt(loan.financier_name || loan.selected_financier || loan.bank_name)], ['Branch', fmt(loan.financier_branch_name)], ['Sales Manager', fmt(loan.financier_executive_name)], ['SM Mobile', fmt(loan.financier_executive_mobile)],
    ['Area Manager', fmt(loan.financier_area_manager_name)], ['AM Mobile', fmt(loan.financier_area_manager_mobile)], ['Loan Amount Required', fmtCur(loan.loan_amount)], ['Case Type', fmt(loan.case_type)],
  ]);

  // Only show Deductions & Disbursement section for approved/disbursed/cancelled loans
  const showDisbursementSection = loan.application_stage === 'APPROVED' || 
                                  loan.application_stage === 'DISBURSED' || 
                                  loan.application_stage === 'CANCELLED' ||
                                  loan.status === 'approved' ||
                                  loan.status === 'disbursed' ||
                                  loan.status === 'cancelled';

  if (showDisbursementSection) {
    drawSection('DEDUCTIONS & DISBURSEMENT', [
      ['File Charge', fmtCur(loan.file_charge)], ['Loan Suraksha', fmtCur(loan.loan_suraksha)], ['Stamping', fmtCur(loan.stamping)], ['Processing Fee', fmtCur(loan.processing_fee)],
      ['Total Deduction', fmtCur(loan.total_deduction)], ['Net Disbursement', fmtCur(loan.net_disbursement_amount)], ['Payment Recd.', formatDate(loan.payment_received_date)], ['Disburse Date', formatDate(loan.disbursement_date || loan.financier_disburse_date)],
    ]);
  }

  // Signature area - References section
  if (y + 35 > 280) { doc.addPage(); y = 12; }
  y += 8;
  
  // References title
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
  doc.text('REFERENCES', lm, y);
  y += 8;
  
  const refData: { name: string; designation: string }[] = loan._hierarchy || [
    { name: fmt(loan.created_by_name), designation: 'Creator' }
  ];
  const sigWFinal = pw / refData.length;
  refData.forEach((ref, i) => {
    const x = lm + i * sigWFinal + sigWFinal / 2;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.dark);
    doc.text(ref.name, x, y + 10, { align: 'center' });
    doc.setDrawColor(51, 51, 51); doc.setLineWidth(0.3);
    doc.line(lm + i * sigWFinal + 5, y + 15, lm + (i + 1) * sigWFinal - 5, y + 15);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(85, 85, 85);
    doc.text(ref.designation, x, y + 19, { align: 'center' });
  });
  y += 24;

  // Footer
  doc.setDrawColor(...colors.light); doc.setLineWidth(0.3); doc.line(lm, y, lm + pw, y);
  doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')} • Finonest India`, lm, y + 4);
  doc.text('This is a system-generated document', lm + pw, y + 4, { align: 'right' });

  // Embed documents as pages
  if (docFiles.length > 0) {
    for (const docFile of docFiles) {
      try {
        const fileType = docFile.file.type;

        if (fileType === 'application/pdf') {
          doc.addPage();
          doc.setFillColor(248, 249, 251);
          doc.rect(0, 0, 210, 297, 'F');
          doc.setFillColor(...colors.primary);
          doc.rect(0, 0, 210, 14, 'F');
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
          doc.text(docFile.docType, 105, 9, { align: 'center' });
          doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
          doc.text(docFile.name, 105, 150, { align: 'center' });
          doc.setFontSize(8);
          doc.text('(PDF document attached separately)', 105, 160, { align: 'center' });
        } else if (fileType.startsWith('image/')) {
          doc.addPage();
          doc.setFillColor(...colors.primary);
          doc.rect(0, 0, 210, 14, 'F');
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
          doc.text(docFile.docType, 105, 9, { align: 'center' });

          const imgFormat = fileType === 'image/png' ? 'PNG' : 'JPEG';
          // Safe base64 conversion for large files
          const arrayBuffer = await docFile.file.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let c = 0; c < uint8.length; c += chunkSize) {
            binary += String.fromCharCode(...uint8.subarray(c, c + chunkSize));
          }
          const imgData = `data:${fileType};base64,${btoa(binary)}`;

          const imgEl = await new Promise<HTMLImageElement>((res) => {
            const i = new Image();
            i.onload = () => res(i);
            i.src = imgData;
          });
          const maxW = 190; const maxH = 265;
          let imgW = imgEl.naturalWidth; let imgH = imgEl.naturalHeight;
          const ratio = Math.min(maxW / imgW, maxH / imgH);
          imgW = imgW * ratio; imgH = imgH * ratio;
          doc.addImage(imgData, imgFormat, (210 - imgW) / 2, 18, imgW, imgH);
          doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
          doc.text(docFile.name, 105, 18 + imgH + 5, { align: 'center' });
        }
      } catch (e) {
        console.warn(`Could not embed document ${docFile.name}:`, e);
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

export async function prepareLoanShareAllBundle(loan: LoanData, docs: any[] = []) {
  const { pdfFile, docFileObjs } = await prepareStoredFilesBundle(docs);
  const finalPdf = pdfFile || new File([await buildLoanApplicationPdfBlob(loan)], `Loan-${loan.id}.pdf`, { type: 'application/pdf' });
  return {
    title: `Loan Application - ${loan.id}`,
    text: `Loan application for ${loan.applicant_name || 'Customer'} (ID: ${loan.id})`,
    files: [finalPdf, ...docFileObjs.map(docFile => docFile.file)],
    docCount: docFileObjs.length,
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
