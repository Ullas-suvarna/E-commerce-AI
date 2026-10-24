import { ReturnRecord } from '@/lib/types';
import { generateProductInsights, ProductInsightResult } from './aiService';
import { sendHighRiskEmailAlert, HighRiskEmailParams } from './emailService';

export interface ProductEmailOutcome {
  status: 'sent' | 'already-notified' | 'skipped' | 'failed';
  message: string;
  timestamp: string;
}

export interface EmailDispatchSummary {
  totalHighRisk: number;
  sentCount: number;
  alreadyNotifiedCount: number;
  failedCount: number;
  skippedCount: number;
  recipientEmail: string;
  details: {
    productName: string;
    riskLevel: string;
    status: 'sent' | 'already-notified' | 'skipped' | 'failed';
    message: string;
  }[];
}

export interface BatchProductItem {
  key: string;
  productName: string;
  sku: string;
  category: string;
  totalReturns: number;
  refundTotal: number;
  highSeverityCount: number;
  riskLevel: 'Critical Issue' | 'High Risk' | 'Medium Risk' | 'Low Risk';
  reasons: Record<string, number>;
  reasonPercentages: Record<string, number>;
  topReason: string;
  topReasonCount: number;
  comments: string[];
  status: 'pending' | 'analyzing' | 'success' | 'failed';
  errorReason?: string;
  insight?: ProductInsightResult;
  emailOutcome?: ProductEmailOutcome;
}

export interface CrossProductPattern {
  pattern: string;
  affectedProducts: string[];
  totalReturns: number;
  severity: 'Critical' | 'High' | 'Medium';
  insight: string;
  recommendedAction: string;
}

export interface BatchReportDataset {
  reportId: string;
  generatedAt: string;
  storeName: string;
  totalReturns: number;
  totalRefundValue: number;
  distinctProductsCount: number;
  dateRange: string;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: { category: string; count: number; percentage: number }[];
  crossProductPatterns: CrossProductPattern[];
  products: BatchProductItem[];
  successCount: number;
  failedCount: number;
  isFreshAnalysis: boolean;
  analyzedAt?: string;
  emailSummary?: EmailDispatchSummary;
}

/**
 * Prepares distinct products and dataset overview metrics from current return records.
 * Uses normalized product identity grouping to guarantee consistency with the application.
 */
export function prepareBatchReportDataset(
  returns: ReturnRecord[],
  storeName: string = 'AeroCraft Commerce'
): BatchReportDataset {
  const prodMap: Record<
    string,
    {
      key: string;
      productName: string;
      sku: string;
      category: string;
      totalReturns: number;
      refundTotal: number;
      highSeverityCount: number;
      reasons: Record<string, number>;
      comments: string[];
    }
  > = {};

  const categoryCounts: Record<string, number> = {};
  let totalRefund = 0;
  const dates: string[] = [];

  returns.forEach((r) => {
    const prodName = (r.productName || '').trim();
    const prodSku = (r.sku || '').trim();
    const key = (prodName || prodSku || 'Unknown Product').toLowerCase();

    if (!prodMap[key]) {
      prodMap[key] = {
        key,
        productName: prodName || prodSku || 'Unknown Product',
        sku: prodSku || 'SKU-GEN',
        category: r.category || 'General',
        totalReturns: 0,
        refundTotal: 0,
        highSeverityCount: 0,
        reasons: {},
        comments: [],
      };
    }

    const item = prodMap[key];
    item.totalReturns += 1;
    const itemRefund = r.refundAmount || r.price || 0;
    item.refundTotal += itemRefund;
    totalRefund += itemRefund;

    const isHighSev =
      r.severity === 'High' ||
      r.severity === 'Critical' ||
      r.severity?.toString().toLowerCase() === 'high' ||
      r.severity?.toString().toLowerCase() === 'critical';

    if (isHighSev) {
      item.highSeverityCount += 1;
    }

    const reason = r.reasonCategory || 'General Issue';
    item.reasons[reason] = (item.reasons[reason] || 0) + 1;

    if (r.customerComment && !item.comments.includes(r.customerComment)) {
      item.comments.push(r.customerComment);
    }

    // Dataset-wide stats
    const cat = r.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    if (r.returnDate) {
      dates.push(r.returnDate);
    }
  });

  // Calculate risk level using existing application formula
  const products: BatchProductItem[] = Object.values(prodMap).map((item) => {
    const reasonPercentages: Record<string, number> = {};
    let topReason = 'Customer Feedback';
    let topReasonCount = 0;

    Object.entries(item.reasons).forEach(([rsn, cnt]) => {
      reasonPercentages[rsn] = item.totalReturns
        ? Math.round((cnt / item.totalReturns) * 100)
        : 0;
      if (cnt > topReasonCount) {
        topReasonCount = cnt;
        topReason = rsn;
      }
    });

    let riskLevel: BatchProductItem['riskLevel'] = 'Low Risk';
    if (item.highSeverityCount > 1 || item.totalReturns >= 4) {
      riskLevel = 'Critical Issue';
    } else if (item.highSeverityCount === 1 || item.totalReturns === 3) {
      riskLevel = 'High Risk';
    } else if (item.totalReturns === 2) {
      riskLevel = 'Medium Risk';
    }

    return {
      key: item.key,
      productName: item.productName,
      sku: item.sku,
      category: item.category,
      totalReturns: item.totalReturns,
      refundTotal: Math.round(item.refundTotal * 100) / 100,
      highSeverityCount: item.highSeverityCount,
      riskLevel,
      reasons: item.reasons,
      reasonPercentages,
      topReason,
      topReasonCount,
      comments: item.comments,
      status: 'pending' as const,
    };
  }).sort((a, b) => b.totalReturns - a.totalReturns);

  // Risk distribution
  const riskDistribution = {
    critical: products.filter((p) => p.riskLevel === 'Critical Issue').length,
    high: products.filter((p) => p.riskLevel === 'High Risk').length,
    medium: products.filter((p) => p.riskLevel === 'Medium Risk').length,
    low: products.filter((p) => p.riskLevel === 'Low Risk').length,
  };

  // Category breakdown
  const totalRet = returns.length;
  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalRet > 0 ? Math.round((count / totalRet) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Date range
  dates.sort();
  const dateRange =
    dates.length > 0
      ? `${dates[0]} to ${dates[dates.length - 1]}`
      : new Date().toLocaleDateString();

  // Detect cross-product systemic patterns
  const crossProductPatterns = identifyCrossProductPatterns(products);

  const reportId = `REP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  return {
    reportId,
    generatedAt: new Date().toLocaleString(),
    storeName,
    totalReturns: returns.length,
    totalRefundValue: Math.round(totalRefund * 100) / 100,
    distinctProductsCount: products.length,
    dateRange,
    riskDistribution,
    categoryBreakdown,
    crossProductPatterns,
    products,
    successCount: 0,
    failedCount: 0,
    isFreshAnalysis: false,
  };
}

/**
 * Identifies cross-product failure patterns where multiple products share common return reasons.
 */
function identifyCrossProductPatterns(products: BatchProductItem[]): CrossProductPattern[] {
  const reasonToProducts: Record<string, { prods: string[]; total: number }> = {};

  products.forEach((p) => {
    Object.entries(p.reasons).forEach(([reason, count]) => {
      if (!reasonToProducts[reason]) {
        reasonToProducts[reason] = { prods: [], total: 0 };
      }
      reasonToProducts[reason].prods.push(p.productName);
      reasonToProducts[reason].total += count;
    });
  });

  const patterns: CrossProductPattern[] = [];

  Object.entries(reasonToProducts).forEach(([reason, data]) => {
    if (data.prods.length >= 2 && data.total >= 3) {
      let severity: CrossProductPattern['severity'] = 'Medium';
      let insight = `Systemic return driver across ${data.prods.length} product lines.`;
      let recommendedAction = `Audit supplier batch quality and standard operating procedures.`;

      const norm = reason.toLowerCase();
      if (norm.includes('defect') || norm.includes('quality') || norm.includes('hardware')) {
        severity = 'Critical';
        insight = `Hardware/Material manufacturing defect clusters detected across multiple lines. Requires immediate factory QC inspection.`;
        recommendedAction = `Issue vendor corrective action request (CAR) and implement pre-shipment lot testing.`;
      } else if (norm.includes('size') || norm.includes('fit')) {
        severity = 'High';
        insight = `Inconsistent apparel grading and size table misalignment causing recurring sizing returns.`;
        recommendedAction = `Update online sizing charts with garment measurement specs and fit recommendations.`;
      } else if (norm.includes('damaged') || norm.includes('broken') || norm.includes('leak')) {
        severity = 'High';
        insight = `Transit vulnerability and packaging barrier breakdown causing in-transit product damage.`;
        recommendedAction = `Upgrade primary protective packaging and transit drop-test cushioning.`;
      }

      patterns.push({
        pattern: reason,
        affectedProducts: data.prods,
        totalReturns: data.total,
        severity,
        insight,
        recommendedAction,
      });
    }
  });

  return patterns.sort((a, b) => b.totalReturns - a.totalReturns);
}

/**
 * Dispatches high-risk email alerts for products that receive a HIGH risk classification.
 * Strictly skips LOW and MEDIUM risk products.
 * Handles deduplication, rate limiting, and failure reporting without blocking.
 */
export async function dispatchBatchHighRiskAlerts(
  products: BatchProductItem[],
  totalDatasetReturns: number,
  recipient: {
    email?: string | null;
    name?: string | null;
  },
  onEmailProgress?: (statusText: string) => void
): Promise<{
  updatedProducts: BatchProductItem[];
  emailSummary: EmailDispatchSummary;
}> {
  const toEmail = recipient.email?.trim() || '';
  const toName = recipient.name?.trim() || 'Store Manager';

  let totalHighRisk = 0;
  let sentCount = 0;
  let alreadyNotifiedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const details: EmailDispatchSummary['details'] = [];
  const updatedProducts = [...products];

  for (let i = 0; i < updatedProducts.length; i++) {
    const prod = updatedProducts[i];

    // Determine if product is classified as HIGH risk by existing risk engine
    const isEngineHigh = prod.riskLevel === 'Critical Issue' || prod.riskLevel === 'High Risk';
    const isAiHigh = prod.insight?.priority === 'high';

    // Strictly skip LOW or MEDIUM risk products
    if (prod.riskLevel === 'Low Risk' || prod.riskLevel === 'Medium Risk') {
      const skipMsg = `Product classified as ${prod.riskLevel}. Email alerts are reserved strictly for HIGH risk products.`;
      prod.emailOutcome = {
        status: 'skipped',
        message: skipMsg,
        timestamp: new Date().toLocaleTimeString(),
      };
      skippedCount++;
      details.push({
        productName: prod.productName,
        riskLevel: prod.riskLevel,
        status: 'skipped',
        message: skipMsg,
      });
      continue;
    }

    // Product is High Risk or Critical Issue
    if (isEngineHigh || isAiHigh) {
      totalHighRisk++;

      // Check if recipient email is missing
      if (!toEmail) {
        const failMsg = 'Store notification email is not configured. Email alert could not be sent.';
        prod.emailOutcome = {
          status: 'failed',
          message: failMsg,
          timestamp: new Date().toLocaleTimeString(),
        };
        failedCount++;
        details.push({
          productName: prod.productName,
          riskLevel: prod.riskLevel,
          status: 'failed',
          message: failMsg,
        });
        continue;
      }

      if (onEmailProgress) {
        onEmailProgress(`Sending alert for ${prod.productName}...`);
      }

      const returnRate =
        totalDatasetReturns > 0
          ? `${Math.round((prod.totalReturns / totalDatasetReturns) * 100)}%`
          : '0%';

      const mainProblem = prod.insight?.mainRecurringProblem || prod.topReason || 'Recurring quality issue detected';
      const evidence = prod.insight?.evidence || `${prod.totalReturns} verified returns (${returnRate} of dataset returns) with ${prod.highSeverityCount} high/critical complaints.`;
      const action = prod.insight?.recommendedBusinessAction || 'Initiate supplier audit and review listing specifications.';

      try {
        const emailRes = await sendHighRiskEmailAlert({
          to_email: toEmail,
          to_name: toName,
          risk_level: prod.riskLevel === 'Critical Issue' ? 'CRITICAL RISK' : 'HIGH RISK',
          product_name: prod.productName,
          category: prod.category,
          return_rate: returnRate,
          main_problem: mainProblem,
          ground_truth_evidence: evidence,
          recommended_action: action,
        });

        if (emailRes.success) {
          if (emailRes.duplicate) {
            alreadyNotifiedCount++;
            prod.emailOutcome = {
              status: 'already-notified',
              message: emailRes.message,
              timestamp: new Date().toLocaleTimeString(),
            };
            details.push({
              productName: prod.productName,
              riskLevel: prod.riskLevel,
              status: 'already-notified',
              message: emailRes.message,
            });
          } else {
            sentCount++;
            prod.emailOutcome = {
              status: 'sent',
              message: emailRes.message,
              timestamp: new Date().toLocaleTimeString(),
            };
            details.push({
              productName: prod.productName,
              riskLevel: prod.riskLevel,
              status: 'sent',
              message: emailRes.message,
            });
          }
        } else {
          failedCount++;
          prod.emailOutcome = {
            status: 'failed',
            message: emailRes.message,
            timestamp: new Date().toLocaleTimeString(),
          };
          details.push({
            productName: prod.productName,
            riskLevel: prod.riskLevel,
            status: 'failed',
            message: emailRes.message,
          });
        }
      } catch (err: any) {
        console.error(`EmailJS error for ${prod.productName}:`, err);
        failedCount++;
        const errDetail = err?.message || 'Failed to dispatch email alert.';
        prod.emailOutcome = {
          status: 'failed',
          message: errDetail,
          timestamp: new Date().toLocaleTimeString(),
        };
        details.push({
          productName: prod.productName,
          riskLevel: prod.riskLevel,
          status: 'failed',
          message: errDetail,
        });
      }

      // Small delay between email dispatches to respect EmailJS rate limits
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  const emailSummary: EmailDispatchSummary = {
    totalHighRisk,
    sentCount,
    alreadyNotifiedCount,
    failedCount,
    skippedCount,
    recipientEmail: toEmail || 'Not Configured',
    details,
  };

  return {
    updatedProducts,
    emailSummary,
  };
}

/**
 * Runs batch AI analysis for all distinct products sequentially with real-time progress callbacks.
 * Isolates state and handles individual product failures gracefully without halting the run.
 * Automatically triggers high-risk email alerts upon completion.
 */
export async function executeBatchAnalysis(
  dataset: BatchReportDataset,
  onProgress: (current: number, total: number, productName: string, percentage: number) => void,
  abortSignal?: { aborted: boolean },
  recipient?: { email?: string | null; name?: string | null },
  onEmailProgress?: (statusText: string) => void
): Promise<BatchReportDataset> {
  const updatedProducts = [...dataset.products];
  let successCount = 0;
  let failedCount = 0;
  const total = updatedProducts.length;

  for (let i = 0; i < total; i++) {
    if (abortSignal?.aborted) {
      break;
    }

    const product = updatedProducts[i];
    product.status = 'analyzing';

    const currentNum = i + 1;
    const pct = Math.round((currentNum / total) * 100);
    onProgress(currentNum, total, product.productName, pct);

    try {
      const insight = await generateProductInsights({
        productName: product.productName,
        sku: product.sku,
        category: product.category,
        totalReturnCount: product.totalReturns,
        reasonCounts: product.reasons,
        reasonPercentages: product.reasonPercentages,
        aiSummaries: product.comments.slice(0, 5),
      });

      product.insight = insight;
      product.status = 'success';
      product.errorReason = undefined;
      successCount++;
    } catch (err: any) {
      console.warn(`Batch analysis failed for product "${product.productName}":`, err);
      product.status = 'failed';
      product.errorReason = err.message || 'AI service error or rate limit reached.';
      failedCount++;
    }

    // Brief delay to be polite to Gemini API rate limits
    if (i < total - 1 && !abortSignal?.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  // After all products are analyzed, trigger high-risk email alerts if not aborted
  let emailSummary: EmailDispatchSummary | undefined;
  if (!abortSignal?.aborted && recipient) {
    if (onEmailProgress) {
      onEmailProgress('Checking and dispatching high-risk email alerts...');
    }
    const emailResult = await dispatchBatchHighRiskAlerts(
      updatedProducts,
      dataset.totalReturns,
      recipient,
      onEmailProgress
    );
    emailSummary = emailResult.emailSummary;
  }

  return {
    ...dataset,
    products: updatedProducts,
    successCount,
    failedCount,
    isFreshAnalysis: true,
    analyzedAt: new Date().toLocaleString(),
    emailSummary,
  };
}
