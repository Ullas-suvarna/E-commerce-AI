import { ReturnRecord } from '@/lib/types';
import {
  CompanyRule,
  ComplaintScreeningRecord,
  ReviewDecision,
  ScreeningMetrics,
  ScreeningStatus,
} from '@/lib/screeningTypes';
import {
  DEFAULT_COMPANY_RULES,
  evaluateCompanyRules,
  maskCustomerName,
} from './companyRulesEngine';
import { interpretComplaintWithGemini } from './complaintAIService';

const SCREENING_STORAGE_PREFIX = 'ai_return_iq_screening_';
const RULES_STORAGE_PREFIX = 'ai_return_iq_rules_';

export function getScreeningStorageKey(uid?: string): string {
  return `${SCREENING_STORAGE_PREFIX}${uid || 'demo'}`;
}

export function getRulesStorageKey(uid?: string): string {
  return `${RULES_STORAGE_PREFIX}${uid || 'demo'}`;
}

/**
 * Loads configured company rules from storage with default fallback
 */
export function loadConfiguredRules(uid?: string): CompanyRule[] {
  if (typeof window === 'undefined') return DEFAULT_COMPANY_RULES;
  try {
    const raw = localStorage.getItem(getRulesStorageKey(uid));
    if (raw) {
      const parsed: CompanyRule[] = JSON.parse(raw);
      // Merge with default rules to ensure any newly added rules exist
      const ruleMap = new Map(parsed.map((r) => [r.id, r]));
      return DEFAULT_COMPANY_RULES.map((def) => {
        const stored = ruleMap.get(def.id);
        return stored ? { ...def, enabled: stored.enabled } : def;
      });
    }
  } catch (err) {
    console.warn('Failed to load rules from localStorage:', err);
  }
  return DEFAULT_COMPANY_RULES;
}

/**
 * Saves company rules configuration
 */
export function saveConfiguredRules(rules: CompanyRule[], uid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getRulesStorageKey(uid), JSON.stringify(rules));
  } catch (err) {
    console.warn('Failed to save rules to localStorage:', err);
  }
}

/**
 * Loads saved screening records from local storage
 */
export function loadStoredScreeningRecords(uid?: string): ComplaintScreeningRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getScreeningStorageKey(uid));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load screening records from localStorage:', err);
  }
  return [];
}

/**
 * Saves screening records to local storage
 */
export function saveStoredScreeningRecords(
  records: ComplaintScreeningRecord[],
  uid?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getScreeningStorageKey(uid), JSON.stringify(records));
  } catch (err) {
    console.warn('Failed to save screening records to localStorage:', err);
  }
}

const REJECTED_STORAGE_PREFIX = 'ai_return_iq_rejected_';

export function getRejectedStorageKey(uid?: string): string {
  return `${REJECTED_STORAGE_PREFIX}${uid || 'demo'}`;
}

/**
 * Loads saved rejected records from local storage
 */
export function loadStoredRejectedRecords(uid?: string): ComplaintScreeningRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getRejectedStorageKey(uid));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load rejected records from localStorage:', err);
  }
  return [];
}

/**
 * Saves rejected records to local storage
 */
export function saveStoredRejectedRecords(
  records: ComplaintScreeningRecord[],
  uid?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getRejectedStorageKey(uid), JSON.stringify(records));
  } catch (err) {
    console.warn('Failed to save rejected records to localStorage:', err);
  }
}

/**
 * Screens all imported return complaints deterministically and optionally augments with Gemini interpretation.
 * Preserves existing reviews and review histories on repeat runs.
 */
export async function screenAllComplaints(
  returns: ReturnRecord[],
  activeRules: CompanyRule[] = DEFAULT_COMPANY_RULES,
  existingScreenings: ComplaintScreeningRecord[] = [],
  onProgress?: (current: number, total: number, returnId: string) => void,
  runAI: boolean = true,
  rejectedReturnIds: Set<string> = new Set()
): Promise<ComplaintScreeningRecord[]> {
  const existingMap = new Map(existingScreenings.map((s) => [s.returnId, s]));
  const results: ComplaintScreeningRecord[] = [];
  const total = returns.length;

  for (let i = 0; i < total; i++) {
    const rec = returns[i];

    // Exclude previously rejected complaints from active screening counts
    if (rejectedReturnIds.has(rec.id) || existingMap.get(rec.id)?.review?.decision === 'rejected') {
      continue;
    }

    const existing = existingMap.get(rec.id);

    if (onProgress) {
      onProgress(i + 1, total, rec.id);
    }

    // 1. Evaluate deterministic company rules
    const triggeredRules = evaluateCompanyRules(rec, returns, activeRules);

    // 2. Obtain Gemini complaint interpretation if enabled
    let aiInterpretation = existing?.aiInterpretation;
    if (runAI && (!aiInterpretation || rec.customerComment !== existing?.customerComment)) {
      try {
        aiInterpretation = await interpretComplaintWithGemini({
          returnId: rec.id,
          productName: rec.productName,
          category: rec.category,
          rating: rec.rating,
          reasonCategory: rec.reasonCategory,
          customerComment: rec.customerComment,
        });
      } catch (err) {
        console.warn(`AI interpretation skipped for ${rec.id}:`, err);
      }
    }

    // 3. Determine screening status
    // If a human reviewer has already approved or rejected, preserve their decision!
    let status: ScreeningStatus = 'no-rule-triggered';
    if (existing?.review?.decision === 'approved') {
      status = 'approved';
    } else if (existing?.review?.decision === 'rejected') {
      status = 'rejected';
    } else if (triggeredRules.length > 0 || (aiInterpretation?.possiblePolicyConcern && aiInterpretation.possiblePolicyConcern !== 'null')) {
      status = 'needs-review';
    }

    // History tracking
    const history = existing?.history ? [...existing.history] : [];
    if (history.length === 0) {
      history.push({
        timestamp: new Date().toLocaleString(),
        action: 'screened',
        details: triggeredRules.length > 0
          ? `Screened against ${activeRules.length} company rules: ${triggeredRules.length} violation(s) flagged.`
          : 'Screened against company rules: All policy checks passed.',
        actor: 'ReturnIQ Screening Engine',
      });
    }

    const screeningRecord: ComplaintScreeningRecord = {
      id: existing?.id || `SCR-${rec.id}`,
      returnId: rec.id,
      orderId: rec.orderId,
      customerName: rec.customerName || 'Customer',
      maskedCustomerName: maskCustomerName(rec.customerName),
      customerEmail: rec.customerEmail,
      productName: rec.productName,
      sku: rec.sku,
      category: rec.category,
      rating: rec.rating,
      price: rec.price,
      refundAmount: rec.refundAmount,
      reasonCategory: rec.reasonCategory,
      customerComment: rec.customerComment,
      returnDate: rec.returnDate,
      severity: rec.severity,
      triggeredRules,
      aiInterpretation,
      status,
      review: existing?.review,
      history,
      screenedAt: existing?.screenedAt || new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
    };

    results.push(screeningRecord);
  }

  return results;
}

export interface SubmitReviewParams {
  screeningId: string;
  decision: 'approved' | 'rejected' | 'pending';
  reason: string;
  reviewer: {
    uid?: string;
    displayName?: string | null;
    email?: string | null;
  };
}

export interface SubmitReviewResult {
  success: boolean;
  message: string;
  updatedRecord?: ComplaintScreeningRecord;
}

/**
 * Records a human reviewer decision on a screened complaint.
 * Enforces mandatory rejection reason and records complete audit trail.
 */
export function recordReviewDecision(
  records: ComplaintScreeningRecord[],
  params: SubmitReviewParams
): { records: ComplaintScreeningRecord[]; result: SubmitReviewResult } {
  const index = records.findIndex((r) => r.id === params.screeningId || r.returnId === params.screeningId);
  if (index === -1) {
    return {
      records,
      result: { success: false, message: `Screening record "${params.screeningId}" not found.` },
    };
  }

  const current = records[index];

  // Enforce mandatory reason for rejection
  if (params.decision === 'rejected') {
    if (!params.reason || !params.reason.trim()) {
      return {
        records,
        result: {
          success: false,
          message: 'A detailed rejection reason is mandatory before finalizing a claim rejection.',
        },
      };
    }
  }

  const reviewerName = params.reviewer.displayName || params.reviewer.email?.split('@')[0] || 'Store Reviewer';
  const reviewerEmail = params.reviewer.email || 'reviewer@store.internal';
  const reviewerId = params.reviewer.uid || 'uid-local-reviewer';

  const review: ReviewDecision = {
    decision: params.decision,
    reviewerId,
    reviewerName,
    reviewerEmail,
    reason: params.reason.trim(),
    reviewedAt: new Date().toLocaleString(),
  };

  const newStatus: ScreeningStatus =
    params.decision === 'approved'
      ? 'approved'
      : params.decision === 'rejected'
      ? 'rejected'
      : current.triggeredRules.length > 0
      ? 'needs-review'
      : 'no-rule-triggered';

  const actionText =
    params.decision === 'approved'
      ? 'Claim Approved'
      : params.decision === 'rejected'
      ? `Claim Rejected: "${params.reason.trim()}"`
      : 'Review set to Pending';

  const updatedHistory = [
    ...current.history,
    {
      timestamp: new Date().toLocaleString(),
      action: params.decision,
      details: actionText,
      actor: `${reviewerName} (${reviewerEmail})`,
    },
  ];

  const updatedRecord: ComplaintScreeningRecord = {
    ...current,
    status: newStatus,
    review,
    history: updatedHistory,
    updatedAt: new Date().toLocaleString(),
  };

  const updatedRecords = [...records];
  updatedRecords[index] = updatedRecord;

  return {
    records: updatedRecords,
    result: {
      success: true,
      message: `Complaint claim successfully marked as ${params.decision.toUpperCase()}.`,
      updatedRecord,
    },
  };
}

/**
 * Calculates executive KPI metrics from screening records
 */
export function calculateScreeningMetrics(
  screenings: ComplaintScreeningRecord[]
): ScreeningMetrics {
  let needsReview = 0;
  let ruleViolationsDetected = 0;
  let reviewsCompleted = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let noRuleCount = 0;

  for (const s of screenings) {
    ruleViolationsDetected += s.triggeredRules.length;

    if (s.status === 'approved') {
      approvedCount++;
      reviewsCompleted++;
    } else if (s.status === 'rejected') {
      rejectedCount++;
      reviewsCompleted++;
    } else if (s.status === 'needs-review') {
      needsReview++;
    } else if (s.status === 'no-rule-triggered') {
      noRuleCount++;
    }
  }

  return {
    totalScreened: screenings.length,
    needsReview,
    ruleViolationsDetected,
    reviewsCompleted,
    approvedCount,
    rejectedCount,
    noRuleCount,
  };
}
