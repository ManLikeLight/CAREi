import type { ClientCoords } from "./evv";
import { CLIENT_COORDS, haversineMetres } from "./evv";
import type { CarerAvailability, RotaEntry } from "./rota";

export type MatchingClient = {
  id: string;
  name: string;
  address?: string;
  time: string;
  tags?: string[];
  conditions?: string[];
  communication?: string;
};

export type MatchingCarer = {
  id: string;
  name: string;
  role?: string;
  status?: string;
};

export type MatchReasonTone = "matched" | "neutral" | "missing" | "blocked";

export type MatchReason = {
  criterion: string;
  detail: string;
  points: number;
  tone: MatchReasonTone;
};

export type StaffMatch = {
  carer: MatchingCarer;
  score: number;
  continuityVisits: number;
  distanceKm: number | null;
  reasons: MatchReason[];
};

export type ExcludedCarer = {
  carer: MatchingCarer;
  reason: string;
};

export type StaffMatchResult = {
  ranked: StaffMatch[];
  excluded: ExcludedCarer[];
  requiredSkills: string[];
  languagePreferences: string[];
};

type StaffProfile = {
  skills: string[];
  languages: string[];
  homeCoords?: ClientCoords;
};

/**
 * Matching metadata is deliberately explicit and inspectable. It is kept
 * separate from the assignment action so a suggestion can never assign a
 * visit by itself.
 */
export const STAFF_MATCHING_PROFILES: Record<string, StaffProfile> = {
  c1: {
    skills: ["dementia", "medication", "personal care", "mobility support"],
    languages: ["English"],
    homeCoords: { lat: 51.4395, lng: -0.9825, geofenceMetres: 0 },
  },
  c2: {
    skills: ["post stroke", "mobility support", "medication", "hoist", "dysphagia"],
    languages: ["English"],
    homeCoords: { lat: 51.4548, lng: -0.9725, geofenceMetres: 0 },
  },
  c3: {
    skills: ["diabetes", "nutrition monitoring", "medication", "personal care"],
    languages: ["English", "French"],
    homeCoords: { lat: 51.4662, lng: -0.9995, geofenceMetres: 0 },
  },
  c4: {
    skills: [],
    languages: [],
  },
};

const SCORE_LIMITS = {
  continuity: 45,
  skills: 25,
  language: 15,
  proximity: 15,
} as const;

const normalise = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function parseTimeRange(value: string): { start: number; end: number } | null {
  const parts = value.split(/\s*[–-]\s*/);
  if (parts.length !== 2) return null;
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.trim().split(":").map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : NaN;
  };
  const start = toMinutes(parts[0]);
  const end = toMinutes(parts[1]);
  return Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null;
}

function clientRequiredSkills(client: MatchingClient): string[] {
  const text = [...(client.tags ?? []), ...(client.conditions ?? []), client.communication ?? ""]
    .join(" ")
    .toLowerCase();
  const required: string[] = [];
  const add = (skill: string) => {
    if (!required.includes(skill)) required.push(skill);
  };

  if (/dementia|cognitive/.test(text)) add("dementia");
  if (/medication|medicine|mar/.test(text)) add("medication");
  if (/mobility|post stroke|post-stroke|transfer|hoist/.test(text)) add("mobility support");
  if (/dysphagia|swallow|choking|thickened/.test(text)) add("dysphagia");
  if (/diabetes|hypoglyc/.test(text)) add("diabetes");
  if (/nutrition|meal/.test(text)) add("nutrition monitoring");
  if (/personal care|full physical|wash|dress/.test(text)) add("personal care");
  if (/hoist/.test(text)) add("hoist");

  return required;
}

function clientLanguagePreferences(client: MatchingClient): string[] {
  const text = client.communication ?? "";
  const knownLanguages = ["English", "Urdu", "French", "Polish", "Punjabi", "Welsh"];
  return knownLanguages.filter(language => new RegExp(`\\b${language}\\b`, "i").test(text));
}

function continuityCount(carerId: string, clientId: string, rotas: RotaEntry[]): number {
  return rotas.filter(entry => entry.carerId === carerId && entry.clientId === clientId).length;
}

function availabilityForSlot(
  carerId: string,
  client: MatchingClient,
  availability: Record<string, CarerAvailability>,
  date: Date,
): { ok: boolean; reason: string } {
  const carerAvailability = availability[carerId];
  if (!carerAvailability) {
    return { ok: false, reason: "Availability is not recorded for this carer." };
  }

  const day = carerAvailability.weekly[date.getDay()];
  if (!day?.available) {
    return { ok: false, reason: "Carer is marked unavailable on this day." };
  }

  const slot = parseTimeRange(client.time);
  if (!slot) {
    return { ok: false, reason: "The client slot could not be checked against availability." };
  }

  const [startHours, startMinutes] = day.startTime.split(":").map(Number);
  const [endHours, endMinutes] = day.endTime.split(":").map(Number);
  const availableStart = startHours * 60 + startMinutes;
  const availableEnd = endHours * 60 + endMinutes;
  if (slot.start < availableStart || slot.end > availableEnd) {
    return { ok: false, reason: `Availability is ${day.startTime}–${day.endTime}, outside this slot.` };
  }

  return { ok: true, reason: `Available ${day.startTime}–${day.endTime} for this slot.` };
}

function scoreProximity(
  carerId: string,
  clientId: string,
): { points: number; distanceKm: number | null; detail: string; tone: MatchReasonTone } {
  const home = STAFF_MATCHING_PROFILES[carerId]?.homeCoords;
  const client = CLIENT_COORDS[clientId];
  if (!home || !client) {
    return {
      points: 0,
      distanceKm: null,
      detail: "Location evidence is unknown; no distance penalty applied.",
      tone: "missing",
    };
  }

  const distanceKm = haversineMetres(home.lat, home.lng, client.lat, client.lng) / 1000;
  const points = distanceKm <= 1 ? 15 : distanceKm <= 3 ? 12 : distanceKm <= 6 ? 8 : distanceKm <= 10 ? 4 : 0;
  return {
    points,
    distanceKm: Math.round(distanceKm * 10) / 10,
    detail: `${Math.round(distanceKm * 10) / 10} km estimated from the recorded home area.`,
    tone: points > 0 ? "matched" : "neutral",
  };
}

export function rankStaffForClient(
  client: MatchingClient,
  carers: MatchingCarer[],
  rotas: RotaEntry[],
  availability: Record<string, CarerAvailability>,
  date = new Date(),
): StaffMatchResult {
  const requiredSkills = clientRequiredSkills(client);
  const languagePreferences = clientLanguagePreferences(client);
  const ranked: StaffMatch[] = [];
  const excluded: ExcludedCarer[] = [];

  for (const carer of carers) {
    if (carer.status && carer.status !== "active") {
      excluded.push({ carer, reason: `Not eligible: staff status is ${carer.status}.` });
      continue;
    }

    const availabilityCheck = availabilityForSlot(carer.id, client, availability, date);
    if (!availabilityCheck.ok) {
      excluded.push({ carer, reason: `Not suggested: ${availabilityCheck.reason}` });
      continue;
    }

    const profile = STAFF_MATCHING_PROFILES[carer.id];
    const carerSkills = (profile?.skills ?? []).map(normalise);
    const matchedSkills = requiredSkills.filter(skill => carerSkills.includes(normalise(skill)));
    const skillPoints = requiredSkills.length
      ? Math.round((matchedSkills.length / requiredSkills.length) * SCORE_LIMITS.skills)
      : 0;
    const continuity = continuityCount(carer.id, client.id, rotas);
    const continuityPoints = continuity > 0
      ? Math.min(SCORE_LIMITS.continuity, 30 + continuity * 5)
      : 0;
    const languageMatch = languagePreferences.length > 0 &&
      languagePreferences.some(language => (profile?.languages ?? []).some(carerLanguage => normalise(carerLanguage) === normalise(language)));
    const languagePoints = languagePreferences.length > 0 && languageMatch ? SCORE_LIMITS.language : 0;
    const proximity = scoreProximity(carer.id, client.id);

    const reasons: MatchReason[] = [
      {
        criterion: "Continuity",
        detail: continuity > 0
          ? `${continuity} existing rota record${continuity === 1 ? "" : "s"} with this client; continuity is weighted heavily.`
          : "No previous client-specific rota evidence recorded.",
        points: continuityPoints,
        tone: continuity > 0 ? "matched" : "neutral",
      },
      {
        criterion: "Skills",
        detail: requiredSkills.length
          ? `${matchedSkills.length}/${requiredSkills.length} recorded needs matched${matchedSkills.length < requiredSkills.length ? `; missing ${requiredSkills.filter(skill => !matchedSkills.includes(skill)).join(", ")}.` : "."}`
          : "No specific skill requirement is recorded; no penalty applied.",
        points: skillPoints,
        tone: requiredSkills.length === 0 || matchedSkills.length === requiredSkills.length ? "matched" : matchedSkills.length > 0 ? "neutral" : "missing",
      },
      {
        criterion: "Language",
        detail: languagePreferences.length
          ? languageMatch ? `Matches recorded preference: ${languagePreferences.join(", ")}.` : `No recorded match for ${languagePreferences.join(", ")}; review with the coordinator.`
          : "No client language preference recorded; no penalty applied.",
        points: languagePoints,
        tone: languagePreferences.length === 0 || languageMatch ? "matched" : "missing",
      },
      {
        criterion: "Proximity",
        detail: proximity.detail,
        points: proximity.points,
        tone: proximity.tone,
      },
      {
        criterion: "Availability",
        detail: availabilityCheck.reason,
        points: 0,
        tone: "matched",
      },
    ];

    ranked.push({
      carer,
      score: continuityPoints + skillPoints + languagePoints + proximity.points,
      continuityVisits: continuity,
      distanceKm: proximity.distanceKm,
      reasons,
    });
  }

  ranked.sort((a, b) =>
    b.score - a.score ||
    b.continuityVisits - a.continuityVisits ||
    (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY) ||
    a.carer.name.localeCompare(b.carer.name),
  );

  return { ranked, excluded, requiredSkills, languagePreferences };
}