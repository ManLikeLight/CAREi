export type ComplianceVisit = {
  visitKey: string; clientId: string; clientName?: string; carerName?: string;
  status?: string | null; notes?: string | null; mood?: string | null;
  mealStatus?: string | null; fluidGlasses?: number | null;
  completedActivities?: unknown[] | null;
};
export type ComplianceMar = {
  confirmationKey: string; clientId: string; clientName?: string; visitKey?: string | null;
  medicationName?: string | null; status?: string | null; reason?: string | null; dose?: string | null; dueAt?: Date | null;
};
export type ComplianceFlag = {
  rule: string; reason: string; action: string;
  targetKind: "carer" | "visit" | "mar"; targetId: string; clientId?: string;
};
export type ComplianceArea = {
  key: string; label: string; referenceLabel: string;
  frameworks: ["CQC", "Care Inspectorate"];
  status: ComplianceStatus; flags: ComplianceFlag[];
};
export type ComplianceStatus = "green" | "amber" | "red" | "unknown";

const blank = (value: unknown) => value == null || (typeof value === "string" && value.trim() === "");
const flag = (rule: string, reason: string, action: string, targetKind: ComplianceFlag["targetKind"], targetId: string, clientId?: string): ComplianceFlag =>
  ({ rule, reason, action, targetKind, targetId, ...(clientId ? { clientId } : {}) });
const statusOf = (flags: ComplianceFlag[], hasData: boolean): ComplianceStatus =>
  flags.some((f) => f.rule.startsWith("red:")) ? "red" :
  flags.some((f) => f.rule.startsWith("amber:")) ? "amber" : hasData ? "green" : "unknown";

export function evaluateComplianceDashboard(input: {
  visits: ComplianceVisit[]; medications: ComplianceMar[];
}) {
  const { visits, medications } = input;
  const flags: ComplianceFlag[] = [];
  const credentials = [
    ["DBS evidence", "No credential table exists; DBS evidence cannot be verified.", "Add DBS evidence to the staff suitability record."],
    ["Training evidence", "No credential table exists; training evidence cannot be verified.", "Add training evidence to the staff suitability record."],
    ["Right-to-work evidence", "No credential table exists; right-to-work evidence cannot be verified.", "Add right-to-work evidence to the staff suitability record."],
  ].map(([name, reason, action]) => {
    const f = flag("unknown:credentials", `${name} unavailable: ${reason}`, action, "carer", "agency");
    flags.push(f); return f;
  });
  const visitFlags: ComplianceFlag[] = [];
  for (const v of visits) {
    const target = v.visitKey;
    if (["missed", "incomplete", "not completed"].includes((v.status ?? "").trim().toLowerCase()))
      visitFlags.push(flag("red:visit-status", `Visit status is ${v.status}; it is not completed.`, "Review and complete the visit record.", "visit", target, v.clientId));
    else if ((v.status ?? "").trim().toLowerCase() !== "completed")
      visitFlags.push(flag("amber:visit-status", "Visit does not have a completed status.", "Review and complete the visit record.", "visit", target, v.clientId));
  }
  const documentationFlags: ComplianceFlag[] = [];
  for (const v of visits) {
    if (blank(v.notes)) documentationFlags.push(flag("red:blank-notes", "Visit notes are blank.", "Complete the visit notes.", "visit", v.visitKey, v.clientId));
    for (const [field, label] of [["mood", "mood"], ["mealStatus", "meal"], ["fluidGlasses", "fluid"], ["completedActivities", "completed activities"]] as const) {
      const value = v[field];
      if (value == null || (Array.isArray(value) && value.length === 0) || (typeof value === "string" && value.trim() === ""))
        documentationFlags.push(flag(`amber:missing-${field}`, `Visit is missing ${label} evidence.`, `Add ${label} evidence to the visit record.`, "visit", v.visitKey, v.clientId));
    }
  }
  const marFlags: ComplianceFlag[] = [];
  for (const m of medications) {
    if (blank(m.medicationName)) marFlags.push(flag("red:missing-medication-name", "Medication record has no medication name.", "Add the medication name to the medication record.", "mar", m.confirmationKey, m.clientId));
    if (blank(m.status)) marFlags.push(flag("red:unsupported-status", "Medication status is blank or unsupported.", "Correct the medication status.", "mar", m.confirmationKey, m.clientId));
    else if (!["given", "refused", "not_given", "not given", "omitted"].includes(m.status!.trim().toLowerCase()))
      marFlags.push(flag("red:unsupported-status", `Medication status '${m.status}' is unsupported.`, "Correct the medication status.", "mar", m.confirmationKey, m.clientId));
    if (blank(m.visitKey)) marFlags.push(flag("red:missing-visit-link", "Medication record has no linked visit.", "Link the medication record to a visit.", "mar", m.confirmationKey, m.clientId));
    if (blank(m.clientName)) marFlags.push(flag("red:missing-client-name", "Medication record has no client name.", "Add the client name to the medication record.", "mar", m.confirmationKey, m.clientId));
    if (m.status?.trim().toLowerCase() === "refused" && blank(m.reason))
      marFlags.push(flag("red:refused-without-reason", "Medication was refused without a reason.", "Record the reason for refusal.", "mar", m.confirmationKey, m.clientId));
    if (blank(m.dose)) marFlags.push(flag("amber:missing-dose", "Medication record is missing dose.", "Add the medication dose.", "mar", m.confirmationKey, m.clientId));
    if (!m.dueAt) marFlags.push(flag("amber:missing-due-at", "Medication record is missing due time.", "Add the medication due time.", "mar", m.confirmationKey, m.clientId));
  }
  // There is no signature column in the available evidence, so this caveat is always retained.
  const signature = flag("unknown:signature-evidence", "Signature evidence does not exist in the available records.", "Add signature evidence before relying on MAR compliance.", "mar", "agency");
  const areas: ComplianceArea[] = [
    { key: "credentials", label: "Staff suitability and oversight", referenceLabel: "Evidence reference categories only", frameworks: ["CQC", "Care Inspectorate"], status: "unknown", flags: credentials },
    { key: "visits", label: "Safe continuity of care", referenceLabel: "Evidence reference categories only", frameworks: ["CQC", "Care Inspectorate"], status: statusOf(visitFlags, visits.length > 0), flags: visitFlags },
    { key: "documentation", label: "Care records and management oversight", referenceLabel: "Evidence reference categories only", frameworks: ["CQC", "Care Inspectorate"], status: statusOf(documentationFlags, visits.length > 0), flags: documentationFlags },
    { key: "mar", label: "Safe medication administration and recording", referenceLabel: "Evidence reference categories only", frameworks: ["CQC", "Care Inspectorate"], status: marFlags.some((f) => f.rule.startsWith("red:")) ? "red" : marFlags.some((f) => f.rule.startsWith("amber:")) ? "amber" : "unknown", flags: [...marFlags, signature] },
  ];
  const allFlags = [...flags, ...visitFlags, ...documentationFlags, ...marFlags, signature];
  const overallStatus = allFlags.some((f) => f.rule.startsWith("red:")) ? "red" : allFlags.some((f) => f.rule.startsWith("amber:")) ? "amber" : allFlags.some((f) => f.rule.startsWith("unknown:")) ? "unknown" : "green";
  return {
    areas, flags: allFlags,
    counts: { visits: visits.length, medications: medications.length, flags: allFlags.length },
    overallStatus,
    disclaimer: "CQC/Care Inspectorate evidence references only; this dashboard is not a regulatory judgement.",
  };
}