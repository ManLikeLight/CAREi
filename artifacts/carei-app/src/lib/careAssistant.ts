export interface CareAssistantClient {
  id: string;
  name: string;
  carePlanContext: string;
}

export interface CareAssistantRequest {
  question: string;
  client?: CareAssistantClient;
}

export interface CareAssistantResponse {
  answer: string;
  emergencyEscalation: boolean;
  auditId: number;
}

export class CareAssistantApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CareAssistantApiError";
    this.status = status;
  }
}

/**
 * Ask the grounded CAREi guidance assistant.
 *
 * Keeping the request here gives the modal one small, typed boundary to the
 * API and makes non-2xx responses visible to the caller rather than silently
 * substituting canned guidance.
 */
export async function chatWithCareAssistant(
  request: CareAssistantRequest,
  options?: RequestInit & { sessionToken?: string },
): Promise<CareAssistantResponse> {
  const { sessionToken, ...requestOptions } = options ?? {};
  const response = await fetch("/api/care-assistant/chat", {
    ...requestOptions,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...requestOptions.headers,
    },
    body: JSON.stringify(request),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const message = (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
    )
      ? payload.error
      : `CAREi Assistant request failed (${response.status})`;
    throw new CareAssistantApiError(message, response.status);
  }

  const responsePayload = payload as {
    answer?: unknown;
    emergencyEscalation?: unknown;
    auditId?: unknown;
  } | undefined;
  if (
    !responsePayload ||
    typeof responsePayload !== "object" ||
    typeof responsePayload.answer !== "string" ||
    typeof responsePayload.emergencyEscalation !== "boolean" ||
    typeof responsePayload.auditId !== "number"
  ) {
    throw new CareAssistantApiError("CAREi Assistant returned an invalid response.", response.status);
  }

  return responsePayload as CareAssistantResponse;
}