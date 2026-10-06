import { useEffect, useState, type ReactNode } from "react";
import { loadEncrypted, saveEncrypted } from "../lib/careStore";
import {
  confirmCarePlan,
  fetchCarePlanVersions,
  generateCarePlan,
  type CarePlanDraft,
  type CarePlanSuggestion,
  type CarePlanVersion,
} from "../lib/carePlan";

const COLORS = {
  navy: "#1B2A49",
  darkNavy: "#0F1D34",
  teal: "#4FD1C5",
  teal2: "#38B2AC",
  amber: "#F6B73C",
  red: "#FF5A5F",
  green: "#22C55E",
  g1: "#E2E8F0",
  g2: "#94A3B8",
  g3: "#475569",
};

type StoredGeneratorState = {
  assessmentInput: string;
  draft: CarePlanDraft | null;
  queued: boolean;
};

type Props = {
  client: { id: string; name: string; age: number; address: string };
  reviewerName: string;
  cryptoKey?: CryptoKey | null;
  onBack: () => void;
  renderVoiceButton: (onAppend: (text: string) => void) => ReactNode;
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid rgba(79,209,197,0.25)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  padding: "10px 12px",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  lineHeight: 1.55,
  resize: "vertical",
  outline: "none",
};

function SuggestionEditor({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: CarePlanSuggestion;
  onChange: (next: CarePlanSuggestion) => void;
  onRemove?: () => void;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: 11,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <div style={{ color: COLORS.g2, fontSize: 11, fontWeight: 700 }}>
          {label}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              border: "none",
              background: "transparent",
              color: COLORS.red,
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            Remove
          </button>
        )}
      </div>
      <textarea
        aria-label={label}
        rows={3}
        value={value.suggestion}
        onChange={(event) =>
          onChange({ ...value, suggestion: event.target.value })
        }
        style={textareaStyle}
      />
      <div
        style={{
          marginTop: 7,
          padding: "7px 9px",
          borderRadius: 8,
          background: value.source
            ? "rgba(79,209,197,0.08)"
            : "rgba(255,255,255,0.04)",
          color: value.source ? COLORS.teal : COLORS.g3,
          fontSize: 10,
          lineHeight: 1.45,
        }}
      >
        {value.source ? `Source: “${value.source}”` : "No direct source identified"}
      </div>
    </div>
  );
}

export default function CarePlanGenerator({
  client,
  reviewerName,
  cryptoKey,
  onBack,
  renderVoiceButton,
}: Props) {
  const [assessmentInput, setAssessmentInput] = useState("");
  const [draft, setDraft] = useState<CarePlanDraft | null>(null);
  const [queued, setQueued] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [savedVersion, setSavedVersion] = useState<CarePlanVersion | null>(null);
  const [history, setHistory] = useState<CarePlanVersion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const storageKey = `carePlanGenerator_${client.id}`;

  useEffect(() => {
    let active = true;
    (async () => {
      if (cryptoKey) {
        const stored = await loadEncrypted<StoredGeneratorState>(
          cryptoKey,
          storageKey,
        );
        if (active && stored) {
          setAssessmentInput(stored.assessmentInput);
          setDraft(stored.draft);
          setQueued(stored.queued);
        }
      }
      if (navigator.onLine) {
        const versions = await fetchCarePlanVersions(client.id).catch(() => []);
        if (active) setHistory(versions);
      }
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [client.id, cryptoKey, storageKey]);

  useEffect(() => {
    if (!loaded || !cryptoKey) return;
    saveEncrypted(cryptoKey, storageKey, {
      assessmentInput,
      draft,
      queued,
    } satisfies StoredGeneratorState).catch(() => {});
  }, [assessmentInput, cryptoKey, draft, loaded, queued, storageKey]);

  async function runGeneration(input = assessmentInput) {
    if (!input.trim() || generating) return;
    if (!navigator.onLine) {
      setQueued(true);
      setError("");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const result = await generateCarePlan(client, input.trim());
      setDraft(result);
      setQueued(false);
      setSavedVersion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!queued) return;
    const processQueue = () => {
      if (navigator.onLine) void runGeneration(assessmentInput);
    };
    window.addEventListener("online", processQueue);
    processQueue();
    return () => window.removeEventListener("online", processQueue);
    // Queue processing deliberately uses the persisted assessment snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued]);

  function updateSingle(
    section: "personalDetailsAndPreferences",
    field: "summary",
    value: CarePlanSuggestion,
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [section]: { ...current[section], [field]: value },
          }
        : current,
    );
  }

  function updateNeed(
    field: keyof CarePlanDraft["needs"],
    value: CarePlanSuggestion,
  ) {
    setDraft((current) =>
      current
        ? { ...current, needs: { ...current.needs, [field]: value } }
        : current,
    );
  }

  function updateList(
    section:
      | "identifiedRisks"
      | "goalsAndDesiredOutcomes"
      | "dailyRoutine"
      | "notes",
    index: number,
    value?: CarePlanSuggestion,
  ) {
    setDraft((current) => {
      if (!current) return current;
      const next = [...current[section]];
      if (value) next[index] = value;
      else next.splice(index, 1);
      return { ...current, [section]: next };
    });
  }

  function addListItem(
    section:
      | "identifiedRisks"
      | "goalsAndDesiredOutcomes"
      | "dailyRoutine"
      | "notes",
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [section]: [
              ...current[section],
              { suggestion: "", source: null },
            ],
          }
        : current,
    );
  }

  async function handleConfirm() {
    if (!draft || confirming || !navigator.onLine) return;
    setConfirming(true);
    setError("");
    try {
      const version = await confirmCarePlan(
        client.id,
        assessmentInput,
        draft,
      );
      setSavedVersion(version);
      setHistory((current) => [
        version,
        ...current.filter((item) => item.id !== version.id),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Care plan save failed");
    } finally {
      setConfirming(false);
    }
  }

  const listSections = draft
    ? [
        {
          key: "identifiedRisks" as const,
          title: "Identified risks",
          icon: "⚠️",
        },
        {
          key: "goalsAndDesiredOutcomes" as const,
          title: "Goals and desired outcomes",
          icon: "🎯",
        },
        { key: "dailyRoutine" as const, title: "Daily routine", icon: "🕐" },
        { key: "notes" as const, title: "Notes", icon: "📝" },
      ]
    : [];

  return (
    <div
      style={{
        height: "100%",
        background: `linear-gradient(160deg, ${COLORS.darkNavy}, ${COLORS.navy})`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px 18px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: COLORS.g2,
            fontSize: 22,
            cursor: "pointer",
            padding: 0,
            marginBottom: 8,
          }}
        >
          ‹
        </button>
        <div
          style={{
            fontFamily: "DM Serif Display, serif",
            fontSize: 21,
            color: "#fff",
          }}
        >
          Generate Care Plan
        </div>
        <div style={{ color: COLORS.g2, fontSize: 12, marginTop: 2 }}>
          {client.name}
          {history[0] ? ` · Latest version ${history[0].version}` : ""}
        </div>
      </div>

      <div className="phone-scroll" style={{ flex: 1, padding: "12px 16px 32px" }}>
        <div
          style={{
            background: "rgba(246,183,60,0.1)",
            border: "1px solid rgba(246,183,60,0.3)",
            borderRadius: 12,
            padding: "11px 12px",
            color: COLORS.amber,
            fontSize: 11,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          <strong>AI draft only.</strong> This supports a human care planner and
          does not replace professional judgement. Review and edit every
          suggestion before confirming.
        </div>

        {!draft ? (
          <>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
              Assessment input
            </div>
            <div
              style={{
                color: COLORS.g2,
                fontSize: 11,
                lineHeight: 1.5,
                margin: "4px 0 8px",
              }}
            >
              Type or dictate the assessment. It is stored securely on this
              device while you work.
            </div>
            <div style={{ position: "relative" }}>
              <textarea
                aria-label="Assessment input"
                rows={13}
                value={assessmentInput}
                onChange={(event) => setAssessmentInput(event.target.value)}
                placeholder="Example: Mary prefers to be called Mary. She needs one-person support with washing and dressing..."
                style={{ ...textareaStyle, paddingRight: 48, fontSize: 13 }}
              />
              <div style={{ position: "absolute", right: 10, bottom: 10 }}>
                {renderVoiceButton((text) =>
                  setAssessmentInput((current) =>
                    `${current}${current && !current.endsWith(" ") ? " " : ""}${text}`,
                  ),
                )}
              </div>
            </div>
            {queued && (
              <div
                style={{
                  marginTop: 10,
                  background: "rgba(246,183,60,0.1)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: COLORS.amber,
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                Offline: generation is queued. Your assessment is saved and
                will be processed automatically when the connection returns.
              </div>
            )}
            <button
              type="button"
              disabled={!assessmentInput.trim() || generating}
              onClick={() => void runGeneration()}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 12,
                padding: "13px 0",
                marginTop: 12,
                background:
                  assessmentInput.trim() && !generating
                    ? `linear-gradient(90deg,${COLORS.teal},${COLORS.teal2})`
                    : "rgba(255,255,255,0.1)",
                color:
                  assessmentInput.trim() && !generating
                    ? COLORS.darkNavy
                    : COLORS.g3,
                fontWeight: 700,
                cursor:
                  assessmentInput.trim() && !generating
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {generating
                ? "Generating structured draft…"
                : queued
                  ? "Queued for reconnection"
                  : "Generate draft care plan"}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                color: COLORS.teal,
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 4,
              }}
            >
              Review and confirm
            </div>
            <div
              style={{
                color: COLORS.g2,
                fontSize: 11,
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              All AI content remains an editable suggestion until you press
              “Confirm and save version”.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <section>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 7 }}>
                  👤 Personal details and preferences
                </div>
                <SuggestionEditor
                  label="Summary"
                  value={draft.personalDetailsAndPreferences.summary}
                  onChange={(value) =>
                    updateSingle("personalDetailsAndPreferences", "summary", value)
                  }
                />
              </section>

              <section>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 7 }}>
                  🤝 Needs
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {(
                    [
                      ["personalCare", "Personal care"],
                      ["mobility", "Mobility"],
                      ["nutrition", "Nutrition"],
                      ["medication", "Medication"],
                      ["social", "Social"],
                    ] as const
                  ).map(([key, label]) => (
                    <SuggestionEditor
                      key={key}
                      label={label}
                      value={draft.needs[key]}
                      onChange={(value) => updateNeed(key, value)}
                    />
                  ))}
                </div>
              </section>

              {listSections.map((section) => (
                <section key={section.key}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 7 }}>
                    {section.icon} {section.title}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {draft[section.key].map((item, index) => (
                      <SuggestionEditor
                        key={`${section.key}-${index}`}
                        label={`${section.title} ${index + 1}`}
                        value={item}
                        onChange={(value) =>
                          updateList(section.key, index, value)
                        }
                        onRemove={
                          draft[section.key].length > 1
                            ? () => updateList(section.key, index)
                            : undefined
                        }
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => addListItem(section.key)}
                      style={{
                        border: "1px dashed rgba(79,209,197,0.3)",
                        borderRadius: 9,
                        background: "rgba(79,209,197,0.05)",
                        color: COLORS.teal,
                        padding: "8px 0",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      + Add item
                    </button>
                  </div>
                </section>
              ))}
            </div>

            {savedVersion && (
              <div
                style={{
                  marginTop: 12,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: 11,
                  padding: "10px 12px",
                  color: COLORS.green,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✓ Care plan version {savedVersion.version} confirmed and saved
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setSavedVersion(null);
                }}
                style={{
                  flex: 1,
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 11,
                  background: "rgba(255,255,255,0.05)",
                  color: COLORS.g1,
                  padding: "11px 0",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                Back to assessment
              </button>
              <button
                type="button"
                disabled={confirming || !navigator.onLine}
                onClick={() => void handleConfirm()}
                style={{
                  flex: 1.5,
                  border: "none",
                  borderRadius: 11,
                  background:
                    confirming || !navigator.onLine
                      ? "rgba(255,255,255,0.1)"
                      : `linear-gradient(90deg,${COLORS.teal},${COLORS.teal2})`,
                  color:
                    confirming || !navigator.onLine
                      ? COLORS.g3
                      : COLORS.darkNavy,
                  padding: "11px 0",
                  cursor:
                    confirming || !navigator.onLine
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 700,
                  fontSize: 11,
                }}
              >
                {confirming
                  ? "Saving…"
                  : navigator.onLine
                    ? "Confirm and save version"
                    : "Reconnect to confirm"}
              </button>
            </div>
          </>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 10,
              background: "rgba(255,90,95,0.1)",
              borderRadius: 10,
              padding: "9px 11px",
              color: COLORS.red,
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}