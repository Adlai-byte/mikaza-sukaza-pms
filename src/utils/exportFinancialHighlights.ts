import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import type { FinancialKPIs } from '@/hooks/useFinancialKPIs';
import type { FinancialAlerts } from '@/hooks/useFinancialAlerts';

interface ExportOptions {
  kpis: FinancialKPIs;
  alerts: FinancialAlerts;
  includeCharts?: boolean;
}

export const exportFinancialHighlightsToPDF = async (options: ExportOptions) => {
  const { kpis, alerts, includeCharts = true } = options;

  // Create PDF document
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to check if we need a new page
  const checkAddPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Add header with logo and title
  const addHeader = () => {
    // Company name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Casa & Concierge', 15, yPosition);

    yPosition += 8;
    doc.setFontSize(16);
    doc.text('Financial Highlights Report', 15, yPosition);

    // Date
    yPosition += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 15, yPosition);

    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPosition += 10;
  };

  // Add section header
  const addSectionHeader = (title: string) => {
    checkAddPage(15);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(title, 17, yPosition + 1);
    doc.setTextColor(0, 0, 0);
    yPosition += 12;
  };

  // Start with header
  addHeader();

  // === KPI SUMMARY SECTION ===
  addSectionHeader('Key Performance Indicators');

  // Create KPI summary table
  const kpiData = [
    ['Month Revenue', formatCurrency(kpis.monthRevenue || 0), `${(kpis.monthRevenueChange || 0).toFixed(1)}% vs last month`],
    ['Month Costs', formatCurrency(kpis.monthCosts || 0), `${(kpis.monthCostsChange || 0).toFixed(1)}% vs last month`],
    ['Profit Margin', `${(kpis.marginPerJob || 0).toFixed(1)}%`, `${(kpis.marginPerJobChange || 0).toFixed(1)}% vs last month`],
    ['Total A/R', formatCurrency(kpis.arAging?.total || 0), ''],
    ['  - Current', formatCurrency(kpis.arAging?.current || 0), 'Not yet due'],
    ['  - 1-30 Days', formatCurrency(kpis.arAging?.days30 || 0), ''],
    ['  - 31-60 Days', formatCurrency(kpis.arAging?.days60 || 0), ''],
    ['  - 60+ Days', formatCurrency(kpis.arAging?.days90 || 0), 'Urgent attention needed'],
    ['Delinquencies', `${kpis.delinquencies?.count || 0} accounts`, formatCurrency(kpis.delinquencies?.amount || 0)],
    ['Commissions Due', `${kpis.commissionsDue?.count || 0} pending`, formatCurrency(kpis.commissionsDue?.amount || 0)],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Metric', 'Value', 'Details']],
    body: kpiData,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 60, halign: 'right' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // === FINANCIAL HEALTH INSIGHTS ===
  checkAddPage(40);
  addSectionHeader('Financial Health Insights');

  const marginHealth = (kpis.marginPerJob || 0) > 30 ? 'Excellent' :
                       (kpis.marginPerJob || 0) > 15 ? 'Good' :
                       'Needs Attention';

  const cashFlowStatus = (kpis.arAging?.total || 0) < (kpis.monthRevenue || 0) * 0.5 ? 'Strong' :
                         (kpis.arAging?.total || 0) < (kpis.monthRevenue || 0) ? 'Moderate' :
                         'Critical';

  const delinquencyRisk = (kpis.delinquencies?.count || 0) === 0 ? 'Excellent' :
                          (kpis.delinquencies?.count || 0) < 5 ? 'Manageable' :
                          'High Risk';

  const insightsData = [
    ['Profit Margin Health', marginHealth, `${(kpis.marginPerJob || 0).toFixed(1)}%`],
    ['Cash Flow Status', cashFlowStatus, formatCurrency(kpis.arAging?.total || 0)],
    ['Delinquency Risk', delinquencyRisk, `${kpis.delinquencies?.count || 0} accounts`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Category', 'Status', 'Value']],
    body: insightsData,
    theme: 'striped',
    headStyles: {
      fillColor: [139, 92, 246], // Purple
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 10,
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // === ALERTS SECTION ===
  checkAddPage(40);
  addSectionHeader('Critical Alerts');

  // Invoices Nearing Due
  if (alerts.invoicesNearingDue && alerts.invoicesNearingDue.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoices Nearing Due', 15, yPosition);
    yPosition += 7;

    const invoiceData = alerts.invoicesNearingDue.slice(0, 10).map(inv => [
      inv.number,
      inv.guest,
      formatCurrency(inv.amount),
      `${inv.daysUntilDue} days`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Invoice #', 'Guest', 'Amount', 'Due In']],
      body: invoiceData,
      theme: 'grid',
      headStyles: {
        fillColor: [251, 146, 60], // Orange
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 9,
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // COIs Expiring
  checkAddPage(40);
  if (alerts.coisExpiring && alerts.coisExpiring.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('COIs Expiring Soon', 15, yPosition);
    yPosition += 7;

    const coiData = alerts.coisExpiring.slice(0, 10).map(coi => [
      coi.vendor,
      coi.type,
      `${coi.daysUntilExpiry} days`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Vendor', 'Insurance Type', 'Expires In']],
      body: coiData,
      theme: 'grid',
      headStyles: {
        fillColor: [239, 68, 68], // Red
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 9,
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // SLAs at Risk
  checkAddPage(40);
  if (alerts.slasAtRisk && alerts.slasAtRisk.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SLAs at Risk', 15, yPosition);
    yPosition += 7;

    const slaData = alerts.slasAtRisk.slice(0, 10).map(sla => [
      sla.job,
      sla.property,
      `${sla.hoursRemaining}h`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Job', 'Property', 'Time Remaining']],
      body: slaData,
      theme: 'grid',
      headStyles: {
        fillColor: [234, 179, 8], // Yellow
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 9,
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // === CAPTURE CHARTS (if requested) ===
  if (includeCharts) {
    // Add new page for charts
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Visual Analytics', 15, yPosition);
    yPosition += 10;

    // Try to capture charts
    try {
      // Capture the trend chart
      const trendChartElement = document.querySelector('[data-chart="trend"]') as HTMLElement;
      if (trendChartElement) {
        const canvas = await html2canvas(trendChartElement, {
          scale: 2,
          logging: false,
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        checkAddPage(imgHeight + 20);
        doc.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 15;
      }

      // Capture revenue vs costs chart
      const revCostChartElement = document.querySelector('[data-chart="revenue-costs"]') as HTMLElement;
      if (revCostChartElement) {
        checkAddPage(80);
        const canvas = await html2canvas(revCostChartElement, {
          scale: 2,
          logging: false,
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = (pageWidth - 30) / 2 - 5;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        doc.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
      }

      // Capture AR aging chart
      const arChartElement = document.querySelector('[data-chart="ar-aging"]') as HTMLElement;
      if (arChartElement) {
        const canvas = await html2canvas(arChartElement, {
          scale: 2,
          logging: false,
          useCORS: true,
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = (pageWidth - 30) / 2 - 5;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        doc.addImage(imgData, 'PNG', pageWidth / 2 + 5, yPosition, imgWidth, imgHeight);
      }
    } catch (error) {
      console.warn('Failed to capture charts:', error);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('(Charts could not be captured)', 15, yPosition);
    }
  }

  // Add footer to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'Casa & Concierge - Confidential',
      15,
      pageHeight - 10
    );
  }

  // Save the PDF
  const fileName = `Financial_Highlights_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
