import assert from "node:assert/strict";
import test from "node:test";
import { extractFamilySafeFacts, availableFactIds, validateFactSelection, renderFamilySummary } from "../src/family-safe-summary";
import { eligibleFamilyConsent } from "../src/family-consent";

const source = {
  clientName: "Mary Johnson", completedAt: new Date("2026-01-01T10:00:00Z"),
  mood: "Good", mealStatus: "Half", fluidGlasses: 2,
  completedActivities: ["Prepare breakfast", "evil secret"],
  notes: "MEDICATION secret", carerName: "SECRET", carerEmail: "secret@example.test", agency: "SECRET",
};
test("family extraction excludes adversarial and unknown fields", () => {
  const facts = extractFamilySafeFacts(source);
  assert.deepEqual(facts, { clientFirstName: "Mary", completedAt: "2026-01-01T10:00:00.000Z", mood: "Good", mealStatus: "Half", fluidGlasses: 2, completedActivities: ["Prepare breakfast"] });
  assert.equal(JSON.stringify(facts).includes("SECRET"), false);
});
test("selection is complete, unique, and renderer is bounded", () => {
  const facts = extractFamilySafeFacts(source);
  const ids = availableFactIds(facts);
  assert.deepEqual(validateFactSelection({ factIds: ids }, facts), ids);
  for (const bad of [ids.slice(1), [...ids, "mood"], [...ids.slice(0, -1), ids[0]]]) assert.throws(() => validateFactSelection({ factIds: bad }, facts));
  const summary = renderFamilySummary(facts, ids);
  assert.match(summary, /Mary/);
  assert.equal(summary.includes("SECRET"), false);
  assert.ok(summary.split(/\s+/).length <= 120);
});
test("only exact opted-in supported consent is eligible", () => {
  const valid = { optedIn: true, clientId: "mary", familyMemberId: "james-obrien", familyMemberName: "James O'Brien" };
  assert.equal(eligibleFamilyConsent(valid, "mary"), true);
  for (const value of [null, undefined, { ...valid, optedIn: false }, { ...valid, clientId: "tom" }, { ...valid, familyMemberId: "x" }, { ...valid, familyMemberName: "James" }]) assert.equal(eligibleFamilyConsent(value, "mary"), false);
});