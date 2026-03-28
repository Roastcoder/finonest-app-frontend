import { jsPDF } from 'jspdf';

interface DashboardData {
  title: string;
  timeline: string;
  dateRange?: { start: string; end: string };
  stats: any;
  user?: { full_name?: string; role?: string };
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
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
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

export async function generateDashboardPDF(dashboardData: DashboardData): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const pw = 277;
      const lm = 10;
      let y = 12;

      const colors = {
        primary: [26, 58, 107] as [number, number, number],
        dark: [26, 26, 46] as [number, number, number],
        gray: [136, 136, 136] as [number, number, number],
        light: [232, 236, 241] as [number, number, number],
        white: [255, 255, 255] as [number, number, number]
      };

      // Header with logo
      try {
        const logoBase64 = await loadImageAsBase64('/Finonest%20logo.png');
        doc.addImage(logoBase64, 'PNG', lm, y - 2, 40, 12);
      } catch (logoError) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text('Finonest India', lm, y);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.gray);
        doc.text('Vehicle Loan Solutions • Since 2015', lm, y + 5);
      }

      // Header right side
      doc.setFontSize(7);
      doc.setTextColor(...colors.gray);
      doc.text('Report Type', lm + pw, y - 4, { align: 'right' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(dashboardData.title, lm + pw, y + 1, { align: 'right' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.gray);
      doc.text('Generated', lm + pw, y + 5, { align: 'right' });
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
      doc.text('Dashboard Report', lm + 4, y + 5.5);
      doc.setFontSize(8);
      doc.text(`Timeline: ${dashboardData.timeline}`, lm + pw - 4, y + 5.5, { align: 'right' });
      y += 12;

      // Helper function to draw sections
      function drawSection(title: string, fields: [string, string][]) {
        const rowCount = Math.ceil(fields.length / 4);
        const needed = 8 + rowCount * 10;
        if (y + needed > 190) {
          doc.addPage();
          y = 12;
        }

        // Section title
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
                doc.text(line, x + 1.5, y + 5.8 + (lineIndex * 2.5));
              });
            }
          }
          y += maxHeight;
        }
        y += 2;
      }

      // KPI Summary
      const stats = dashboardData.stats;
      drawSection('KEY PERFORMANCE INDICATORS', [
        ['Logins', fmt(stats.monthlyTracker?.login || 0)],
        ['In Process', fmt(stats.monthlyTracker?.inProcess || 0)],
        ['Approved Units', fmt(stats.monthlyTracker?.approved?.units || 0)],
        ['Approved Amount', fmtCur(stats.monthlyTracker?.approved?.amount || 0)],
        ['Disbursed Units', fmt(stats.monthlyTracker?.disbursed?.units || 0)],
        ['Disbursed Amount', fmtCur(stats.monthlyTracker?.disbursed?.amount || 0)],
        ['Pending Disbursal', fmt((stats.monthlyTracker?.approved?.units || 0) - (stats.monthlyTracker?.disbursed?.units || 0))],
        ['Report Date', new Date().toLocaleDateString('en-IN')]
      ]);

      // Bank-wise Summary
      if (stats.loginBankWise && stats.loginBankWise.length > 0) {
        const bankData: [string, string][] = [];
        stats.loginBankWise.slice(0, 8).forEach((bank: any) => {
          bankData.push([bank.bankName || 'Unknown', fmt(bank.count || 0)]);
        });
        while (bankData.length % 4 !== 0) bankData.push(['', '']);
        drawSection('BANK-WISE LOGIN VOLUME', bankData);
      }

      // Approved Bank-wise
      if (stats.approvedBankWise && stats.approvedBankWise.length > 0) {
        const approvedData: [string, string][] = [];
        stats.approvedBankWise.slice(0, 8).forEach((bank: any) => {
          approvedData.push([bank.bankName || 'Unknown', fmtCur(bank.amount || 0)]);
        });
        while (approvedData.length % 4 !== 0) approvedData.push(['', '']);
        drawSection('APPROVED LOANS BY FINANCIER', approvedData);
      }

      // Stage Breakdown
      if (stats.stageBreakdown && stats.stageBreakdown.length > 0) {
        const stageData: [string, string][] = [];
        stats.stageBreakdown.slice(0, 8).forEach((stage: any) => {
          stageData.push([stage.stage || 'Unknown', fmt(stage.count || 0)]);
        });
        while (stageData.length % 4 !== 0) stageData.push(['', '']);
        drawSection('APPLICATION STAGE BREAKDOWN', stageData);
      }

      // Footer
      if (y + 20 > 190) {
        doc.addPage();
        y = 12;
      }

      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('REPORT DETAILS', lm, y);
      y += 8;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.dark);
      doc.text(`Timeline: ${dashboardData.timeline}`, lm, y);
      y += 5;
      if (dashboardData.dateRange?.start && dashboardData.dateRange?.end) {
        doc.text(`Date Range: ${formatDate(dashboardData.dateRange.start)} to ${formatDate(dashboardData.dateRange.end)}`, lm, y);
        y += 5;
      }
      doc.text(`Generated By: ${dashboardData.user?.full_name || 'System'}`, lm, y);
      y += 5;
      doc.text(`Generated On: ${new Date().toLocaleString('en-IN')}`, lm, y);

      // Signature area
      y += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('AUTHORIZATION', lm, y);
      y += 8;

      const sigW = pw / 2;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.dark);
      doc.text('Prepared By', lm + sigW / 2, y + 10, { align: 'center' });
      doc.text('Approved By', lm + sigW + sigW / 2, y + 10, { align: 'center' });

      doc.setDrawColor(51, 51, 51);
      doc.setLineWidth(0.3);
      doc.line(lm + 5, y + 15, lm + sigW - 5, y + 15);
      doc.line(lm + sigW + 5, y + 15, lm + pw - 5, y + 15);

      doc.setFontSize(7);
      doc.setTextColor(...colors.gray);
      doc.text('Signature', lm + sigW / 2, y + 19, { align: 'center' });
      doc.text('Signature', lm + sigW + sigW / 2, y + 19, { align: 'center' });

      // Final footer
      y += 25;
      doc.setDrawColor(...colors.light);
      doc.setLineWidth(0.3);
      doc.line(lm, y, lm + pw, y);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.gray);
      doc.text(`Generated on ${new Date().toLocaleString('en-IN')} • Finonest India`, lm, y + 4);
      doc.text('This is a system-generated document', lm + pw, y + 4, { align: 'right' });

      // Set PDF properties
      doc.setProperties({
        title: `Dashboard Report - ${dashboardData.title}`,
        subject: `Dashboard Report for ${dashboardData.timeline}`,
        author: dashboardData.user?.full_name || 'Finonest User',
        keywords: 'dashboard, report',
        creator: 'Finonest Dashboard'
      });

      resolve(doc.output('blob'));
    } catch (error) {
      reject(error);
    }
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

// Export function to download dashboard PDF
export async function downloadDashboardPDF(dashboardData: DashboardData) {
  try {
    const pdfBlob = await generateDashboardPDF(dashboardData);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${new Date().getTime()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating dashboard PDF:', error);
    throw error;
  }
}
