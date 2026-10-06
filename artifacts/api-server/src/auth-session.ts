import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const COOKIE_NAME = "carei_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthenticatedCarer = {
  name: string;
  email: string;
  agency: string;
  role: "carer" | "manager" | "admin";
};

type SessionPayload = AuthenticatedCarer & {
  expiresAt: number;
};

declare global {
  namespace Express {
    interface Request {
      authenticatedCarer?: AuthenticatedCarer;
    }
  }
}

function sessionSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/api",
    maxAge: SESSION_TTL_MS,
  };
}

export function establishSession(
  res: Response,
  carer: AuthenticatedCarer,
): void {
  const payload: SessionPayload = {
    name: carer.name,
    email: carer.email,
    agency: carer.agency,
    role: carer.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  res.cookie(COOKIE_NAME, `${encodedPayload}.${sign(encodedPayload)}`, cookieOptions());
}

export function clearSession(res: Response): void {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
}

function readSession(req: Request): AuthenticatedCarer | undefined {
  const raw = req.cookies?.[COOKIE_NAME];
  if (typeof raw !== "string") return undefined;

  const separator = raw.lastIndexOf(".");
  if (separator < 1) return undefined;
  const encodedPayload = raw.slice(0, separator);
  const suppliedSignature = raw.slice(separator + 1);
  const expectedSignature = sign(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return undefined;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.agency !== "string" ||
      (payload.role !== "carer" && payload.role !== "manager" && payload.role !== "admin") ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return undefined;
    }
    return {
      name: payload.name,
      email: payload.email,
      agency: payload.agency,
      role: payload.role,
    };
  } catch {
    return undefined;
  }
}

export function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const carer = readSession(req);
    if (!carer) {
      res.status(401).json({ error: "Please log in to continue." });
      return;
    }
    req.authenticatedCarer = carer;
    next();
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(500).json({ error: "Session validation failed." });
  }
}