/**
 * CAREi Rota — data model, pattern expansion, travel calculation
 *
 * RotaEntry     — a recurring or one-off visit definition
 * GeneratedVisit — a concrete occurrence expanded from a RotaEntry
 * CarerAvailability — per-carer weekly availability windows
 * TravelSegment  — gap + travel time between two consecutive visits
 * CarerDaySchedule — full schedule for one carer on one date
 */

import { type ClientCoords, haversineMetres, CLIENT_COORDS } from "./evv";

// ── Types ──────────────────────────────────────────────────────────────────

export type PatternType = "none" | "daily" | "weekly" | "specific-days";

export interface RecurringPattern {
  type: PatternType;
  /** Day-of-week indices 0=Sun…6=Sat — used for weekly and specific-days */
  days?: number[];
  /** Inclusive end date YYYY-MM-DD; undefined = open-ended */
  endDate?: string;
}

export interface RotaEntry {
  id: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  carerId: string;
  carerName: string;
  startTime: string;       // "HH:MM"
  durationMinutes: number;
  /** First occurrence date YYYY-MM-DD */
  baseDate: string;
  pattern: RecurringPattern;
}

export interface DayAvailability {
  available: boolean;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface CarerAvailability {
  carerId: string;
  carerName: string;
  /** Keys 0–6: 0=Sun, 1=Mon, …, 6=Sat */
  weekly: Record<number, DayAvailability>;
}

export interface GeneratedVisit {
  entryId: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  carerId: string;
  carerName: string;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:MM
  endTime: string;       // HH:MM
  durationMinutes: number;
}

export interface TravelSegment {
  from: GeneratedVisit;
  to: GeneratedVisit;
  distanceKm: number;
  travelMinutes: number; // estimated drive + 5 min parking
  gapMinutes: number;    // actual gap between end of from and start of to
  /** True when gap < travelMinutes + BUFFER_MINUTES */
  isConflict: boolean;
}

export interface CarerDaySchedule {
  carerId: string;
  carerName: string;
  date: string;
  visits: GeneratedVisit[];
  travelSegments: TravelSegment[];
  totalDistanceKm: number;
  totalMileage: number;      // imperial miles
  mileagePayGBP: number;     // HMRC approved mileage payment
  hasConflict: boolean;
  availabilityConflict: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const URBAN_SPEED_KPH = 30;
const PARKING_MINUTES = 5;
const CONFLICT_BUFFER_MINUTES = 10;
const HMRC_RATE_PER_MILE = 0.45; // 2024–25 approved mileage rate
const KM_TO_MILES = 0.621371;

// ── Helpers ────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(time: string, delta: number): string {
  return minutesToTime(timeToMinutes(time) + delta);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Matches a date against a RecurringPattern given a base date */
function patternMatches(date: Date, baseDate: Date, pattern: RecurringPattern): boolean {
  const dateStr = isoDate(date);
  const baseDateStr = isoDate(baseDate);

  if (date < baseDate) return false;
  if (pattern.endDate && dateStr > pattern.endDate) return false;

  switch (pattern.type) {
    case "none":
      return dateStr === baseDateStr;
    case "daily":
      return true;
    case "weekly":
      return date.getDay() === baseDate.getDay();
    case "specific-days":
      return (pattern.days ?? []).includes(date.getDay());
    default:
      return false;
  }
}

// ── Core logic ─────────────────────────────────────────────────────────────

/**
 * Expand RotaEntry[] into concrete GeneratedVisit[] for a date range.
 * weekStart and weekEnd are inclusive.
 */
export function expandEntries(
  entries: RotaEntry[],
  weekStart: Date,
  weekEnd: Date,
): GeneratedVisit[] {
  const result: GeneratedVisit[] = [];

  for (const entry of entries) {
    const baseDate = new Date(entry.baseDate + "T00:00:00");
    const cursor = new Date(weekStart);

    while (cursor <= weekEnd) {
      if (patternMatches(cursor, baseDate, entry.pattern)) {
        const dateStr = isoDate(cursor);
        const endTime = addMinutes(entry.startTime, entry.durationMinutes);
        result.push({
          entryId: entry.id,
          clientId: entry.clientId,
          clientName: entry.clientName,
          clientAddress: entry.clientAddress,
          carerId: entry.carerId,
          carerName: entry.carerName,
          date: dateStr,
          startTime: entry.startTime,
          endTime,
          durationMinutes: entry.durationMinutes,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return result;
}

/** Estimate km between two client locations */
function distanceBetween(
  fromClientId: string,
  toClientId: string,
  extraCoords: Record<string, ClientCoords>,
): number {
  const allCoords = { ...CLIENT_COORDS, ...extraCoords };
  const from = allCoords[fromClientId];
  const to = allCoords[toClientId];
  if (!from || !to) return 3; // default 3 km when unknown
  return haversineMetres(from.lat, from.lng, to.lat, to.lng) / 1000;
}

/** Estimate drive time in minutes for a given km distance */
function travelMinutes(distanceKm: number): number {
  return Math.ceil((distanceKm / URBAN_SPEED_KPH) * 60) + PARKING_MINUTES;
}

/**
 * Build a CarerDaySchedule for a single carer on a single date.
 * Visits must already be filtered to this carer+date.
 */
export function buildCarerDaySchedule(
  carerId: string,
  carerName: string,
  date: string,
  visits: GeneratedVisit[],
  availability: CarerAvailability | undefined,
  extraCoords: Record<string, ClientCoords> = {},
): CarerDaySchedule {
  const sorted = [...visits].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );

  const segments: TravelSegment[] = [];
  let totalDistanceKm = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const distKm = distanceBetween(from.clientId, to.clientId, extraCoords);
    const tMins = travelMinutes(distKm);
    const gapMins = timeToMinutes(to.startTime) - timeToMinutes(from.endTime);
    totalDistanceKm += distKm;
    segments.push({
      from,
      to,
      distanceKm: Math.round(distKm * 10) / 10,
      travelMinutes: tMins,
      gapMinutes: gapMins,
      isConflict: gapMins < tMins + CONFLICT_BUFFER_MINUTES,
    });
  }

  const totalMileage = totalDistanceKm * KM_TO_MILES;
  const mileagePayGBP = totalMileage * HMRC_RATE_PER_MILE;

  // Check availability conflict
  let availabilityConflict = false;
  if (availability && sorted.length > 0) {
    const dateObj = new Date(date + "T00:00:00");
    const dow = dateObj.getDay();
    const avail = availability.weekly[dow];
    if (!avail?.available) {
      availabilityConflict = true;
    } else {
      for (const v of sorted) {
        const vStart = timeToMinutes(v.startTime);
        const vEnd = timeToMinutes(v.endTime);
        const aStart = timeToMinutes(avail.startTime || "00:00");
        const aEnd = timeToMinutes(avail.endTime || "23:59");
        if (vStart < aStart || vEnd > aEnd) {
          availabilityConflict = true;
          break;
        }
      }
    }
  }

  return {
    carerId,
    carerName,
    date,
    visits: sorted,
    travelSegments: segments,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalMileage: Math.round(totalMileage * 10) / 10,
    mileagePayGBP: Math.round(mileagePayGBP * 100) / 100,
    hasConflict: segments.some((s) => s.isConflict),
    availabilityConflict,
  };
}

/**
 * For a full week of GeneratedVisits, build CarerDaySchedule for every
 * unique (carerId, date) pair.
 */
export function buildWeekSchedules(
  visits: GeneratedVisit[],
  availabilityMap: Record<string, CarerAvailability>,
  extraCoords: Record<string, ClientCoords> = {},
): CarerDaySchedule[] {
  // Group by carerId + date
  const groups: Map<string, GeneratedVisit[]> = new Map();
  for (const v of visits) {
    const key = `${v.carerId}__${v.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }

  const result: CarerDaySchedule[] = [];
  for (const [key, groupVisits] of groups) {
    const [carerId, date] = key.split("__");
    const carerName = groupVisits[0].carerName;
    result.push(
      buildCarerDaySchedule(
        carerId,
        carerName,
        date,
        groupVisits,
        availabilityMap[carerId],
        extraCoords,
      ),
    );
  }

  return result.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.carerName.localeCompare(b.carerName);
  });
}

// ── Week navigation helpers ────────────────────────────────────────────────

/** Returns the Monday of the week containing `d` */
export function weekStart(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Returns the Sunday of the week containing `d` */
export function weekEnd(d: Date): Date {
  const start = weekStart(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Returns an array of 7 Date objects Mon→Sun for the week containing `d` */
export function weekDays(d: Date): Date[] {
  const start = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export function formatWeekRange(d: Date): string {
  const days = weekDays(d);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${days[0].toLocaleDateString("en-GB", opts)} – ${days[6].toLocaleDateString("en-GB", opts)}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function formatDayFull(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

// ── Demo seed data ─────────────────────────────────────────────────────────

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const MON = weekStart(TODAY);
const MON_STR = isoDate(MON);
const TUE_STR = isoDate(new Date(MON.getTime() + 86400000));

export const DEMO_ROTA_ENTRIES: RotaEntry[] = [
  {
    id: "r1",
    clientId: "mary",
    clientName: "Mary Johnson",
    clientAddress: "4 Birch Close, Reading RG2 7LN",
    carerId: "c1",
    carerName: "Sarah O'Brien",
    startTime: "09:00",
    durationMinutes: 60,
    baseDate: MON_STR,
    pattern: { type: "specific-days", days: [1, 2, 3, 4, 5] }, // Mon–Fri
  },
  {
    id: "r2",
    clientId: "tom",
    clientName: "Tom Adams",
    clientAddress: "12 Elm Street, Reading RG1 2BT",
    carerId: "c2",
    carerName: "John Mensah",
    startTime: "10:30",
    durationMinutes: 60,
    baseDate: MON_STR,
    pattern: { type: "specific-days", days: [1, 3, 5] }, // Mon, Wed, Fri
  },
  {
    // Tight gap after Tom (10:30–11:30) → deliberate travel conflict
    id: "r3",
    clientId: "aisha",
    clientName: "Aisha Khan",
    clientAddress: "8 Maple Drive, Reading RG4 5PQ",
    carerId: "c2",
    carerName: "John Mensah",
    startTime: "11:40",
    durationMinutes: 60,
    baseDate: MON_STR,
    pattern: { type: "specific-days", days: [1, 3, 5] },
  },
  {
    id: "r4",
    clientId: "aisha",
    clientName: "Aisha Khan",
    clientAddress: "8 Maple Drive, Reading RG4 5PQ",
    carerId: "c3",
    carerName: "Amina Diallo",
    startTime: "12:00",
    durationMinutes: 60,
    baseDate: TUE_STR,
    pattern: { type: "specific-days", days: [2, 4] }, // Tue, Thu
  },
];

const defaultDay = (available: boolean, s = "09:00", e = "17:00"): DayAvailability => ({
  available,
  startTime: s,
  endTime: e,
});

export const DEMO_AVAILABILITY: CarerAvailability[] = [
  {
    carerId: "c1",
    carerName: "Sarah O'Brien",
    weekly: {
      0: defaultDay(false),
      1: defaultDay(true, "08:00", "18:00"),
      2: defaultDay(true, "08:00", "18:00"),
      3: defaultDay(true, "08:00", "18:00"),
      4: defaultDay(true, "08:00", "18:00"),
      5: defaultDay(true, "08:00", "18:00"),
      6: defaultDay(false),
    },
  },
  {
    carerId: "c2",
    carerName: "John Mensah",
    weekly: {
      0: defaultDay(false),
      1: defaultDay(true, "08:00", "17:00"),
      2: defaultDay(true, "08:00", "17:00"),
      3: defaultDay(true, "08:00", "17:00"),
      4: defaultDay(true, "08:00", "17:00"),
      5: defaultDay(true, "08:00", "17:00"),
      6: defaultDay(true, "09:00", "13:00"),
    },
  },
  {
    carerId: "c3",
    carerName: "Amina Diallo",
    weekly: {
      0: defaultDay(false),
      1: defaultDay(true, "10:00", "18:00"),
      2: defaultDay(true, "12:00", "20:00"),
      3: defaultDay(true, "10:00", "18:00"),
      4: defaultDay(true, "12:00", "20:00"),
      5: defaultDay(true, "10:00", "18:00"),
      6: defaultDay(false),
    },
  },
];

// ── Pattern label helpers ──────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function patternLabel(entry: RotaEntry): string {
  const p = entry.pattern;
  switch (p.type) {
    case "none":
      return `Once · ${formatDate(entry.baseDate)}`;
    case "daily":
      return p.endDate ? `Daily until ${formatDate(p.endDate)}` : "Daily (open-ended)";
    case "weekly": {
      const base = new Date(entry.baseDate + "T00:00:00");
      const dayName = DAY_NAMES[base.getDay()];
      return p.endDate ? `Weekly on ${dayName}s until ${formatDate(p.endDate)}` : `Every ${dayName}`;
    }
    case "specific-days": {
      const labels = (p.days ?? [])
        .slice()
        .sort()
        .map((d) => DAY_NAMES[d])
        .join(", ");
      return p.endDate ? `${labels} until ${formatDate(p.endDate)}` : labels;
    }
    default:
      return "—";
  }
}

export { HMRC_RATE_PER_MILE, KM_TO_MILES, DAY_NAMES };
