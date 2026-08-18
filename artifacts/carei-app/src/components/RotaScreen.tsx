/**
 * RotaScreen — rota management hub
 *
 * Manager view:
 *   Week View   — all carers' visits for the selected week, travel gaps + conflict warnings
 *   Patterns    — list of recurring visit definitions, add / delete
 *   Mileage     — per-carer daily distance and HMRC mileage pay estimate
 *   Availability— read-only view of carers' stated availability
 *
 * Carer view:
 *   My Schedule — upcoming visits with travel segments between them
 *   Availability— set / edit own weekly availability
 */

import { useState, useMemo } from "react";
import {
  type RotaEntry,
  type CarerAvailability,
  type GeneratedVisit,
  type DayAvailability,
  type RecurringPattern,
  expandEntries,
  buildWeekSchedules,
  weekStart,
  weekEnd,
  weekDays,
  formatWeekRange,
  formatDate,
  formatDayFull,
  patternLabel,
  DEMO_ROTA_ENTRIES,
  DEMO_AVAILABILITY,
  DAY_NAMES,
  HMRC_RATE_PER_MILE,
  KM_TO_MILES,
} from "../lib/rota";

// ── Colour tokens (match rest of app) ─────────────────────────────────────

const C = {
  darkNavy: "#0F1D34",
  navy: "#1B2A49",
  card: "rgba(255,255,255,0.055)",
  border: "rgba(255,255,255,0.1)",
  teal: "#4FD1C5",
  teal2: "#38B2AC",
  amber: "#F6B73C",
  red: "#FF5A5F",
  green: "#22C55E",
  purple: "#a78bfa",
  g0: "#F8FAFC",
  g1: "#E2E8F0",
  g2: "#94A3B8",
  g3: "#475569",
};

const CARER_COLORS = ["#4FD1C5", "#a78bfa", "#F6B73C", "#34D399", "#FB923C", "#60A5FA"];

function carerColor(carerId: string): string {
  const idx = ["c1", "c2", "c3", "c4", "c5", "c6"].indexOf(carerId);
  return CARER_COLORS[idx >= 0 ? idx : 0];
}

// ── Demo carer list (mirroring DEMO_CARERS in CAREiApp) ───────────────────

const DEMO_CLIENTS = [
  { id: "mary",  name: "Mary Johnson",  address: "4 Birch Close, Reading RG2 7LN" },
  { id: "tom",   name: "Tom Adams",     address: "12 Elm Street, Reading RG1 2BT" },
  { id: "aisha", name: "Aisha Khan",    address: "8 Maple Drive, Reading RG4 5PQ" },
];

const DEMO_CARERS_LIST = [
  { id: "c1", name: "Sarah O'Brien",  status: "active" },
  { id: "c2", name: "John Mensah",    status: "active" },
  { id: "c3", name: "Amina Diallo",   status: "active" },
  { id: "c4", name: "Priya Sharma",   status: "invited" },
];

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  role: "manager" | "carer" | null;
  carerId?: string;
  carerName?: string;
  rotas: RotaEntry[];
  setRotas: (r: RotaEntry[]) => void;
  availability: Record<string, CarerAvailability>;
  setAvailability: (a: Record<string, CarerAvailability>) => void;
}

// ── Shared sub-components ──────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: C.teal, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: "13px 14px", border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-block", background: `${color}22`, color, fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px", border: `1px solid ${color}44` }}>
      {label}
    </span>
  );
}

function ConflictBadge() {
  return <Pill label="⚠ Conflict" color={C.red} />;
}

// ── Visit card used in carer schedule ────────────────────────────────────

function VisitCard({ visit, travelAfter, highlight }: { visit: GeneratedVisit; travelAfter?: ReturnType<typeof buildWeekSchedules>[0]["travelSegments"][0]; highlight?: boolean }) {
  return (
    <div style={{ borderLeft: `3px solid ${C.teal}`, paddingLeft: 10, marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{visit.clientName}</div>
          <div style={{ color: C.g2, fontSize: 11, marginTop: 1 }}>{visit.clientAddress}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
          <div style={{ color: C.teal, fontWeight: 700, fontSize: 13 }}>{visit.startTime}</div>
          <div style={{ color: C.g3, fontSize: 10 }}>→ {visit.endTime}</div>
        </div>
      </div>
      {travelAfter && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, paddingTop: 6, borderTop: `1px dashed ${travelAfter.isConflict ? C.red + "66" : "rgba(255,255,255,0.07)"}` }}>
          <span style={{ fontSize: 12 }}>🚗</span>
          <span style={{ color: travelAfter.isConflict ? C.red : C.g3, fontSize: 11 }}>
            {travelAfter.distanceKm} km · est. {travelAfter.travelMinutes} min
          </span>
          <span style={{ color: travelAfter.isConflict ? C.red : C.g3, fontSize: 10, marginLeft: "auto" }}>
            gap: {travelAfter.gapMinutes} min {travelAfter.isConflict ? "⚠" : "✓"}
          </span>
        </div>
      )}
    </div>
  );
}

// ── AddVisitModal ──────────────────────────────────────────────────────────

function AddVisitModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (entry: Omit<RotaEntry, "id">) => void;
}) {
  const [clientId, setClientId] = useState("mary");
  const [carerId, setCarerId] = useState("c1");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [patternType, setPatternType] = useState<RecurringPattern["type"]>("specific-days");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selStyle: React.CSSProperties = {
    width: "100%", padding: "9px 11px", borderRadius: 10, border: `1px solid ${C.border}`,
    background: "rgba(255,255,255,0.07)", color: "#fff", fontFamily: "DM Sans, sans-serif",
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  function toggleDay(d: number) {
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    );
  }

  function submit() {
    const e: Record<string, string> = {};
    if (!baseDate) e.baseDate = "Required";
    if (patternType === "specific-days" && selectedDays.length === 0) e.days = "Select at least one day";
    if (Object.keys(e).length) { setErrors(e); return; }

    const client = DEMO_CLIENTS.find(c => c.id === clientId)!;
    const carer = DEMO_CARERS_LIST.find(c => c.id === carerId)!;

    onAdd({
      clientId,
      clientName: client.name,
      clientAddress: client.address,
      carerId,
      carerName: carer.name,
      startTime,
      durationMinutes: duration,
      baseDate,
      pattern: {
        type: patternType,
        days: patternType === "specific-days" ? selectedDays : patternType === "weekly" ? [new Date(baseDate + "T00:00:00").getDay()] : undefined,
        endDate: endDate || undefined,
      },
    });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", zIndex: 200 }}>
      <div className="phone-scroll" style={{ background: C.navy, width: "100%", borderRadius: "20px 20px 0 0", padding: "20px 18px 44px", border: `1px solid ${C.border}`, borderBottom: "none", maxHeight: "92vh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 16 }}>Add Recurring Visit</div>

        {/* Client */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.g2, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Client</div>
          <select value={clientId} onChange={e => setClientId(e.target.value)} style={selStyle}>
            {DEMO_CLIENTS.map(c => <option key={c.id} value={c.id} style={{ background: C.navy }}>{c.name}</option>)}
          </select>
        </div>

        {/* Carer */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.g2, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Assigned Carer</div>
          <select value={carerId} onChange={e => setCarerId(e.target.value)} style={selStyle}>
            {DEMO_CARERS_LIST.filter(c => c.status === "active").map(c => (
              <option key={c.id} value={c.id} style={{ background: C.navy }}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Time + duration */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.g2, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Start Time</div>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              style={{ ...selStyle, colorScheme: "dark" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.g2, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Duration</div>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={selStyle}>
              {DURATION_OPTIONS.map(d => (
                <option key={d} value={d} style={{ background: C.navy }}>{d} min</option>
              ))}
            </select>
          </div>
        </div>

        {/* First date */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.g2, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>First Visit Date</div>
          <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)}
            style={{ ...selStyle, colorScheme: "dark" }} />
          {errors.baseDate && <div style={{ color: C.red, fontSize: 11, marginTop: 3 }}>{errors.baseDate}</div>}
        </div>

        {/* Pattern */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.g2, fontSize: 11, marginBottom: 6, fontWeight: 600 }}>Recurrence Pattern</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {(["none", "daily", "weekly", "specific-days"] as const).map(pt => (
              <button key={pt} onClick={() => setPatternType(pt)}
                style={{ padding: "6px 12px", borderRadius: 99, border: `1px solid ${patternType === pt ? C.teal : C.border}`, background: patternType === pt ? "rgba(79,209,197,0.12)" : "transparent", color: patternType === pt ? C.teal : C.g2, fontFamily: "DM Sans, sans-serif", fontSize: 12, cursor: "pointer", fontWeight: patternType === pt ? 700 : 400 }}>
                {pt === "none" ? "Once only" : pt === "daily" ? "Daily" : pt === "weekly" ? "Weekly" : "Specific days"}
              </button>
            ))}
          </div>

          {patternType === "specific-days" && (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[1,2,3,4,5,6,0].map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${selectedDays.includes(d) ? C.teal : C.border}`, background: selectedDays.includes(d) ? "rgba(79,209,197,0.15)" : "transparent", color: selectedDays.includes(d) ? C.teal : C.g2, fontFamily: "DM Sans, sans-serif", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                    {DAY_NAMES[d]}
                  </button>
                ))}
              </div>
              {errors.days && <div style={{ color: C.red, fontSize: 11, marginTop: 4 }}>{errors.days}</div>}
            </>
          )}
        </div>

        {/* End date (optional) */}
        {patternType !== "none" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.g2, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>End Date <span style={{ fontWeight: 400, color: C.g3 }}>(leave blank for open-ended)</span></div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ ...selStyle, colorScheme: "dark" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.g2, fontFamily: "DM Sans, sans-serif", fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg,${C.teal},${C.teal2})`, color: C.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Add Visit</button>
        </div>
      </div>
    </div>
  );
}

// ── Availability editor ────────────────────────────────────────────────────

function AvailabilityEditor({
  initial,
  onSave,
  onClose,
  carerName,
}: {
  initial: CarerAvailability;
  onSave: (a: CarerAvailability) => void;
  onClose: () => void;
  carerName: string;
}) {
  const [weekly, setWeekly] = useState<Record<number, DayAvailability>>({ ...initial.weekly });

  function toggle(dow: number) {
    setWeekly(prev => ({
      ...prev,
      [dow]: { ...prev[dow], available: !prev[dow]?.available },
    }));
  }
  function set(dow: number, field: "startTime" | "endTime", val: string) {
    setWeekly(prev => ({ ...prev, [dow]: { ...prev[dow], [field]: val } }));
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 8,
    color: "#fff", fontFamily: "DM Sans, sans-serif", fontSize: 12, padding: "5px 8px",
    outline: "none", colorScheme: "dark", width: 70,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", zIndex: 200 }}>
      <div style={{ background: C.navy, width: "100%", borderRadius: "20px 20px 0 0", padding: "20px 18px 44px", border: `1px solid ${C.border}`, borderBottom: "none", boxSizing: "border-box" }}>
        <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>My Availability</div>
        <div style={{ color: C.g2, fontSize: 12, marginBottom: 18 }}>{carerName}</div>

        {[1,2,3,4,5,6,0].map(dow => {
          const avail = weekly[dow] ?? { available: false, startTime: "09:00", endTime: "17:00" };
          return (
            <div key={dow} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, color: C.g1, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow]}
              </div>
              <button onClick={() => toggle(dow)}
                style={{ width: 36, height: 22, borderRadius: 11, border: "none", background: avail.available ? C.teal : "rgba(255,255,255,0.1)", cursor: "pointer", transition: "background 0.2s", flexShrink: 0, position: "relative" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: avail.available ? 17 : 3, transition: "left 0.2s" }} />
              </button>
              {avail.available ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="time" value={avail.startTime} onChange={e => set(dow, "startTime", e.target.value)} style={inputStyle} />
                  <span style={{ color: C.g3, fontSize: 11 }}>–</span>
                  <input type="time" value={avail.endTime} onChange={e => set(dow, "endTime", e.target.value)} style={inputStyle} />
                </div>
              ) : (
                <span style={{ color: C.g3, fontSize: 12, fontStyle: "italic" }}>Unavailable</span>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: `1px solid ${C.border}`, background: "transparent", color: C.g2, fontFamily: "DM Sans, sans-serif", fontSize: 14, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { onSave({ ...initial, weekly }); onClose(); }}
            style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg,${C.teal},${C.teal2})`, color: C.darkNavy, fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Save Availability
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RotaScreen({ onBack, role, carerId, carerName, rotas, setRotas, availability, setAvailability }: Props) {
  const isManager = role === "manager";

  // ── Week navigation ──────────────────────────────────────────────────────
  const [weekRef, setWeekRef] = useState(() => new Date());
  const wStart = useMemo(() => weekStart(weekRef), [weekRef]);
  const wEnd   = useMemo(() => weekEnd(weekRef),   [weekRef]);
  const wDays  = useMemo(() => weekDays(weekRef),  [weekRef]);

  function prevWeek() { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d); }
  function nextWeek() { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d); }

  // ── Tab state ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"week" | "patterns" | "mileage" | "avail" | "schedule" | "my-avail">(
    isManager ? "week" : "schedule"
  );

  // ── Modals ───────────────────────────────────────────────────────────────
  const [showAddVisit, setShowAddVisit]     = useState(false);
  const [editAvailFor, setEditAvailFor]     = useState<string | null>(null); // carerId

  // ── Derived schedule data ────────────────────────────────────────────────
  const weekVisits = useMemo(
    () => expandEntries(rotas, wStart, wEnd),
    [rotas, wStart, wEnd],
  );

  const weekSchedules = useMemo(
    () => buildWeekSchedules(weekVisits, availability),
    [weekVisits, availability],
  );

  // ── Actions ──────────────────────────────────────────────────────────────
  function addEntry(entry: Omit<RotaEntry, "id">) {
    const id = `r${Date.now()}`;
    setRotas([...rotas, { ...entry, id }]);
  }

  function deleteEntry(id: string) {
    setRotas(rotas.filter(r => r.id !== id));
  }

  function saveAvailability(a: CarerAvailability) {
    setAvailability({ ...availability, [a.carerId]: a });
  }

  // ── Manager: Week View tab ───────────────────────────────────────────────
  function renderWeekView() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {wDays.map(day => {
          const dateStr = day.toISOString().slice(0, 10);
          const daySchedules = weekSchedules.filter(s => s.date === dateStr);
          if (daySchedules.length === 0) return (
            <div key={dateStr}>
              <SectionHeader>{formatDayFull(day)}</SectionHeader>
              <Card style={{ marginBottom: 14 }}>
                <span style={{ color: C.g3, fontSize: 12 }}>No visits scheduled</span>
              </Card>
            </div>
          );
          return (
            <div key={dateStr} style={{ marginBottom: 16 }}>
              <SectionHeader>{formatDayFull(day)}</SectionHeader>
              {daySchedules.map(sched => (
                <Card key={sched.carerId} style={{ marginBottom: 10, borderLeft: `3px solid ${carerColor(sched.carerId)}` }}>
                  {/* Carer header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${carerColor(sched.carerId)}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: carerColor(sched.carerId), fontSize: 11, fontWeight: 700 }}>
                        {sched.carerName.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{sched.carerName}</span>
                      {sched.totalDistanceKm > 0 && (
                        <span style={{ color: C.g3, fontSize: 11, marginLeft: 8 }}>
                          🚗 {sched.totalDistanceKm} km · £{sched.mileagePayGBP.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {sched.hasConflict && <ConflictBadge />}
                      {sched.availabilityConflict && <Pill label="⚠ Unavailable" color={C.amber} />}
                    </div>
                  </div>
                  {/* Visits */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sched.visits.map((visit, vi) => {
                      const segment = sched.travelSegments.find(s => s.from.entryId === visit.entryId && s.from.startTime === visit.startTime);
                      return (
                        <div key={vi}>
                          <VisitCard visit={visit} travelAfter={segment} />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Manager: Patterns tab ────────────────────────────────────────────────
  function renderPatterns() {
    return (
      <div>
        <SectionHeader>Recurring Visit Patterns</SectionHeader>
        {rotas.length === 0 && (
          <Card>
            <div style={{ color: C.g3, fontSize: 13, textAlign: "center", padding: "12px 0" }}>
              No recurring visits. Add one below.
            </div>
          </Card>
        )}
        {rotas.map(entry => (
          <Card key={entry.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: carerColor(entry.carerId), flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{entry.clientName}</div>
                <div style={{ color: C.g2, fontSize: 11, marginTop: 2 }}>
                  {entry.startTime} · {entry.durationMinutes} min · {entry.carerName}
                </div>
                <div style={{ color: C.teal, fontSize: 11, marginTop: 3 }}>{patternLabel(entry)}</div>
              </div>
              <button onClick={() => deleteEntry(entry.id)}
                style={{ background: "rgba(255,90,95,0.1)", border: "1px solid rgba(255,90,95,0.25)", borderRadius: 8, padding: "5px 10px", color: C.red, fontFamily: "DM Sans,sans-serif", fontSize: 11, cursor: "pointer" }}>
                Remove
              </button>
            </div>
          </Card>
        ))}
        <button onClick={() => setShowAddVisit(true)}
          style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px dashed ${C.teal}88`, background: "rgba(79,209,197,0.06)", color: C.teal, fontFamily: "DM Sans,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
          + Add Recurring Visit
        </button>
      </div>
    );
  }

  // ── Manager: Mileage tab ────────────────────────────────────────────────
  function renderMileage() {
    const carerMap: Record<string, { name: string; days: Record<string, { km: number; pay: number; visits: number }> }> = {};
    for (const sched of weekSchedules) {
      if (!carerMap[sched.carerId]) carerMap[sched.carerId] = { name: sched.carerName, days: {} };
      carerMap[sched.carerId].days[sched.date] = {
        km: sched.totalDistanceKm,
        pay: sched.mileagePayGBP,
        visits: sched.visits.length,
      };
    }
    return (
      <div>
        <SectionHeader>Mileage & Pay Estimates — {formatWeekRange(weekRef)}</SectionHeader>
        <Card style={{ marginBottom: 10, background: "rgba(79,209,197,0.06)", borderColor: "rgba(79,209,197,0.2)" }}>
          <div style={{ color: C.teal, fontSize: 11, lineHeight: 1.5 }}>
            Calculated at HMRC Approved Mileage Rate · £{HMRC_RATE_PER_MILE}/mile · assumes 30 km/h urban speed
          </div>
        </Card>
        {Object.entries(carerMap).map(([cId, data]) => {
          const totalKm = Object.values(data.days).reduce((s, d) => s + d.km, 0);
          const totalMiles = totalKm * KM_TO_MILES;
          const totalPay = Object.values(data.days).reduce((s, d) => s + d.pay, 0);
          const totalVisits = Object.values(data.days).reduce((s, d) => s + d.visits, 0);
          return (
            <Card key={cId} style={{ marginBottom: 10, borderLeft: `3px solid ${carerColor(cId)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{data.name}</div>
                  <div style={{ color: C.g2, fontSize: 11, marginTop: 2 }}>{totalVisits} visits this week</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.teal, fontWeight: 700, fontSize: 15 }}>£{totalPay.toFixed(2)}</div>
                  <div style={{ color: C.g3, fontSize: 10 }}>{totalMiles.toFixed(1)} mi · {totalKm.toFixed(1)} km</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {Object.entries(data.days)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, day]) => (
                    <div key={date} style={{ display: "flex", justifyContent: "space-between", paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ color: C.g2, fontSize: 11 }}>{formatDate(date)} · {day.visits} visit{day.visits !== 1 ? "s" : ""}</div>
                      <div style={{ color: day.km > 0 ? C.g1 : C.g3, fontSize: 11 }}>
                        {day.km > 0 ? `${day.km} km · £${day.pay.toFixed(2)}` : "—"}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          );
        })}
        {Object.keys(carerMap).length === 0 && (
          <Card><div style={{ color: C.g3, fontSize: 12 }}>No visits this week</div></Card>
        )}
      </div>
    );
  }

  // ── Manager: Carer Availability tab ───────────────────────────────────────
  function renderManagerAvail() {
    return (
      <div>
        <SectionHeader>Carer Availability</SectionHeader>
        {DEMO_CARERS_LIST.filter(c => c.status === "active").map(carer => {
          const avail = availability[carer.id];
          return (
            <Card key={carer.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{carer.name}</div>
                  {!avail && <div style={{ color: C.amber, fontSize: 11, marginTop: 2 }}>No availability set</div>}
                </div>
              </div>
              {avail && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[1,2,3,4,5,6,0].map(dow => {
                    const d = avail.weekly[dow];
                    return (
                      <div key={dow} style={{ flex: "0 0 calc(50% - 4px)", background: d?.available ? "rgba(79,209,197,0.06)" : "rgba(255,255,255,0.03)", borderRadius: 8, padding: "5px 8px", border: `1px solid ${d?.available ? "rgba(79,209,197,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                        <div style={{ color: d?.available ? C.teal : C.g3, fontSize: 10, fontWeight: 700 }}>{DAY_NAMES[dow]}</div>
                        <div style={{ color: d?.available ? C.g1 : C.g3, fontSize: 10, marginTop: 2 }}>
                          {d?.available ? `${d.startTime}–${d.endTime}` : "Unavailable"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
        {/* Conflict summary */}
        {weekSchedules.filter(s => s.availabilityConflict).length > 0 && (
          <>
            <SectionHeader>⚠ Availability Conflicts This Week</SectionHeader>
            {weekSchedules.filter(s => s.availabilityConflict).map(s => (
              <Card key={`${s.carerId}_${s.date}`} style={{ marginBottom: 8, borderColor: "rgba(246,183,60,0.3)", background: "rgba(246,183,60,0.06)" }}>
                <div style={{ color: C.amber, fontWeight: 700, fontSize: 12 }}>{s.carerName}</div>
                <div style={{ color: C.g2, fontSize: 11, marginTop: 2 }}>
                  Has {s.visits.length} visit{s.visits.length !== 1 ? "s" : ""} on {formatDate(s.date)} — outside stated availability
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    );
  }

  // ── Carer: My Schedule tab ────────────────────────────────────────────────
  function renderCarerSchedule() {
    const myVisits = weekVisits.filter(v => v.carerId === carerId);
    const mySchedules = buildWeekSchedules(myVisits, availability);

    const todayStr = new Date().toISOString().slice(0, 10);
    const upcoming = mySchedules.filter(s => s.date >= todayStr);
    const past     = mySchedules.filter(s => s.date < todayStr);

    if (upcoming.length === 0 && past.length === 0) {
      return (
        <Card>
          <div style={{ color: C.g3, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
            No visits scheduled this week
          </div>
        </Card>
      );
    }

    function renderDayBlock(sched: typeof mySchedules[0]) {
      const isToday = sched.date === todayStr;
      return (
        <div key={sched.date} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <SectionHeader>{isToday ? "Today · " : ""}{formatDate(sched.date)}</SectionHeader>
            {isToday && <Pill label="Today" color={C.teal} />}
            {sched.hasConflict && <Pill label="⚠ Travel tight" color={C.red} />}
          </div>
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sched.visits.map((visit, vi) => {
                const segment = sched.travelSegments.find(s => s.from.entryId === visit.entryId && s.from.startTime === visit.startTime);
                return <VisitCard key={vi} visit={visit} travelAfter={segment} />;
              })}
            </div>
            {sched.totalDistanceKm > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.g3, fontSize: 11 }}>Total travel</span>
                <span style={{ color: C.g1, fontSize: 11 }}>{sched.totalDistanceKm} km · {sched.totalMileage.toFixed(1)} mi · est. £{sched.mileagePayGBP.toFixed(2)}</span>
              </div>
            )}
          </Card>
        </div>
      );
    }

    return (
      <div>
        {upcoming.map(renderDayBlock)}
        {past.length > 0 && (
          <>
            <SectionHeader>Earlier this week</SectionHeader>
            {past.map(renderDayBlock)}
          </>
        )}
      </div>
    );
  }

  // ── Carer: My Availability tab ────────────────────────────────────────────
  function renderCarerAvail() {
    const myAvail = carerId ? availability[carerId] : undefined;
    return (
      <div>
        <SectionHeader>My Availability</SectionHeader>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ color: C.g2, fontSize: 12, lineHeight: 1.6 }}>
            Set the days and hours you are available to work. Your manager can see this when assigning visits and will be warned if a shift conflicts with your stated availability.
          </div>
        </Card>
        {myAvail ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
              {[1,2,3,4,5,6,0].map(dow => {
                const d = myAvail.weekly[dow];
                return (
                  <div key={dow} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, background: d?.available ? "rgba(79,209,197,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${d?.available ? "rgba(79,209,197,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                    <span style={{ color: d?.available ? C.g1 : C.g3, fontWeight: 600, fontSize: 13, width: 36 }}>{DAY_NAMES[dow]}</span>
                    <span style={{ color: d?.available ? C.teal : C.g3, fontSize: 12 }}>
                      {d?.available ? `${d.startTime} – ${d.endTime}` : "Unavailable"}
                    </span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setEditAvailFor(carerId!)}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px solid rgba(79,209,197,0.3)`, background: "rgba(79,209,197,0.06)", color: C.teal, fontFamily: "DM Sans,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              ✏ Edit Availability
            </button>
          </>
        ) : (
          <button onClick={() => {
            // Create blank availability first
            if (carerId) {
              const blank: CarerAvailability = {
                carerId,
                carerName: carerName ?? "",
                weekly: Object.fromEntries(
                  [0,1,2,3,4,5,6].map(d => [d, { available: d >= 1 && d <= 5, startTime: "09:00", endTime: "17:00" }])
                ) as Record<number, DayAvailability>,
              };
              setAvailability({ ...availability, [carerId]: blank });
              setEditAvailFor(carerId);
            }
          }}
            style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(90deg,${C.teal},${C.teal2})`, color: C.darkNavy, fontFamily: "DM Sans,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Set My Availability
          </button>
        )}
      </div>
    );
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────
  const managerTabs = [
    { id: "week",     label: "Week" },
    { id: "patterns", label: "Patterns" },
    { id: "mileage",  label: "Mileage" },
    { id: "avail",    label: "Availability" },
  ] as const;

  const carerTabs = [
    { id: "schedule",  label: "My Schedule" },
    { id: "my-avail",  label: "Availability" },
  ] as const;

  const tabs = isManager ? managerTabs : carerTabs;
  const hasWeekNav = tab === "week" || tab === "mileage" || tab === "schedule";

  const totalConflicts = weekSchedules.filter(s => s.hasConflict || s.availabilityConflict).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", background: `linear-gradient(160deg,${C.darkNavy} 0%,${C.navy} 100%)`, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "18px 18px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.g2, fontSize: 22, cursor: "pointer", padding: 0, marginBottom: 10 }}>‹</button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, color: "#fff" }}>
              {isManager ? "Rota" : "My Schedule"}
            </div>
            {hasWeekNav && (
              <div style={{ color: C.g2, fontSize: 12, marginTop: 2 }}>
                {formatWeekRange(weekRef)}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {hasWeekNav && (
              <>
                <button onClick={prevWeek} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", color: C.g1, fontFamily: "DM Sans,sans-serif", fontSize: 13, cursor: "pointer" }}>‹</button>
                <button onClick={nextWeek} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", color: C.g1, fontFamily: "DM Sans,sans-serif", fontSize: 13, cursor: "pointer" }}>›</button>
              </>
            )}
            {isManager && tab === "week" && (
              <button onClick={() => setShowAddVisit(true)}
                style={{ background: `linear-gradient(90deg,${C.teal},${C.teal2})`, border: "none", borderRadius: 8, padding: "7px 12px", color: C.darkNavy, fontFamily: "DM Sans,sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                + Add
              </button>
            )}
          </div>
        </div>

        {/* Conflict summary pill */}
        {isManager && totalConflicts > 0 && (tab === "week" || tab === "avail") && (
          <div style={{ background: "rgba(255,90,95,0.08)", border: "1px solid rgba(255,90,95,0.25)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ color: C.red, fontSize: 12 }}>
              {totalConflicts} schedule conflict{totalConflicts !== 1 ? "s" : ""} this week — check highlighted visits
            </span>
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, padding: "2px", background: "rgba(255,255,255,0.05)", borderRadius: 12, marginBottom: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: tab === t.id ? "rgba(255,255,255,0.12)" : "transparent", color: tab === t.id ? "#fff" : C.g3, fontFamily: "DM Sans,sans-serif", fontSize: 12, fontWeight: tab === t.id ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="phone-scroll" style={{ flex: 1, padding: "14px 18px 32px", overflowY: "auto" }}>
        {tab === "week"      && renderWeekView()}
        {tab === "patterns"  && renderPatterns()}
        {tab === "mileage"   && renderMileage()}
        {tab === "avail"     && renderManagerAvail()}
        {tab === "schedule"  && renderCarerSchedule()}
        {tab === "my-avail"  && renderCarerAvail()}
      </div>

      {/* Modals */}
      {showAddVisit && (
        <AddVisitModal onClose={() => setShowAddVisit(false)} onAdd={addEntry} />
      )}
      {editAvailFor && availability[editAvailFor] && (
        <AvailabilityEditor
          carerName={availability[editAvailFor].carerName}
          initial={availability[editAvailFor]}
          onSave={saveAvailability}
          onClose={() => setEditAvailFor(null)}
        />
      )}
    </div>
  );
}
