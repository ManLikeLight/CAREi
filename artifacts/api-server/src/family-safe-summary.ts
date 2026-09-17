export const SAFE_MOODS = ["Good", "Neutral", "Low", "Anxious", "Tired"] as const;
export const SAFE_MEALS = ["Full", "Half", "Refused"] as const;
export const SAFE_ACTIVITIES = ["Prepare breakfast", "Assist with mobility", "Record mood"] as const;
export type SafeMood = (typeof SAFE_MOODS)[number];
export type SafeMeal = (typeof SAFE_MEALS)[number];
export type SafeFacts = {
  clientFirstName: string;
  completedAt: string;
  mood?: SafeMood;
  mealStatus?: SafeMeal;
  fluidGlasses?: number;
  completedActivities: (typeof SAFE_ACTIVITIES)[number][];
};
export type SafeVisitSource = {
  clientName: string; completedAt: Date;
  mood: string | null; mealStatus: string | null; fluidGlasses: number | null;
  completedActivities: unknown;
};
export function extractFamilySafeFacts(visit: SafeVisitSource): SafeFacts {
  const completedActivities = Array.isArray(visit.completedActivities)
    ? visit.completedActivities.filter((x): x is SafeFacts["completedActivities"][number] =>
      typeof x === "string" && (SAFE_ACTIVITIES as readonly string[]).includes(x))
    : [];
  return {
    clientFirstName: visit.clientName.split(/\s+/)[0],
    completedAt: visit.completedAt.toISOString(),
    ...(SAFE_MOODS.includes(visit.mood as SafeMood) ? { mood: visit.mood as SafeMood } : {}),
    ...(SAFE_MEALS.includes(visit.mealStatus as SafeMeal) ? { mealStatus: visit.mealStatus as SafeMeal } : {}),
    ...(typeof visit.fluidGlasses === "number" && visit.fluidGlasses >= 0 && visit.fluidGlasses <= 50 ? { fluidGlasses: visit.fluidGlasses } : {}),
    completedActivities,
  };
}
export function availableFactIds(facts: SafeFacts): string[] {
  return ["completion", ...(facts.mood ? ["mood"] : []), ...(facts.mealStatus ? ["meal"] : []),
    ...(facts.fluidGlasses !== undefined ? ["fluid"] : []), ...facts.completedActivities.map((x) => `activity:${x}`)];
}
export function validateFactSelection(selection: unknown, facts: SafeFacts): string[] {
  if (!selection || typeof selection !== "object") throw new Error("Invalid selection");
  const ids = (selection as { factIds?: unknown }).factIds;
  const allowed = availableFactIds(facts);
  if (!Array.isArray(ids) || ids.length !== allowed.length || new Set(ids).size !== ids.length ||
      ids.some((id) => typeof id !== "string" || !allowed.includes(id))) throw new Error("Ungrounded or incomplete fact selection");
  return ids;
}
export function renderFamilySummary(facts: SafeFacts, ids: string[]): string {
  return ids.map((id) => id === "completion" ? `${facts.clientFirstName}'s visit was completed at ${facts.completedAt}.`
    : id === "mood" ? `${facts.clientFirstName}'s mood was observed as ${facts.mood}.`
    : id === "meal" ? facts.mealStatus === "Full" ? `${facts.clientFirstName} ate the full meal offered.` : facts.mealStatus === "Half" ? `${facts.clientFirstName} ate about half of the meal offered.` : `${facts.clientFirstName} did not eat the offered meal.`
    : id === "fluid" ? `${facts.clientFirstName} had ${facts.fluidGlasses} glasses of fluid.`
    : `${facts.clientFirstName} completed ${id.slice(9).toLowerCase()}.`).join(" ");
}