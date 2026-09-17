export type FamilyUpdateConsent = {
  clientId: string;
  familyMemberId: string;
  familyMemberName: string;
  optedIn: boolean;
  consentedAt?: string | null;
  withdrawnAt?: string | null;
};

export type SentFamilyUpdate = {
  id: number | string;
  visitKey: string;
  clientId: string;
  familyMemberId: string;
  summary: string;
  sentAt: string;
};

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof payload.error === "string"
      ? payload.error : `Family updates request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export function fetchFamilyUpdateConsent(token: string, clientId: string, familyMemberId: string) {
  return request<FamilyUpdateConsent>(
    `/api/family-updates/consent?clientId=${encodeURIComponent(clientId)}&familyMemberId=${encodeURIComponent(familyMemberId)}`,
    token,
  );
}

export function saveFamilyUpdateConsent(token: string, consent: FamilyUpdateConsent) {
  return request<FamilyUpdateConsent>("/api/family-updates/consent", token, {
    method: "PUT",
    body: JSON.stringify(consent),
  });
}

export function fetchSentFamilyUpdates(token: string, clientId: string, familyMemberId: string) {
  return request<SentFamilyUpdate[]>(
    `/api/family-updates?clientId=${encodeURIComponent(clientId)}&familyMemberId=${encodeURIComponent(familyMemberId)}`,
    token,
  );
}