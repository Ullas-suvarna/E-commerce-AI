export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type ReturnStatus = 'Unanalyzed' | 'Processing' | 'Analyzed';

export type AllowedCategory =
  | 'Size/Fit'
  | 'Product Quality'
  | 'Damaged Product'
  | 'Wrong Product'
  | 'Missing Item'
  | 'Product Description'
  | 'Color/Appearance'
  | 'Compatibility'
  | 'Delivery Issue'
  | 'Packaging'
  | 'Customer Preference'
  | 'Other';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface AIAnalysisResult {
  reason?: string;
  category?: string;
  severity?: 'high' | 'medium' | 'low' | SeverityLevel;
  sentiment?: 'positive' | 'neutral' | 'negative' | string;
  summary?: string;
  recommendedAction?: string;
  confidence?: number;
  analyzedAt?: string;

  // Backward compatibility optional aliases
  mainReason?: string;
  issueCategory?: string;
  customerSentiment?: string;
  shortSummary?: string;
  identifiedReason?: string;
  rootCause?: string;
  suggestedCategory?: string;
  sentimentScore?: number;
}

export interface ReturnRecord {
  id: string;
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  sku: string;
  productName: string;
  category: string;
  price: number;
  rating?: number;
  returnDate: string;
  reasonCategory: string;
  customerComment: string;
  severity: SeverityLevel;
  status: ReturnStatus;
  aiAnalysis?: AIAnalysisResult;
  refundAmount?: number;
}

export interface ProductSummary {
  sku: string;
  name: string;
  category: string;
  price: number;
  totalSold: number;
  totalReturned: number;
  returnRate: number;
  severityScore: number;
  topReturnReason: string;
  riskStatus: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Critical Issue';
  image?: string;
}

export interface ReturnPattern {
  id: string;
  title: string;
  category: string;
  affectedSkus: string[];
  affectedProductsCount: number;
  totalReturnCount: number;
  severity: SeverityLevel;
  patternDescription: string;
  rootCauseAnalysis: string;
  recommendedActions: string[];
  estimatedCostImpact: number;
  status: 'Detected' | 'In Review' | 'Action Taken' | 'Resolved';
  detectedDate: string;
}

export interface ReturnFilterState {
  searchQuery: string;
  status: string;
  severity: string;
  category: string;
  dateRange: '7d' | '30d' | '90d' | 'all';
}
