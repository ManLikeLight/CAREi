import { createHmac, timingSafeEqual } from "node:crypto";

export type AssistantSession = {
  email: string;
  name: string;
  role: "carer" | "manager" | "admin";
  agency: string;
  exp: number;
};

const SESSION_TTL_SECONDS = 8 * 60 * 60;

function secret(): string {
  const value = process.env["SESSION_SECRET"];
  if (!value) throw new Error("SESSION_SECRET is required for assistant sessions");
  return value;
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function issueAssistantSession(input: Omit<AssistantSession, "exp">): string {
  const payload = encode(JSON.stringify({ ...input, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return `${payload}.${sign(payload)}`;
}

export function verifyAssistantSession(token: string): AssistantSession | null {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = sign(payload);
    const suppliedBytes = Buffer.from(signature, "base64url");
    const expectedBytes = Buffer.from(expected, "base64url");
    if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AssistantSession>;
    if (
      typeof value.email !== "string" || typeof value.name !== "string" ||
      typeof value.agency !== "string" ||
      (value.role !== "carer" && value.role !== "manager" && value.role !== "admin") ||
      typeof value.exp !== "number" || !Number.isFinite(value.exp) || value.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return value as AssistantSession;
  } catch {
    return null;
  }
}