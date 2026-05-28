const SOLICITATION_PATTERNS: RegExp[] = [
  /\b(sell|selling|sold)\b.{0,40}\b(cert(ificate)?|ownership|edition)\b/i,
  /\bflip(ping)?\b/i,
  /\b(listing|list(ed)?)\b.{0,30}\b(for sale|resale|usd|\$)/i,
  /\bwilling to (sell|transfer)\b/i,
  /\bmake (me|you) an offer\b/i,
  /\b(price|asking).{0,20}\b(usd|\$|dollars?)\b/i,
  /\bdm (me|for) (price|offer|deal)\b/i,
  /\b(resale|re-sale)\b.{0,20}\b(price|offer|deal|usd|\$)/i
];

const NORMAL_CREATOR_COLLECTOR_PATTERNS: RegExp[] = [
  /\bcollect\b/i,
  /\bdrop\b/i,
  /\bwork\b/i,
  /\bcertificate\b.{0,20}\b(preview|view|show|beautiful|love|amazing)\b/i,
  /\bthank\b/i,
  /\bfeedback\b/i,
  /\bquestion\b/i
];

export type ResaleSolicitationCheckResult = {
  detected: boolean;
  matchedPatterns: string[];
  likelyRelationshipMessage: boolean;
};

export function detectReseleSolicitation(
  message: string
): ResaleSolicitationCheckResult {
  const matchedPatterns: string[] = [];

  for (const pattern of SOLICITATION_PATTERNS) {
    if (pattern.test(message)) {
      matchedPatterns.push(pattern.source);
    }
  }

  const likelyRelationshipMessage =
    matchedPatterns.length === 0 &&
    NORMAL_CREATOR_COLLECTOR_PATTERNS.some((p) => p.test(message));

  return {
    detected: matchedPatterns.length > 0,
    matchedPatterns,
    likelyRelationshipMessage
  };
}

export type ResaleTransferRuleContext = {
  resaleAllowed: boolean;
  requiresCreatorApproval: boolean;
};

export function isSolicitationPermittedByTransferRules(
  context: ResaleTransferRuleContext | null
): boolean {
  if (!context) return false;
  return context.resaleAllowed && !context.requiresCreatorApproval;
}
