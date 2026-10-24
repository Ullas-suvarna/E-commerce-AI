import { ReturnRecord } from '@/lib/types';
import { CompanyRule, RuleTriggerResult } from '@/lib/screeningTypes';

/**
 * Standard Default Company Policy Rules
 * Evaluated strictly against verified available ReturnRecord data.
 */
export const DEFAULT_COMPANY_RULES: CompanyRule[] = [
  {
    id: 'RULE-DUP-RETURN-ID',
    name: 'Duplicate Return ID Submission',
    description: 'Flags records that share an identical Return ID within the catalog or import batch.',
    severity: 'critical',
    category: 'data-integrity',
    enabled: true,
  },
  {
    id: 'RULE-MISSING-COMMENT',
    name: 'Hollow or Missing Defect Information',
    description: 'Flags complaints with empty, whitespace-only, or non-descriptive placeholder text.',
    severity: 'high',
    category: 'content-validation',
    enabled: true,
    defaultConfig: { minCommentLength: 6 },
  },
  {
    id: 'RULE-IDENTICAL-SUBMISSION',
    name: 'Identical Customer Duplicate Submission',
    description: 'Flags identical complaints submitted multiple times by the same customer for the same product.',
    severity: 'high',
    category: 'duplicate-claim',
    enabled: true,
  },
  {
    id: 'RULE-RATING-SENTIMENT-MISMATCH',
    name: 'Satisfaction Rating vs Complaint Discrepancy',
    description: 'Flags claims where a 5-star perfect satisfaction rating is paired with severe/critical defect claims.',
    severity: 'medium',
    category: 'policy-compliance',
    enabled: true,
  },
  {
    id: 'RULE-REFUND-EXCEEDS-PRICE',
    name: 'Claimed Refund Exceeds Purchase Price',
    description: 'Flags return requests where requested refund value exceeds the recorded unit price.',
    severity: 'critical',
    category: 'policy-compliance',
    enabled: true,
  },
  {
    id: 'RULE-UNVERIFIED-DAMAGE-CLAIM',
    name: 'Unsubstantiated Physical Damage Claim',
    description: 'Flags damaged product categories that provide under 15 characters of physical damage description.',
    severity: 'low',
    category: 'content-validation',
    enabled: true,
    defaultConfig: { minDamageDescriptionLength: 15 },
  },
];

/**
 * Helper to mask customer names for privacy compliance (e.g. "Alex Rivera" -> "A*** R***")
 */
export function maskCustomerName(fullName?: string): string {
  if (!fullName || !fullName.trim()) return 'Anonymous Customer';
  const parts = fullName.trim().split(/\s+/);
  return parts
    .map((part) => {
      if (part.length <= 1) return part;
      return `${part[0]}${'*'.repeat(Math.min(3, part.length - 1))}`;
    })
    .join(' ');
}

const PLACEHOLDER_COMMENTS = new Set([
  'n/a',
  'none',
  'na',
  'nil',
  'null',
  'no',
  'test',
  'no reason',
  'nothing',
  'asdf',
  'asdfgh',
  '...',
  '-',
  '--',
]);

/**
 * Evaluates all active deterministic company policy rules for a single return record.
 * Uses exact evidence from available records without guessing unobserved data.
 */
export function evaluateCompanyRules(
  record: ReturnRecord,
  allRecords: ReturnRecord[],
  activeRules: CompanyRule[] = DEFAULT_COMPANY_RULES
): RuleTriggerResult[] {
  const triggered: RuleTriggerResult[] = [];
  const rulesMap = new Map(activeRules.map((r) => [r.id, r]));

  const commentTrimmed = (record.customerComment || '').trim();
  const commentLower = commentTrimmed.toLowerCase();

  // 1. RULE-DUP-RETURN-ID: Duplicate return ID
  const ruleDupId = rulesMap.get('RULE-DUP-RETURN-ID');
  if (ruleDupId?.enabled && record.id) {
    const idMatches = allRecords.filter(
      (r) => (r.id || '').trim().toLowerCase() === record.id.trim().toLowerCase()
    );
    if (idMatches.length > 1) {
      triggered.push({
        ruleId: ruleDupId.id,
        ruleName: ruleDupId.name,
        severity: ruleDupId.severity,
        category: ruleDupId.category,
        explanation: `Multiple return records (${idMatches.length}) share the exact same Return ID.`,
        supportingEvidence: `Return ID "${record.id}" appears across ${idMatches.length} entries in the catalog (Products: ${idMatches.map((m) => m.productName).slice(0, 2).join(', ')}).`,
      });
    }
  }

  // 2. RULE-MISSING-COMMENT: Empty or hollow placeholder comment
  const ruleMissingComment = rulesMap.get('RULE-MISSING-COMMENT');
  if (ruleMissingComment?.enabled) {
    const minLen = ruleMissingComment.defaultConfig?.minCommentLength ?? 6;
    const isPlaceholder = PLACEHOLDER_COMMENTS.has(commentLower);
    const isTooShort = commentTrimmed.length < minLen;

    if (isPlaceholder || isTooShort) {
      triggered.push({
        ruleId: ruleMissingComment.id,
        ruleName: ruleMissingComment.name,
        severity: ruleMissingComment.severity,
        category: ruleMissingComment.category,
        explanation: isPlaceholder
          ? `Complaint text contains placeholder term ("${commentTrimmed}") rather than specific defect information.`
          : `Complaint text is only ${commentTrimmed.length} character(s) (minimum ${minLen} characters required by store policy).`,
        supportingEvidence: commentTrimmed.length > 0
          ? `Recorded comment: "${commentTrimmed}"`
          : 'Customer comment field was submitted completely blank.',
      });
    }
  }

  // 3. RULE-IDENTICAL-SUBMISSION: Identical submission by the same customer
  const ruleIdentical = rulesMap.get('RULE-IDENTICAL-SUBMISSION');
  if (
    ruleIdentical?.enabled &&
    record.customerName &&
    record.customerName.trim().length > 1 &&
    commentTrimmed.length > 5
  ) {
    const customerNorm = record.customerName.trim().toLowerCase();
    const productNorm = (record.productName || record.sku || '').trim().toLowerCase();

    const identicalMatches = allRecords.filter((r) => {
      if (r === record) return false;
      const sameCustomer = (r.customerName || '').trim().toLowerCase() === customerNorm;
      const sameProduct =
        (r.productName || '').trim().toLowerCase() === productNorm ||
        (r.sku && record.sku && r.sku.trim().toLowerCase() === record.sku.trim().toLowerCase());
      const sameComment = (r.customerComment || '').trim().toLowerCase() === commentLower;
      return sameCustomer && sameProduct && sameComment;
    });

    if (identicalMatches.length > 0) {
      triggered.push({
        ruleId: ruleIdentical.id,
        ruleName: ruleIdentical.name,
        severity: ruleIdentical.severity,
        category: ruleIdentical.category,
        explanation: `Customer submitted identical complaint text multiple times (${identicalMatches.length + 1} total submissions) for the same product.`,
        supportingEvidence: `Customer "${maskCustomerName(record.customerName)}" has ${identicalMatches.length + 1} records with exact match comment: "${commentTrimmed.slice(0, 70)}..."`,
      });
    }
  }

  // 4. RULE-RATING-SENTIMENT-MISMATCH: 5-star rating with severe complaint
  const ruleRatingMismatch = rulesMap.get('RULE-RATING-SENTIMENT-MISMATCH');
  if (ruleRatingMismatch?.enabled && record.rating !== undefined && record.rating !== null) {
    const isFiveStar = record.rating === 5;
    const isCriticalSeverity = record.severity === 'Critical' || record.severity === 'High';
    const hasDefectCategory =
      record.reasonCategory === 'Damaged Product' ||
      record.reasonCategory === 'Product Quality' ||
      record.reasonCategory === 'Wrong Product';

    const severeKeywords = [
      'defective',
      'broken',
      'damaged',
      'terrible',
      'worst',
      'garbage',
      'ruined',
      'hazard',
      'shattered',
      'never worked',
      'stopped working',
      'fake',
      'counterfeit',
    ];
    const containsSevereKeyword = severeKeywords.some((kw) => commentLower.includes(kw));

    if (isFiveStar && (isCriticalSeverity || hasDefectCategory) && containsSevereKeyword) {
      triggered.push({
        ruleId: ruleRatingMismatch.id,
        ruleName: ruleRatingMismatch.name,
        severity: ruleRatingMismatch.severity,
        category: ruleRatingMismatch.category,
        explanation: 'Contradictory claim: 5/5 star perfect rating submitted alongside a severe/critical physical defect complaint.',
        supportingEvidence: `Rating: 5/5 stars | Category: "${record.reasonCategory}" | Severity: "${record.severity}" | Comment cites: "${commentTrimmed.slice(0, 80)}"`,
      });
    }
  }

  // 5. RULE-REFUND-EXCEEDS-PRICE: Refund exceeds purchase price
  const ruleRefundExceeds = rulesMap.get('RULE-REFUND-EXCEEDS-PRICE');
  if (
    ruleRefundExceeds?.enabled &&
    record.refundAmount !== undefined &&
    record.refundAmount !== null &&
    record.price !== undefined &&
    record.price !== null &&
    record.price > 0
  ) {
    if (record.refundAmount > record.price + 0.01) {
      const excess = (record.refundAmount - record.price).toFixed(2);
      triggered.push({
        ruleId: ruleRefundExceeds.id,
        ruleName: ruleRefundExceeds.name,
        severity: ruleRefundExceeds.severity,
        category: ruleRefundExceeds.category,
        explanation: `Claimed refund amount ($${record.refundAmount.toFixed(2)}) exceeds unit purchase price ($${record.price.toFixed(2)}).`,
        supportingEvidence: `Purchase Price: $${record.price.toFixed(2)} vs Claimed Refund: $${record.refundAmount.toFixed(2)} (Excess discrepancy of +$${excess}).`,
      });
    }
  }

  // 6. RULE-UNVERIFIED-DAMAGE-CLAIM: Damaged product claim without physical detail
  const ruleUnverifiedDamage = rulesMap.get('RULE-UNVERIFIED-DAMAGE-CLAIM');
  if (ruleUnverifiedDamage?.enabled && record.reasonCategory === 'Damaged Product') {
    const minDamageLen = ruleUnverifiedDamage.defaultConfig?.minDamageDescriptionLength ?? 15;
    if (commentTrimmed.length < minDamageLen) {
      triggered.push({
        ruleId: ruleUnverifiedDamage.id,
        ruleName: ruleUnverifiedDamage.name,
        severity: ruleUnverifiedDamage.severity,
        category: ruleUnverifiedDamage.category,
        explanation: `Physical damage category selected but comment description is fewer than ${minDamageLen} characters.`,
        supportingEvidence: `Reason category is "Damaged Product", but comment description is only ${commentTrimmed.length} characters: "${commentTrimmed}".`,
      });
    }
  }

  return triggered;
}
