import { formatCurrency } from '@/lib/mock-data';
import { jsPDF } from 'jspdf';

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
      <img src="/Finonest logo.png" alt="Finonest India" class="company-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
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

  ${sectionTitle('&#127974;', 'Lender Details')}
  ${row4('Lender', fmt(loan.financier_name || loan.selected_financier || loan.bank_name), 'Branch', fmt(loan.financier_branch_name), 'Sales Manager', fmt(loan.financier_executive_name), 'SM Mobile', fmt(loan.financier_executive_mobile))}
  ${row4('Area Manager', fmt(loan.financier_area_manager_name), 'AM Mobile', fmt(loan.financier_area_manager_mobile), 'Loan Amount', fmtCur(loan.loan_amount), 'Case Type', fmt(loan.case_type))}

  ${loan.application_stage === 'APPROVED' || loan.application_stage === 'DISBURSED' || loan.application_stage === 'CANCELLED' || loan.status === 'approved' || loan.status === 'disbursed' || loan.status === 'cancelled' ? `
  ${sectionTitle('&#128203;', 'Deductions & Disbursement')}
  ${row4('File Charge', fmtCur(loan.file_charge), 'Loan Suraksha', fmtCur(loan.loan_suraksha), 'Stamping', fmtCur(loan.stamping), 'Processing Fee', fmtCur(loan.processing_fee))}
  ${row4('Total Deduction', fmtCur(loan.total_deduction), 'Net Disbursement', fmtCur(loan.net_disbursement_amount), 'Payment Recd.', formatDate(loan.payment_received_date), 'Disburse Date', formatDate(loan.financier_disburse_date))}
  ` : ''}

  ${sectionTitle('&#128197;', 'Important Dates')}
  ${row4('Login Date', formatDate(loan.login_date), 'Approval Date', formatDate(loan.approval_date), 'Disburse Date', formatDate(loan.financier_disburse_date), 'TAT', loan.tat ? loan.tat + ' days' : '—')}
  ${row4('Agreement Date', formatDate(loan.agreement_date), 'File Stage', fmt(loan.file_stage), 'Created', formatDate(loan.created_at), 'Last Updated', formatDate(loan.updated_at))}

  ${sectionTitle('&#128196;', 'RTO Details')}
  ${row4('RC Owner', fmt(loan.rc_owner_name), 'RC Mfg Date', fmt(loan.rc_mfg_date), 'HPN at Login', fmt(loan.hpn_at_login), 'New Financier', fmt(loan.new_financier))}
  ${row4('RTO Agent', fmt(loan.rto_agent_name), 'Agent Mobile', fmt(loan.agent_mobile_no), 'DTO Location', fmt(loan.dto_location), 'Challan', fmt(loan.challan))}
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

${loan._docUrls && loan._docUrls.length > 0 ? `
<div style="margin-top:16px;">
  <h3 style="font-size:11px;font-weight:bold;color:#1a3a6b;margin-bottom:8px;">UPLOADED DOCUMENTS</h3>
  <table style="width:100%;border-collapse:collapse;">
    ${loan._docUrls.map((d: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#f8f9fb' : '#fff'};">
      <td style="padding:4px 8px;border:1px solid #e0e4ea;font-size:9px;font-weight:600;color:#1a3a6b;width:20%;">${d.type}</td>
      <td style="padding:4px 8px;border:1px solid #e0e4ea;font-size:9px;color:#333;width:30%;">${d.name}</td>
      <td style="padding:4px 8px;border:1px solid #e0e4ea;font-size:9px;"><a href="${d.url}" style="color:#1a3a6b;">${d.url}</a></td>
    </tr>`).join('')}
  </table>
</div>` : ''}

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

const DOC_TYPES: Record<string, string> = {
  rc_copy: 'RC Copy', insurance: 'Insurance', income_proof: 'Income Proof',
  bank_statement: 'Bank Statement', nach: 'NACH', other: 'Other',
};

async function fetchDocumentUrls(docs: any[]): Promise<{ name: string; type: string; url: string }[]> {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('auth_token');
  return docs.map(doc => ({
    name: doc.file_name,
    type: DOC_TYPES[doc.document_type] || doc.document_type || 'Other',
    url: `${API}/documents/${doc.id}/download?token=${token}`,
  }));
}

export function exportLoanPDF(loan: LoanData, docs: any[] = []) {
  const win = window.open('', '_blank');
  if (!win) return;
  Promise.all([fetchHierarchy(loan), fetchDocumentUrls(docs)]).then(([hierarchy, docUrls]) => {
    const loanWithHierarchy = { ...loan, _hierarchy: hierarchy.length > 0 ? hierarchy : undefined, _docUrls: docUrls };
    const html = buildLoanHTML(loanWithHierarchy);
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
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

function generatePDFBlob(loan: LoanData): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pw = 190; // printable width (A4 210 - 10*2 margins)
      const lm = 10; // left margin
      let y = 12;

      const colors = { primary: [26, 58, 107] as [number, number, number], dark: [26, 26, 46] as [number, number, number], gray: [136, 136, 136] as [number, number, number], light: [232, 236, 241] as [number, number, number], white: [255, 255, 255] as [number, number, number] };

      // Try to load and add logo
      try {
        const logoBase64 = await loadImageAsBase64('/Finonest logo.png');
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

  // Helper to draw a 4-column section
  function drawSection(title: string, fields: [string, string][]) {
    // Check page break
    const rowCount = Math.ceil(fields.length / 4);
    const needed = 8 + rowCount * 7;
    if (y + needed > 280) { doc.addPage(); y = 12; }

    // Section title
    doc.setFillColor(240, 244, 248); doc.rect(lm, y, pw, 6, 'F');
    doc.setDrawColor(...colors.primary); doc.setLineWidth(0.4); doc.line(lm, y + 6, lm + pw, y + 6);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.primary);
    doc.text(title, lm + 2, y + 4.2);
    y += 7;

    const colW = pw / 4;
    for (let i = 0; i < fields.length; i += 4) {
      const rowFields = fields.slice(i, i + 4);
      // Draw cells
      for (let j = 0; j < 4; j++) {
        const x = lm + j * colW;
        doc.setDrawColor(...colors.light); doc.setLineWidth(0.2);
        doc.rect(x, y, colW, 7);

        if (rowFields[j]) {
          doc.setFontSize(5.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...colors.gray);
          doc.text(rowFields[j][0], x + 1.5, y + 2.5);
          doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...colors.dark);
          doc.text(rowFields[j][1], x + 1.5, y + 5.8, { maxWidth: colW - 3 });
        }
      }
      y += 7;
    }
    y += 2;
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

  drawSection('LENDER DETAILS', [
    ['Lender', fmt(loan.financier_name || loan.selected_financier || loan.bank_name)], ['Branch', fmt(loan.financier_branch_name)], ['Sales Manager', fmt(loan.financier_executive_name)], ['SM Mobile', fmt(loan.financier_executive_mobile)],
    ['Area Manager', fmt(loan.financier_area_manager_name)], ['AM Mobile', fmt(loan.financier_area_manager_mobile)], ['Loan Amount', fmtCur(loan.loan_amount)], ['Case Type', fmt(loan.case_type)],
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

  drawSection('IMPORTANT DATES', [
    ['Login Date', formatDate(loan.login_date)], ['Approval Date', formatDate(loan.approval_date || loan.sanction_date)], ['Disburse Date', formatDate(loan.disbursement_date || loan.financier_disburse_date)], ['TAT', loan.tat ? loan.tat + ' days' : '—'],
    ['Agreement Date', formatDate(loan.agreement_date)], ['File Stage', fmt(loan.application_stage_label || loan.file_stage)], ['Created', formatDate(loan.created_at)], ['Last Updated', formatDate(loan.updated_at)],
  ]);

  drawSection('RTO DETAILS', [
    ['RC Owner', fmt(loan.rc_owner_name)], ['RC Mfg Date', fmt(loan.rc_mfg_date)], ['HPN at Login', fmt(loan.hpn_at_login)], ['New Financier', fmt(loan.new_financier)],
    ['RTO Agent', fmt(loan.rto_agent_name || loan.rto_agent_name_rc)], ['Agent Mobile', fmt(loan.agent_mobile_no || loan.rto_agent_mobile)], ['DTO Location', fmt(loan.dto_location)], ['Challan', fmt(loan.challan)],
  ]);

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

async function fetchDocumentFiles(docs: any[]): Promise<{ file: File; name: string; docType: string }[]> {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const headers = { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` };
  const files: { file: File; name: string; docType: string }[] = [];
  for (const doc of docs) {
    try {
      const res = await fetch(`${API}/documents/${doc.id}/download`, { headers });
      if (!res.ok) continue;
      const blob = await res.blob();
      const docLabel = DOC_TYPES[doc.document_type] || doc.document_type || 'Document';
      const fileName = `${docLabel}-${doc.file_name}`;
      files.push({ file: new File([blob], fileName, { type: blob.type }), name: fileName, docType: docLabel });
    } catch {}
  }
  return files;
}

export async function shareLoanPDF(loan: LoanData, docs: any[] = []) {
  const text = `*Finonest India - Loan Application*\n\n*ID:* ${loan.id}\n*Applicant:* ${loan.applicant_name}\n*Mobile:* ${loan.mobile}\n*Vehicle:* ${loan.maker_name || loan.car_make || ''} ${loan.model_variant_name || loan.car_model || ''}\n*Loan Amount:* ${fmtCur(loan.loan_amount)}\n*Status:* ${loan.status}\n*EMI:* ${fmtCur(loan.emi_amount || loan.emi)}\n*Tenure:* ${loan.tenure} months`;
  
  try {
    const [hierarchy, docUrls, docFileObjs] = await Promise.all([
      fetchHierarchy(loan), 
      fetchDocumentUrls(docs), 
      fetchDocumentFiles(docs)
    ]);
    
    const loanH = { ...loan, _hierarchy: hierarchy.length > 0 ? hierarchy : undefined, _docUrls: docUrls };
    const pdfBlob = await generatePDFBlob(loanH);
    const pdfFile = new File([pdfBlob], `Loan-${loan.id}.pdf`, { type: 'application/pdf' });
    
    // All files to share (PDF + documents)
    const allFiles = [pdfFile, ...docFileObjs.map(d => d.file)];
    
    // Try native sharing first (mobile devices)
    if (navigator.share && navigator.canShare) {
      const shareData: ShareData = { 
        title: `Loan Application - ${loan.id}`, 
        text, 
        files: allFiles 
      };
      
      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
      
      // Fallback: try sharing just the PDF if all files fail
      const pdfOnlyData: ShareData = { 
        title: `Loan Application - ${loan.id}`, 
        text, 
        files: [pdfFile] 
      };
      
      if (navigator.canShare(pdfOnlyData)) {
        await navigator.share(pdfOnlyData);
        return;
      }
    }
    
    // Desktop fallback: Download all files and open WhatsApp
    // Download PDF
    triggerDownload(pdfBlob, `Loan-${loan.id}-${loan.applicant_name?.replace(/\s+/g, '_') || 'Application'}.pdf`);
    
    // Download documents with delay
    for (let i = 0; i < docFileObjs.length; i++) {
      await new Promise(r => setTimeout(r, 300));
      triggerDownload(docFileObjs[i].file, docFileObjs[i].name);
    }
    
    // Show instruction message
    const fileCount = allFiles.length;
    const message = `Downloaded ${fileCount} file${fileCount > 1 ? 's' : ''} (PDF + ${docFileObjs.length} document${docFileObjs.length !== 1 ? 's' : ''}). Please attach them manually to WhatsApp.`;
    
    // Show toast notification if available
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success(message);
    } else {
      alert(message);
    }
    
    // Open WhatsApp with text
    const waText = encodeURIComponent(text + `\n\n📎 ${fileCount} files downloaded for attachment`);
    window.open(`https://wa.me/?text=${waText}`, '_blank');
    
  } catch (e) {
    console.error('Error generating files for sharing:', e);
    
    // Fallback: just open WhatsApp with text
    const waText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${waText}`, '_blank');
  }
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
    const [hierarchy, docUrls] = await Promise.all([fetchHierarchy(loan), fetchDocumentUrls(docs)]);
    const loanH = { ...loan, _hierarchy: hierarchy.length > 0 ? hierarchy : undefined, _docUrls: docUrls };
    const [pdfBlob, docFileObjs] = await Promise.all([generatePDFBlob(loanH), fetchDocumentFiles(docs)]);

    // Download PDF
    triggerDownload(pdfBlob, `Loan-${loan.id}-${loan.applicant_name?.replace(/\s+/g, '_') || 'Application'}.pdf`);

    // Download each document with a small delay to avoid browser blocking
    for (let i = 0; i < docFileObjs.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      triggerDownload(docFileObjs[i].file, docFileObjs[i].name);
    }
  } catch (error) {
    console.error('Error generating PDF for download:', error);
    alert('Error generating PDF. Please try again.');
  }
}
