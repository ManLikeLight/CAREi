import type { FamilyRecipient, FamilyUpdateConsentStatus, FamilyUpdateDelivery } from "@workspace/api-client-react";

export type { FamilyRecipient, FamilyUpdateConsentStatus };
export type SentFamilyUpdate = FamilyUpdateDelivery;

export class FamilyRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}/api/family-updates${path}`, {
    ...init, credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-CAREi-Family": "1", ...init?.headers },
  });
  const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new FamilyRequestError(
      typeof payload?.error === "string" ? payload.error : `Family request failed (${response.status}).`,
      response.status,
    );
  }
  return payload as T;
}
const pairQuery = (identity: FamilyRecipient) =>
  `?clientId=${encodeURIComponent(identity.clientId)}&familyMemberId=${encodeURIComponent(identity.familyMemberId)}`;

export const fetchFamilySession = () => request<FamilyRecipient>("/session");
export const redeemFamilyInvite = (code: string) =>
  request<FamilyRecipient>("/session", { method: "POST", body: JSON.stringify({ code }) });
export const endFamilySession = () => request<void>("/session", { method: "DELETE", body: "{}" });
export const fetchFamilyUpdateConsent = (identity: FamilyRecipient) =>
  request<FamilyUpdateConsentStatus>(`/consent${pairQuery(identity)}`);
export const fetchSentFamilyUpdates = (identity: FamilyRecipient) =>
  request<SentFamilyUpdate[]>(pairQuery(identity));
export const saveFamilyUpdateConsent = (identity: FamilyRecipient, optedIn: boolean) =>
  request<FamilyUpdateConsentStatus>("/consent", { method: "PUT", body: JSON.stringify({ ...identity, optedIn }) });
