import {
  Award,
  Clock3,
  History,
  Languages,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { CarerAvailability, RotaEntry } from "../lib/rota";
import {
  rankStaffForClient,
  type MatchingCarer,
  type MatchingClient,
  type MatchReason,
} from "../lib/staffMatching";

const C = {
  navy: "#1B2A49",
  teal: "#4FD1C5",
  amber: "#F6B73C",
  green: "#22C55E",
  red: "#FF5A5F",
  g1: "#E2E8F0",
  g2: "#94A3B8",
  g3: "#475569",
};

function reasonIcon(criterion: string) {
  if (criterion === "Continuity") return <History size={13} />;
  if (criterion === "Skills") return <Award size={13} />;
  if (criterion === "Language") return <Languages size={13} />;
  if (criterion === "Proximity") return <MapPin size={13} />;
  return <Clock3 size={13} />;
}

function reasonColor(reason: MatchReason) {
  if (reason.tone === "matched") return C.teal;
  if (reason.tone === "missing") return C.amber;
  if (reason.tone === "blocked") return C.red;
  return C.g2;
}

export default function StaffMatchingPanel({
  client,
  carers,
  rotas,
  availability,
}: {
  client: MatchingClient;
  carers: MatchingCarer[];
  rotas: RotaEntry[];
  availability: Record<string, CarerAvailability>;
}) {
  const result = rankStaffForClient(client, carers, rotas, availability);

  return (
    <div style={{
      marginTop: 12,
      padding: "12px 13px",
      borderRadius: 12,
      background: "rgba(79,209,197,0.055)",
      border: "1px solid rgba(79,209,197,0.18)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 10 }}>
        <UserRoundCheck size={17} color={C.teal} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ color: C.teal, fontSize: 12, fontWeight: 700 }}>Rule-based match suggestions</div>
          <div style={{ color: C.g2, fontSize: 11, lineHeight: 1.45, marginTop: 2 }}>
            Suggestions only — the coordinator still makes the assignment using the selector above.
            Continuity carries up to 45 of 100 points; unavailable carers are not listed.
          </div>
        </div>
      </div>

      {result.ranked.length === 0 ? (
        <div style={{ color: C.amber, fontSize: 12, lineHeight: 1.45 }}>
          No active carer has confirmed availability for this slot. Review availability before assigning.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.ranked.map((match, index) => (
            <div key={match.carer.id} style={{
              background: "rgba(255,255,255,0.045)",
              border: `1px solid ${index === 0 ? "rgba(79,209,197,0.35)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10,
              padding: "10px 11px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                <div style={{
                  width: 25, height: 25, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: index === 0 ? "rgba(79,209,197,0.18)" : "rgba(255,255,255,0.08)",
                  color: index === 0 ? C.teal : C.g2, fontWeight: 700, fontSize: 11,
                }}>
                  #{index + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      {match.carer.name}
                    </div>
                    <div style={{ color: index === 0 ? C.teal : C.g1, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {match.score}/100
                    </div>
                  </div>
                  <div style={{ color: C.g3, fontSize: 10, marginTop: 2 }}>
                    {match.carer.role || "Carer"}
                    {match.continuityVisits > 0
                      ? ` · ${match.continuityVisits} existing client rota record${match.continuityVisits === 1 ? "" : "s"}`
                      : " · no client-specific continuity evidence"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 9, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {match.reasons.map(reason => (
                  <div key={reason.criterion} style={{ display: "flex", alignItems: "flex-start", gap: 7, color: reasonColor(reason), fontSize: 10, lineHeight: 1.4 }}>
                    <span style={{ display: "inline-flex", marginTop: 1, flexShrink: 0 }}>{reasonIcon(reason.criterion)}</span>
                    <span><strong>{reason.criterion}:</strong> {reason.detail}</span>
                    {reason.points > 0 && <span style={{ marginLeft: "auto", whiteSpace: "nowrap", fontWeight: 700 }}>+{reason.points}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {result.excluded.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7, color: C.g3, fontSize: 10, lineHeight: 1.4, marginTop: 9 }}>
          <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {result.excluded.length} carer{result.excluded.length === 1 ? "" : "s"} excluded by the availability/status rule.
          </span>
        </div>
      )}
    </div>
  );
}