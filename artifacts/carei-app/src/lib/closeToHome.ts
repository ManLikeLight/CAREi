export const CTP_CATEGORIES = ["visit_status", "visit_times", "carer_identity", "planned_times", "story", "reassurance", "meals", "medication", "tasks", "observations", "sensitive_observations", "concerns", "documents"] as const;
export type Category = typeof CTP_CATEGORIES[number];
export type Flags = { can_view: boolean; can_contribute: boolean; can_notify: boolean; client_restricted: boolean };
export type Link = { id: string; clientId: string; clientName: string; personName: string; email: string; relationship: string; authorityType: string; status: string; reviewDueAt: string; expiresAt: string | null; permissions: Record<Category, Flags> };
export type Concern = { id: string; status: string; createdAt: string; acknowledgedAt: string | null; resolvedAt: string | null; clientId?: string; reasonCode?: string; detail?: string; ackDueAt?: string; escalatedAt?: string; resolutionNote?: string };
export type Today = { visits?: { id: string; status?: string; continuity?: string; times?: { start: string; end: string }; plannedTimes?: { start: string }; carer?: { label: string; photo?: string } }[]; story?: string[]; reassurance?: { category: Category; text: string }[]; meals?: string[]; medication?: string[]; tasks?: string[]; observations?: string[]; sensitive_observations?: string[]; canRaiseConcern?: boolean };
export type ManagerData = { sampleOnly: true; clients: { id: string; name: string }[]; links: Link[]; presets: { id: string; name: string }[]; concerns: Concern[]; settings: { carerIdentityEnabled: boolean; concernAckMinutes: number; concernEscalateMinutes: number; escalationContacts: string[] }; overdueReviews: number; notifications: { id: string; type: string; channel: string; status: string; text: string; createdAt: string }[]; carers: { id: string; name: string; showName: boolean; showPhoto: boolean }[] };
const API = "/api/ctp";
export class AccessUnavailable extends Error {}
export async function ctp<T>(path: string, options: { method?: string; body?: unknown; staffToken?: string } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: options.method ?? "GET", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-CTP-Request": "1", ...(options.staffToken ? { Authorization: `Bearer ${options.staffToken}` } : {}) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.code === "ACCESS_UNAVAILABLE") throw new AccessUnavailable("Access unavailable, please contact the agency.");
    throw new Error(data.error || "Request failed. Please try again.");
  }
  return data as T;
}
