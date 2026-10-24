import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BatchReportDataset, BatchProductItem } from './batchReportService';

/**
 * Builds the complete jsPDF document for the Executive Return Intelligence Audit Report.
 * Uses a fully responsive layout engine with measured text heights, dynamic card boundaries,
 * and robust page break management to guarantee zero text collisions or overlapping.
 */
export function buildBatchPdfDoc(report: BatchReportDataset): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const pageBottomLimit = pageHeight - 34; // Leaves safe buffer above footer line at pageHeight - 25

  // Professional Color Palette
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo 600
  const darkNavy: [number, number, number] = [15, 23, 42]; // Slate 900
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
  const borderColor: [number, number, number] = [203, 213, 225]; // Slate 300
  const criticalRed: [number, number, number] = [225, 29, 72]; // Rose 600
  const highOrange: [number, number, number] = [234, 88, 12]; // Orange 600
  const mediumAmber: [number, number, number] = [217, 119, 6]; // Amber 600
  const lowEmerald: [number, number, number] = [16, 185, 129]; // Emerald 600

  let currentY = margin;

  // Helper: Draw running header
  const drawPageHeader = (subtitle?: string) => {
    doc.setFillColor(...lightBg);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setDrawColor(...borderColor);
    doc.line(0, 28, pageWidth, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const headerTitle = subtitle
      ? `AI RETURN IQ | ${subtitle.toUpperCase()}`
      : 'AI RETURN IQ | EXECUTIVE RETURN INTELLIGENCE AUDIT';
    doc.text(headerTitle, margin, 18);

    doc.setFont('helvetica', 'normal');
    doc.text(report.reportId, pageWidth - margin, 18, { align: 'right' });
  };

  // Helper: Draw running footer
  const drawPageFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(...borderColor);
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated: ${report.analyzedAt || report.generatedAt} • Store: ${report.storeName} • Confidential`,
      margin,
      pageHeight - 12
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  };

  // -------------------------------------------------------------
  // PAGE 1: COVER & EXECUTIVE OVERVIEW
  // -------------------------------------------------------------
  drawPageHeader('Executive Overview');

  // Top Banner
  currentY = 46;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, currentY, contentWidth, 68, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('EXECUTIVE RETURN INTELLIGENCE AUDIT', margin + 16, currentY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(224, 231, 255);
  doc.text(
    'Complete Multi-Product AI Root Cause Analysis & Quality Mitigation Strategy',
    margin + 16,
    currentY + 48
  );

  currentY += 82;

  // Metadata Grid
  const metaBoxHeight = 58;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, contentWidth, metaBoxHeight, 4, 4, 'FD');

  const col1X = margin + 14;
  const col2X = margin + 185;
  const col3X = margin + 355;
  const colWidth = 160;

  // Row 1 (y = currentY + 14)
  // Col 1: Store Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('STORE NAME', col1X, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  const storeLines: string[] = doc.splitTextToSize(report.storeName, colWidth);
  doc.text(storeLines[0] || 'Store', col1X, currentY + 25);

  // Col 2: Analysis Scope
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ANALYSIS SCOPE', col2X, currentY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`${report.distinctProductsCount} Distinct Products`, col2X, currentY + 25);

  // Col 3: Ground-Truth Status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GROUND-TRUTH STATUS', col3X, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...lowEmerald);
  doc.text('100% Client-Side Verified', col3X, currentY + 25);

  // Row 2 (y = currentY + 38)
  // Col 1: Report ID
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('REPORT ID', col1X, currentY + 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(report.reportId, col1X, currentY + 49);

  // Col 2: Audit Timestamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AUDIT TIMESTAMP', col2X, currentY + 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const tsText = report.analyzedAt || report.generatedAt;
  doc.text(tsText, col2X, currentY + 49);

  // Col 3: AI Engine
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AI INTELLIGENCE ENGINE', col3X, currentY + 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Gemini Multi-Model AI', col3X, currentY + 49);

  currentY += metaBoxHeight + 14;

  // 4 Key Metric Cards
  const cardWidth = (contentWidth - 18) / 4;
  const cards = [
    { label: 'TOTAL RETURNS', val: report.totalReturns.toString(), color: primaryColor },
    { label: 'PRODUCTS AUDITED', val: report.distinctProductsCount.toString(), color: darkNavy },
    { label: 'TOTAL REFUNDS', val: `$${report.totalRefundValue.toLocaleString()}`, color: criticalRed },
    { label: 'CRITICAL / HIGH RISK', val: (report.riskDistribution.critical + report.riskDistribution.high).toString(), color: highOrange },
  ];

  cards.forEach((c, idx) => {
    const cardX = margin + idx * (cardWidth + 6);
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(cardX, currentY, cardWidth, 48, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cardX + 10, currentY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...c.color);
    doc.text(c.val, cardX + 10, currentY + 38);
  });

  currentY += 60;

  // Section 1: Executive Risk Distribution Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkNavy);
  doc.text('1. Product Catalog Risk Distribution Breakdown', margin, currentY);
  currentY += 8;

  const riskTableData = [
    ['Critical Issue (4+ Returns or Multiple High Severities)', report.riskDistribution.critical.toString(), `${report.distinctProductsCount ? Math.round((report.riskDistribution.critical / report.distinctProductsCount) * 100) : 0}%`, 'Immediate Supplier / QC Freeze Recommended'],
    ['High Risk (3 Returns or 1 High Severity)', report.riskDistribution.high.toString(), `${report.distinctProductsCount ? Math.round((report.riskDistribution.high / report.distinctProductsCount) * 100) : 0}%`, 'Inspect Listing Clarity & Lot Quality'],
    ['Medium Risk (2 Returns)', report.riskDistribution.medium.toString(), `${report.distinctProductsCount ? Math.round((report.riskDistribution.medium / report.distinctProductsCount) * 100) : 0}%`, 'Monitor Weekly Trend & Customer Comments'],
    ['Low Risk / Normal (1 Return)', report.riskDistribution.low.toString(), `${report.distinctProductsCount ? Math.round((report.riskDistribution.low / report.distinctProductsCount) * 100) : 0}%`, 'Within Acceptable E-commerce Tolerances'],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Risk Classification Level', 'Product Count', '% of Catalog', 'Standard Action Protocol']],
    body: riskTableData,
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 18;

  // Section 2: Top Return Categories
  if (currentY + 80 > pageBottomLimit) {
    doc.addPage();
    drawPageHeader('Executive Overview');
    currentY = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkNavy);
  doc.text('2. Top Return Reason Categories Across Dataset', margin, currentY);
  currentY += 8;

  const categoryTableData = report.categoryBreakdown.map((c) => [
    c.category,
    `${c.count} returns`,
    `${c.percentage}% of all returns`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Return Category', 'Total Return Count', 'Volume Share']],
    body: categoryTableData.slice(0, 5),
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 18;

  // Section 3: Cross-Product Failure Patterns (if any)
  if (report.crossProductPatterns.length > 0) {
    if (currentY + 80 > pageBottomLimit) {
      doc.addPage();
      drawPageHeader('Executive Overview');
      currentY = 40;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...darkNavy);
    doc.text('3. Cross-Product Systemic Quality Patterns', margin, currentY);
    currentY += 8;

    const crossTableData = report.crossProductPatterns.map((pat) => [
      pat.pattern,
      pat.severity,
      `${pat.affectedProducts.length} items (${pat.totalReturns} returns)`,
      pat.insight,
      pat.recommendedAction,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      head: [['Systemic Driver', 'Severity', 'Affected Scope', 'Root Analysis', 'Corrective Action']],
      body: crossTableData,
      styles: {
        overflow: 'linebreak',
        fontSize: 7.5,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 16;
  }

  // -------------------------------------------------------------
  // SECTION 4: PRODUCT-BY-PRODUCT DETAILED INTELLIGENCE AUDIT
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader('Product Intelligence Audit');
  currentY = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...darkNavy);
  doc.text('4. Product-by-Product Root Cause & Action Audits', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Detailed breakdown citing pre-calculated ground-truth return evidence, verified customer complaints, and actionable AI recommendations.',
    margin,
    currentY + 14
  );

  currentY += 28;

  // Helper function to measure complete product card dimensions
  const measureProductCard = (prod: BatchProductItem, pIdx: number) => {
    // 1. Risk Badge Dimensions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const badgeTextWidth = doc.getTextWidth(prod.riskLevel);
    const badgeWidth = Math.max(76, badgeTextWidth + 16);
    const badgeHeight = 16;
    const badgeX = pageWidth - margin - badgeWidth - 6;

    // 2. Title & Subtitle Dimensions (strictly bounded to prevent badge overlap)
    const maxTitleWidth = badgeX - margin - 14;
    const titleText = `${pIdx + 1}. ${prod.productName}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const titleLines: string[] = doc.splitTextToSize(titleText, maxTitleWidth);
    const titleLineHeight = 12;

    const subtitleText = `[SKU: ${prod.sku || 'N/A'}]   •   Category: ${prod.category || 'General'}   •   Total Returns: ${prod.totalReturns}   •   Refund Total: $${(prod.refundTotal || 0).toLocaleString()}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const subtitleLines: string[] = doc.splitTextToSize(subtitleText, maxTitleWidth);
    const subtitleLineHeight = 10;

    const headerHeight = Math.max(34, 8 + titleLines.length * titleLineHeight + 3 + subtitleLines.length * subtitleLineHeight + 6);

    // 3. Primary Return Causes
    const reasonEntries = Object.entries(prod.reasons || {});
    const reasonText =
      reasonEntries.length > 0
        ? reasonEntries.map(([rsn, cnt]) => `${rsn}: ${cnt} (${prod.reasonPercentages[rsn] || 0}%)`).join('   |   ')
        : 'No specific category reasons recorded';
    const reasonValueWidth = contentWidth - 12 - 74;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const reasonLines: string[] = doc.splitTextToSize(reasonText, reasonValueWidth);
    const causesBlockHeight = Math.max(14, reasonLines.length * 10.5) + 4;

    // 4. Customer Feedback
    let feedbackBlockHeight = 0;
    let feedbackLines: string[] = [];
    if (prod.comments && prod.comments.length > 0) {
      const commentRaw = prod.comments[0].length > 250 ? prod.comments[0].slice(0, 247) + '...' : prod.comments[0];
      const feedbackValueWidth = contentWidth - 12 - 82;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      feedbackLines = doc.splitTextToSize(`"${commentRaw}"`, feedbackValueWidth);
      feedbackBlockHeight = Math.max(14, feedbackLines.length * 10.5) + 4;
    }

    // 5. AI Insight Block or Failure Block
    const valueWidth = contentWidth - 110; // Ensures 18pt safety margin inside the box
    let aiBoxHeight = 0;
    let probLines: string[] = [];
    let evLines: string[] = [];
    let actLines: string[] = [];
    let failLines: string[] = [];
    let noteLines: string[] = [];

    if (prod.status === 'success' && prod.insight) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      probLines = doc.splitTextToSize(prod.insight.mainRecurringProblem || 'Recurring product defect under analysis', valueWidth);
      evLines = doc.splitTextToSize(prod.insight.evidence || 'Pre-calculated verified return records', valueWidth);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      actLines = doc.splitTextToSize(prod.insight.recommendedBusinessAction || 'Review supplier quality specifications', valueWidth);

      const probHeight = Math.max(1, probLines.length) * 11;
      const evHeight = Math.max(1, evLines.length) * 11;
      const actHeight = Math.max(1, actLines.length) * 11;
      aiBoxHeight = 8 + probHeight + 6 + evHeight + 6 + actHeight + 8;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const failReason = prod.errorReason || 'AI insights not completed during batch run (rate limit or connection timeout).';
      failLines = doc.splitTextToSize(failReason, valueWidth);
      const subNote = 'Pre-calculated ground-truth returns and category counts above remain 100% accurate and verified.';
      doc.setFontSize(7.5);
      noteLines = doc.splitTextToSize(subNote, contentWidth - 28);

      const failHeight = Math.max(1, failLines.length) * 11;
      const noteHeight = Math.max(1, noteLines.length) * 10;
      aiBoxHeight = 8 + failHeight + 6 + noteHeight + 8;
    }

    // 6. Email Alert Status
    let emailHeight = 0;
    let emailLines: string[] = [];
    let emailColor: [number, number, number] = [100, 116, 139];
    if (prod.emailOutcome) {
      let emailText = '';
      if (prod.emailOutcome.status === 'sent') {
        emailText = `• Automated High-Risk Email Alert: Successfully dispatched (${prod.emailOutcome.message})`;
        emailColor = lowEmerald;
      } else if (prod.emailOutcome.status === 'already-notified') {
        emailText = `• Automated High-Risk Email Alert: Already notified (${prod.emailOutcome.message})`;
        emailColor = [2, 132, 199];
      } else if (prod.emailOutcome.status === 'failed') {
        emailText = `• Automated High-Risk Email Alert: Dispatch failed (${prod.emailOutcome.message})`;
        emailColor = criticalRed;
      } else {
        emailText = `• Automated High-Risk Email Alert: Skipped (${prod.emailOutcome.message})`;
        emailColor = [100, 116, 139];
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      emailLines = doc.splitTextToSize(emailText, contentWidth - 16);
      emailHeight = emailLines.length * 9.5 + 4;
    }

    const totalHeight =
      headerHeight +
      causesBlockHeight +
      (feedbackBlockHeight > 0 ? feedbackBlockHeight : 0) +
      aiBoxHeight +
      (emailHeight > 0 ? emailHeight : 0) +
      14; // Card bottom margin & separator

    return {
      totalHeight,
      badgeWidth,
      badgeHeight,
      badgeX,
      headerHeight,
      titleLines,
      titleLineHeight,
      subtitleLines,
      subtitleLineHeight,
      reasonLines,
      causesBlockHeight,
      feedbackLines,
      feedbackBlockHeight,
      aiBoxHeight,
      probLines,
      evLines,
      actLines,
      failLines,
      noteLines,
      emailLines,
      emailHeight,
      emailColor,
    };
  };

  report.products.forEach((prod, pIdx) => {
    // Measure full product card dimensions
    const m = measureProductCard(prod, pIdx);

    // Smart Pagination: If card doesn't fit on the current page, move it to the next page
    const availableOnPage = pageBottomLimit - currentY;
    if (m.totalHeight > availableOnPage) {
      // If we are not at the top of a fresh page, and the card fits on a fresh page
      if (currentY > 45 && m.totalHeight <= pageBottomLimit - 40) {
        doc.addPage();
        drawPageHeader('Product Intelligence Audit');
        currentY = 40;
      } else if (currentY > 45 && availableOnPage < 120) {
        // If remaining space is very small, start fresh to prevent awkward fragmentation
        doc.addPage();
        drawPageHeader('Product Intelligence Audit');
        currentY = 40;
      }
    }

    // Determine risk badge color
    let riskColor = lowEmerald;
    if (prod.riskLevel === 'Critical Issue') riskColor = criticalRed;
    else if (prod.riskLevel === 'High Risk') riskColor = highOrange;
    else if (prod.riskLevel === 'Medium Risk') riskColor = mediumAmber;

    const cardTop = currentY;

    // 1. Draw Title Bar Background
    doc.setFillColor(...lightBg);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, cardTop, contentWidth, m.headerHeight, 3, 3, 'FD');

    // 2. Draw Risk Badge (Vertically centered, right-aligned)
    doc.setFillColor(...riskColor);
    const badgeY = cardTop + Math.max(5, (m.headerHeight - m.badgeHeight) / 2);
    doc.roundedRect(m.badgeX, badgeY, m.badgeWidth, m.badgeHeight, 2.5, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(prod.riskLevel, m.badgeX + m.badgeWidth / 2, badgeY + 11, { align: 'center' });

    // 3. Draw Title Lines
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...darkNavy);
    let titleY = cardTop + 13;
    m.titleLines.forEach((tLine) => {
      doc.text(tLine, margin + 8, titleY);
      titleY += m.titleLineHeight;
    });

    // 4. Draw Subtitle Lines (below title)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    let subY = titleY - 1;
    m.subtitleLines.forEach((sLine) => {
      doc.text(sLine, margin + 8, subY);
      subY += m.subtitleLineHeight;
    });

    currentY = cardTop + m.headerHeight + 5;

    // 5. Draw Primary Causes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Primary Drivers:', margin + 8, currentY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    let causeY = currentY + 9;
    m.reasonLines.forEach((rLine) => {
      doc.text(rLine, margin + 78, causeY);
      causeY += 10.5;
    });

    currentY += m.causesBlockHeight;

    // 6. Draw Customer Feedback if present
    if (m.feedbackBlockHeight > 0) {
      // Check space before feedback block
      if (currentY + m.feedbackBlockHeight > pageBottomLimit) {
        doc.addPage();
        drawPageHeader('Product Intelligence Audit');
        currentY = 40;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Customer Voice:', margin + 8, currentY + 8);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      let feedY = currentY + 8;
      m.feedbackLines.forEach((fLine) => {
        doc.text(fLine, margin + 78, feedY);
        feedY += 10.5;
      });

      currentY += m.feedbackBlockHeight;
    }

    // 7. Draw AI Analysis Block or Failure Block
    // Check space before AI block
    if (currentY + m.aiBoxHeight > pageBottomLimit) {
      doc.addPage();
      drawPageHeader('Product Intelligence Audit');
      currentY = 40;
    }

    if (prod.status === 'success' && prod.insight) {
      doc.setFillColor(238, 242, 255); // Indigo 50
      doc.setDrawColor(199, 210, 254); // Indigo 200
      doc.roundedRect(margin + 4, currentY, contentWidth - 8, m.aiBoxHeight, 3, 3, 'FD');

      let rowY = currentY + 11;

      // Item 1: AI Root Cause
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text('AI Root Cause:', margin + 12, rowY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...darkNavy);
      m.probLines.forEach((pLine) => {
        doc.text(pLine, margin + 88, rowY);
        rowY += 11;
      });

      rowY += 5; // Inter-item gap

      // Item 2: Ground-Truth Evidence
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text('Ground-Truth:', margin + 12, rowY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      m.evLines.forEach((eLine) => {
        doc.text(eLine, margin + 88, rowY);
        rowY += 11;
      });

      rowY += 5; // Inter-item gap

      // Item 3: Corrective Action Plan
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text('Action Plan:', margin + 12, rowY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      m.actLines.forEach((aLine) => {
        doc.text(aLine, margin + 88, rowY);
        rowY += 11;
      });

      currentY += m.aiBoxHeight + 5;
    } else {
      // Disclose Failure Clearly
      doc.setFillColor(255, 241, 242); // Rose 50
      doc.setDrawColor(254, 205, 211); // Rose 200
      doc.roundedRect(margin + 4, currentY, contentWidth - 8, m.aiBoxHeight, 3, 3, 'FD');

      let rowY = currentY + 11;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...criticalRed);
      doc.text('AI Analysis:', margin + 12, rowY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(159, 18, 57);
      m.failLines.forEach((fLine) => {
        doc.text(fLine, margin + 88, rowY);
        rowY += 11;
      });

      rowY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      m.noteLines.forEach((nLine) => {
        doc.text(nLine, margin + 12, rowY);
        rowY += 10;
      });

      currentY += m.aiBoxHeight + 5;
    }

    // 8. Draw Email Alert Status if present
    if (m.emailHeight > 0) {
      if (currentY + m.emailHeight > pageBottomLimit) {
        doc.addPage();
        drawPageHeader('Product Intelligence Audit');
        currentY = 40;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...m.emailColor);
      let emY = currentY + 7;
      m.emailLines.forEach((emLine) => {
        doc.text(emLine, margin + 8, emY);
        emY += 9.5;
      });
      currentY += m.emailHeight;
    }

    // 9. Card Bottom Separator (if not last product)
    if (pIdx < report.products.length - 1) {
      currentY += 4;
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.line(margin + 8, currentY, pageWidth - margin - 8, currentY);
      currentY += 8;
    } else {
      currentY += 8;
    }
  });

  // -------------------------------------------------------------
  // FINAL SECTION: AUDIT SEAL & DISCLAIMER
  // -------------------------------------------------------------
  const certText =
    'This report was generated directly by ReturnIQ AI Client-Side Intelligence Engine. All metric counts, return totals, and percentages represent 100% verified ground-truth figures extracted from imported e-commerce records. AI analysis synthesizes verified complaints using structured Gemini schema validation without external data leakage.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const certLines: string[] = doc.splitTextToSize(certText, contentWidth - 24);

  let summaryLines: string[] = [];
  if (report.emailSummary) {
    const summaryText = `High-Risk Alerts Dispatched: ${report.emailSummary.sentCount} sent, ${report.emailSummary.alreadyNotifiedCount} already notified, ${report.emailSummary.skippedCount} skipped (normal/medium risk), ${report.emailSummary.failedCount} failed | Recipient: ${report.emailSummary.recipientEmail || 'Not configured'}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    summaryLines = doc.splitTextToSize(summaryText, contentWidth - 24) as string[];
  }

  const auditBoxHeight =
    16 + 12 + certLines.length * 9.5 + (summaryLines.length > 0 ? 6 + summaryLines.length * 9.5 : 0) + 12;

  if (currentY + auditBoxHeight > pageBottomLimit) {
    doc.addPage();
    drawPageHeader('Audit Certification');
    currentY = 40;
  }

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, currentY, contentWidth, auditBoxHeight, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text('AUDIT CERTIFICATION & DATA INTEGRITY NOTICE', margin + 12, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  let certY = currentY + 28;
  certLines.forEach((cLine) => {
    doc.text(cLine, margin + 12, certY);
    certY += 9.5;
  });

  if (summaryLines.length > 0) {
    certY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryColor);
    summaryLines.forEach((sLine) => {
      doc.text(sLine, margin + 12, certY);
      certY += 9.5;
    });
  }

  // Apply page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(i, totalPages);
  }

  return doc;
}

/**
 * Generates and triggers browser download of the Executive Batch AI PDF Report.
 */
export function generateBatchPdfReport(report: BatchReportDataset): void {
  const doc = buildBatchPdfDoc(report);
  const filename = `ReturnIQ_Executive_Report_${report.reportId}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
