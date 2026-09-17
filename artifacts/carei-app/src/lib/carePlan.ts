export type CarePlanSuggestion = {
  suggestion: string;
  source: string | null;
};

export type CarePlanDraft = {
  personalDetailsAndPreferences: {
    summary: CarePlanSuggestion;
  };
  needs: {
    personalCare: CarePlanSuggestion;
    mobility: CarePlanSuggestion;
    nutrition: CarePlanSuggestion;
    medication: CarePlanSuggestion;
    social: CarePlanSuggestion;
  };
  identifiedRisks: CarePlanSuggestion[];
  goalsAndDesiredOutcomes: CarePlanSuggestion[];
  dailyRoutine: CarePlanSuggestion[];
  notes: CarePlanSuggestion[];
};

export type CarePlanVersion = {
  id: number;
  clientId: string;
  version: number;
  assessmentInput: string;
  plan: CarePlanDraft;
  confirmedBy: string;
  createdAt: string;
};

export async function generateCarePlan(
  client: { name: string; age: number; address: string },
  assessmentInput: string,
): Promise<CarePlanDraft> {
  const response = await fetch("/api/care-plans/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client, assessmentInput }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Care plan generation failed");
  }
  return data.draft;
}

export async function confirmCarePlan(
  clientId: string,
  assessmentInput: string,
  plan: CarePlanDraft,
  confirmedBy: string,
): Promise<CarePlanVersion> {
  const response = await fetch(
    `/api/care-plans/${encodeURIComponent(clientId)}/versions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentInput, plan, confirmedBy }),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Care plan could not be saved");
  }
  return data;
}

export async function fetchCarePlanVersions(
  clientId: string,
): Promise<CarePlanVersion[]> {
  const response = await fetch(
    `/api/care-plans/${encodeURIComponent(clientId)}/versions`,
  );
  if (!response.ok) return [];
  return response.json();
}