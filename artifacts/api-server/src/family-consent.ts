import { SUPPORTED_FAMILY_MAPPING } from "./family-mapping";
export function eligibleFamilyConsent(consent: { optedIn: boolean; clientId: string; familyMemberId: string; familyMemberName: string } | null | undefined, clientId: string): boolean {
  return !!consent?.optedIn && clientId === SUPPORTED_FAMILY_MAPPING.clientId &&
    consent.clientId === clientId && consent.familyMemberId === SUPPORTED_FAMILY_MAPPING.familyMemberId &&
    consent.familyMemberName === SUPPORTED_FAMILY_MAPPING.familyMemberName;
}