export type TicketCategory = "creator" | "collector" | "billing" | "safety" | "technical" | "general";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type TicketStatus =
  | "open"
  | "awaiting_agent"
  | "awaiting_user"
  | "in_progress"
  | "resolved"
  | "closed";

export type TicketResolution =
  | "resolved"
  | "cannot_reproduce"
  | "duplicate"
  | "wontfix"
  | "escalated";

export type SupportTicket = {
  id: string;
  accountId: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  assignedAgentId: string | null;
  resolution: TicketResolution | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  slaDeadline: string | null;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: "user" | "agent" | "system";
  body: string;
  attachments: TicketAttachment[];
  createdAt: string;
};

export type TicketAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

export type SupportAgent = {
  id: string;
  handle: string;
  permissions: AgentPermission[];
  activeTicketCount: number;
};

export type AgentPermission =
  | "view_tickets"
  | "respond_tickets"
  | "assign_tickets"
  | "close_tickets"
  | "view_accounts"
  | "repair_entitlements"
  | "escalate";

export type AgentAuditEntry = {
  id: string;
  agentId: string;
  action: string;
  ticketId: string | null;
  targetAccountId: string | null;
  details: string;
  performedAt: string;
};

export type SlaConfig = {
  priority: TicketPriority;
  firstResponseHours: number;
  resolutionHours: number;
};

export const SLA_CONFIGS: readonly SlaConfig[] = [
  { priority: "urgent", firstResponseHours: 1, resolutionHours: 4 },
  { priority: "high", firstResponseHours: 4, resolutionHours: 24 },
  { priority: "medium", firstResponseHours: 8, resolutionHours: 72 },
  { priority: "low", firstResponseHours: 24, resolutionHours: 168 },
] as const;

export function getSlaConfig(priority: TicketPriority): SlaConfig {
  return SLA_CONFIGS.find((c) => c.priority === priority)!;
}

export function computeSlaDeadline(priority: TicketPriority, createdAtIso: string): string {
  const config = getSlaConfig(priority);
  const deadline = new Date(createdAtIso);
  deadline.setTime(deadline.getTime() + config.firstResponseHours * 3_600_000);
  return deadline.toISOString();
}

export function isSlaBreached(ticket: SupportTicket, nowIso: string): boolean {
  if (!ticket.slaDeadline) return false;
  return nowIso > ticket.slaDeadline && ticket.status !== "resolved" && ticket.status !== "closed";
}

export function canAssignTicket(agent: SupportAgent): boolean {
  return agent.permissions.includes("assign_tickets");
}

export function routeTicket(category: TicketCategory): string {
  switch (category) {
    case "safety":
      return "safety_queue";
    case "billing":
      return "billing_queue";
    case "creator":
    case "collector":
      return "general_queue";
    case "technical":
      return "engineering_queue";
    case "general":
      return "general_queue";
  }
}

export type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
};

export type EscalationPath = {
  fromQueue: string;
  toQueue: string;
  criteria: string;
};

export const ESCALATION_PATHS: readonly EscalationPath[] = [
  { fromQueue: "general_queue", toQueue: "safety_queue", criteria: "safety concern identified" },
  { fromQueue: "general_queue", toQueue: "engineering_queue", criteria: "technical investigation needed" },
  { fromQueue: "safety_queue", toQueue: "ops_lead", criteria: "requires ops-lead decision" },
] as const;

export const ESCALATION_DOCUMENTATION =
  "every escalation must document: the reason for escalation, what was attempted, " +
  "and what decision is needed from the next tier. undocumented escalations are returned.";
