import { SeverityLevel } from './types';

export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RuleCategory =
  | 'data-integrity'
  | 'duplicate-claim'
  | 'policy-compliance'
  | 'content-validation';

export interface CompanyRule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  category: RuleCategory;
  enabled: boolean;
  defaultConfig?: Record<string, any>;
}

export interface RuleTriggerResult {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  category: RuleCategory;
  explanation: string;
  supportingEvidence: string;
}

export interface GeminiComplaintInterpretation {
  summary: string;
  possiblePolicyConcern: string | null;
  explanation: string;
  supportingEvidence: string;
  missingInformation: string | null;
  confidence: 'high' | 'medium' | 'low';
  analyzedAt: string;
  disclaimer: string;
}

export type ScreeningStatus =
  | 'no-rule-triggered'
  | 'needs-review'
  | 'approved'
  | 'rejected';

export interface ReviewHistoryEntry {
  timestamp: string;
  action: 'screened' | 'approved' | 'rejected' | 'pending' | 'rule-toggled' | 'restored';
  details: string;
  actor: string;
}

export interface ReviewDecision {
  decision: 'approved' | 'rejected' | 'pending';
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  reason: string;
  reviewedAt: string;
}

export interface ComplaintScreeningRecord {
  id: string;
  returnId: string;
  orderId: string;
  customerName: string;
  maskedCustomerName: string;
  customerEmail?: string;
  productName: string;
  sku: string;
  category: string;
  rating?: number;
  price: number;
  refundAmount?: number;
  reasonCategory?: string;
  customerComment: string;
  returnDate: string;
  severity: SeverityLevel;
  triggeredRules: RuleTriggerResult[];
  aiInterpretation?: GeminiComplaintInterpretation;
  status: ScreeningStatus;
  review?: ReviewDecision;
  history: ReviewHistoryEntry[];
  screenedAt: string;
  updatedAt: string;
}

export interface ScreeningMetrics {
  totalScreened: number;
  needsReview: number;
  ruleViolationsDetected: number;
  reviewsCompleted: number;
  approvedCount: number;
  rejectedCount: number;
  noRuleCount: number;
}
