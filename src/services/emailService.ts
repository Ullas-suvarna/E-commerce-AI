import emailjs from '@emailjs/browser';

export interface HighRiskEmailParams {
  to_email: string;
  to_name: string;
  risk_level: string;
  product_name: string;
  category: string;
  return_rate: string;
  main_problem: string;
  ground_truth_evidence: string;
  recommended_action: string;
}

export interface SendEmailResult {
  success: boolean;
  duplicate?: boolean;
  message: string;
}

// In-memory registry to prevent duplicate alerts from rerenders or identical repeated triggers
const dispatchedAlerts = new Set<string>();
const pendingDispatches = new Set<string>();

/**
 * Computes a unique signature for an analysis alert to identify duplicates
 */
export function getAlertSignature(params: {
  product_name: string;
  category: string;
  main_problem: string;
  ground_truth_evidence: string;
}): string {
  return `${params.product_name.trim().toLowerCase()}::${params.category.trim().toLowerCase()}::${params.main_problem.trim()}::${params.ground_truth_evidence.trim()}`;
}

export function resetDispatchedAlertsForTesting(): void {
  dispatchedAlerts.clear();
  pendingDispatches.clear();
}

/**
 * Sends a high-risk product email alert via EmailJS.
 * Only sends for high risk analyses. Automatically deduplicates repeated identical calls.
 */
export async function sendHighRiskEmailAlert(
  params: HighRiskEmailParams
): Promise<SendEmailResult> {
  // Validate recipient email
  if (!params.to_email || !params.to_email.trim()) {
    return {
      success: false,
      message: 'Store notification email is not configured. Please set a notification email.',
    };
  }

  // Ensure we are in a browser environment since EmailJS browser SDK requires window/browser APIs
  if (typeof window === 'undefined') {
    return {
      success: false,
      message: 'EmailJS browser dispatch can only execute in client browser environments.',
    };
  }

  const serviceId =
    process.env.VITE_EMAILJS_SERVICE_ID ||
    process.env.NEXT_PUBLIC_VITE_EMAILJS_SERVICE_ID ||
    '';

  const templateId =
    process.env.VITE_EMAILJS_TEMPLATE_ID ||
    process.env.NEXT_PUBLIC_VITE_EMAILJS_TEMPLATE_ID ||
    '';

  const publicKey =
    process.env.VITE_EMAILJS_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_VITE_EMAILJS_PUBLIC_KEY ||
    '';

  if (!serviceId || !templateId || !publicKey) {
    return {
      success: false,
      message: 'EmailJS credentials (service ID, template ID, or public key) are missing.',
    };
  }

  const signature = getAlertSignature({
    product_name: params.product_name,
    category: params.category,
    main_problem: params.main_problem,
    ground_truth_evidence: params.ground_truth_evidence,
  });

  // Prevent duplicate sending if this exact analysis has already been dispatched
  if (dispatchedAlerts.has(signature)) {
    return {
      success: true,
      duplicate: true,
      message: `Alert already sent for ${params.product_name}. Duplicate skipped.`,
    };
  }

  // Prevent concurrent duplicate calls while an alert is in flight
  if (pendingDispatches.has(signature)) {
    return {
      success: true,
      duplicate: true,
      message: `Alert dispatch for ${params.product_name} is already in progress.`,
    };
  }

  pendingDispatches.add(signature);

  try {
    const templateParams: Record<string, unknown> = {
      to_email: params.to_email,
      to_name: params.to_name,
      risk_level: params.risk_level,
      product_name: params.product_name,
      category: params.category,
      return_rate: params.return_rate,
      main_problem: params.main_problem,
      ground_truth_evidence: params.ground_truth_evidence,
      recommended_action: params.recommended_action,
    };

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      {
        publicKey,
      }
    );

    dispatchedAlerts.add(signature);

    return {
      success: true,
      message: `High-risk alert email successfully sent to ${params.to_email} (Status: ${response.status}).`,
    };
  } catch (error: any) {
    console.error('EmailJS high-risk alert error:', error);
    const errMsg =
      error?.text ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to send alert email via EmailJS.');

    return {
      success: false,
      message: errMsg,
    };
  } finally {
    pendingDispatches.delete(signature);
  }
}
