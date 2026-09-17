import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateComplianceDashboard } from "../src/compliance-rules";

test("no data is unknown and names unavailable credential evidence", () => {
  const result = evaluateComplianceDashboard({ visits: [], medications: [] });
  assert.equal(result.overallStatus, "unknown");
  assert.equal(result.areas.find((a) => a.key === "visits")?.status, "unknown");
  assert.match(result.flags.find((f) => f.rule === "unknown:credentials")!.reason, /DBS/);
  assert.ok(result.flags.some((f) => f.rule === "unknown:signature-evidence"));
  assert.deepEqual(result.areas[0].frameworks, ["CQC", "Care Inspectorate"]);
  assert.equal(result.areas[0].referenceLabel, "Evidence reference categories only");
});
test("absent documentation fields never produce green", () => {
  const result = evaluateComplianceDashboard({ visits: [{ visitKey: "v1", clientId: "c1", status: "completed" }], medications: [] });
  assert.equal(result.areas.find((a) => a.key === "documentation")?.status, "red");
  assert.ok(result.flags.some((f) => f.rule === "red:blank-notes"));
});
test("red takes precedence over amber with deterministic reasons", () => {
  const result = evaluateComplianceDashboard({ visits: [], medications: [{ confirmationKey: "m1", clientId: "c1", medicationName: "", status: "refused", reason: "", dose: "", dueAt: null }] });
  assert.equal(result.overallStatus, "red");
  assert.equal(result.flags.find((f) => f.rule === "red:refused-without-reason")?.reason, "Medication was refused without a reason.");
  assert.ok(result.flags.some((f) => f.rule === "amber:missing-dose"));
  assert.ok(result.flags.some((f) => f.rule === "red:missing-medication-name"));
});
test("complete rows retain unknown signature evidence status", () => {
  const result = evaluateComplianceDashboard({
    visits: [{ visitKey: "v1", clientId: "c1", status: "completed", notes: "Done", mood: "well", mealStatus: "ate", fluidGlasses: 2, completedActivities: ["wash"] }],
    medications: [{ confirmationKey: "m1", clientId: "c1", clientName: "Client", medicationName: "Medicine", visitKey: "v1", status: "given", dose: "10mg", dueAt: new Date() }],
  });
  assert.equal(result.areas.find((a) => a.key === "mar")?.status, "unknown");
  assert.equal(result.flags.find((f) => f.rule === "unknown:signature-evidence")?.reason, "Signature evidence does not exist in the available records.");
});