import type { Category } from "./permissions";
export type Source = { id: string; visit_id: string; source_type: string; category: Category; value: string };
export type Sentence = { text: string; category: Category; source_ids: string[] };
const typeFor: Partial<Record<Category, string>> = { visit_status: "visit", visit_times: "visit", planned_times: "visit", medication: "medication", meals: "meal", tasks: "task", observations: "observation", sensitive_observations: "observation" };
export function validateStory(output: unknown, visitId: string, sources: Source[]): Sentence[] {
  if (!output || typeof output !== "object" || !Array.isArray((output as { sentences?: unknown }).sentences)) throw new Error("Invalid story JSON");
  const map = new Map(sources.filter(s => s.visit_id === visitId).map(s => [s.id, s]));
  const result: Sentence[] = [];
  for (const raw of (output as { sentences: unknown[] }).sentences) {
    if (!raw || typeof raw !== "object") throw new Error("Invalid sentence");
    const s = raw as Sentence;
    if (typeof s.text !== "string" || !s.text.trim() || s.text.length > 600 || !Array.isArray(s.source_ids)) throw new Error("Invalid sentence");
    if (!s.source_ids.length) continue;
    if (!typeFor[s.category] || s.source_ids.some(id => !map.has(id) || map.get(id)!.source_type !== typeFor[s.category] || map.get(id)!.category !== s.category)) throw new Error("Source or category mismatch");
    if (/\b(diagnos|probably|likely|suggests|may indicate|should take|recommend|stable|deteriorat|healthy|unwell)\w*/i.test(s.text)) throw new Error("Medical interpretation not allowed");
    result.push({ text: s.text, category: s.category, source_ids: [...new Set(s.source_ids)] });
  }
  if (!result.length) throw new Error("No grounded sentences");
  return result;
}
// No arbitrary narrative, history, client names or clinical inference.
export function templateStory(sources: Source[]): Sentence[] {
  const prefixes: Partial<Record<Category, string>> = { visit_status: "The visit was ", visit_times: "Care took place ", planned_times: "The visit was planned for ", medication: "Medication record: ", meals: "Meal support: ", tasks: "Care task: ", observations: "Recorded observation: ", sensitive_observations: "Recorded observation: " };
  return sources.filter(s => prefixes[s.category]).map(s => ({ text: `${prefixes[s.category]}${s.value}.`, category: s.category, source_ids: [s.id] }));
}
