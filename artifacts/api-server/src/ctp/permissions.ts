export const CATEGORIES = ["visit_status", "visit_times", "carer_identity", "planned_times", "story", "reassurance", "meals", "medication", "tasks", "observations", "sensitive_observations", "concerns", "documents"] as const;
export type Category = typeof CATEGORIES[number];
export type Action = "view" | "contribute" | "notify";
export type Flags = { can_view: boolean; can_contribute: boolean; can_notify: boolean; client_restricted: boolean };
export const emptyFlags = (): Flags => ({ can_view: false, can_contribute: false, can_notify: false, client_restricted: false });
export function allowed(link: { status: string; expires_at: Date | null }, flags: Flags | undefined, action: Action, now = new Date()): boolean {
  if (link.status !== "active" || (link.expires_at && link.expires_at <= now) || !flags || flags.client_restricted) return false;
  if (action === "notify") return flags.can_view && flags.can_notify;
  return action === "view" ? flags.can_view : flags.can_contribute;
}
export function identityLabel(agencyEnabled: boolean, privacy: { show_name: boolean; show_photo: boolean; name: string; photo?: string }, flags: boolean, count: number) {
  if (agencyEnabled && privacy.show_name && flags) {
    return { label: privacy.name, ...(privacy.show_photo && privacy.photo ? { photo: privacy.photo } : {}) };
  }
  return { label: count > 1 ? `A carer they have seen ${count} times this month` : "Your regular carer" };
}
export function presetPermissions(kind: "primary" | "trusted" | "limited"): Record<Category, Flags> {
  return Object.fromEntries(CATEGORIES.map(category => {
    const view = kind === "primary"
      ? !["sensitive_observations", "documents"].includes(category)
      : kind === "trusted"
        ? !["medication", "sensitive_observations", "documents"].includes(category)
        : ["visit_status", "planned_times", "story", "reassurance", "concerns"].includes(category);
    return [category, { can_view: view, can_contribute: category === "concerns", can_notify: view && ["concerns", "visit_status"].includes(category), client_restricted: false }];
  })) as Record<Category, Flags>;
}
