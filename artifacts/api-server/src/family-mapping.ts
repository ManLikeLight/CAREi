export const SUPPORTED_FAMILY_MAPPING = {
  clientId: "mary",
  clientName: "Mary Johnson",
  familyMemberId: "james-obrien",
  familyMemberName: "James O'Brien",
} as const;

export function isSupportedClient(clientId: string, clientName: string): boolean {
  return clientId === SUPPORTED_FAMILY_MAPPING.clientId &&
    clientName === SUPPORTED_FAMILY_MAPPING.clientName;
}

export function isSupportedFamilyMember(
  clientId: string,
  familyMemberId: string,
  familyMemberName: string,
): boolean {
  return isSupportedClient(clientId, SUPPORTED_FAMILY_MAPPING.clientName) &&
    familyMemberId === SUPPORTED_FAMILY_MAPPING.familyMemberId &&
    familyMemberName === SUPPORTED_FAMILY_MAPPING.familyMemberName;
}