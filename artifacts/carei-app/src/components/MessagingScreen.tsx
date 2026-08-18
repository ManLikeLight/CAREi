/**
 * MessagingScreen — carer ↔ manager in-app messaging.
 *
 * Security: all messages are stored via saveEncrypted (AES-GCM 256-bit, key
 * derived from PIN). The outbox queue is also encrypted at rest. Raw
 * plaintext is never written to IndexedDB.
 *
 * Offline-first: messages composed offline are placed in a QueuedMessage[]
 * array, encrypted and persisted. On reconnect (online event) the queue is
 * drained automatically.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  type Message,
  type QueuedMessage,
  MESSAGE_TAGS,
  apiFetchMessages,
  apiSendMessage,
  apiReplyToMessage,
  apiMarkRead,
  formatRelativeTime,
  tagEmoji,
} from "../lib/messaging";
import { saveEncrypted, loadEncrypted } from "../lib/careStore";

// ── Colour palette (matches CAREiApp) ─────────────────────────────────────────
const C = {
  darkNavy: "#0B1629",
  navy:     "#112240",
  teal:     "#00CBA9",
  teal2:    "#00A88F",
  amber:    "#F59E0B",
  red:      "#EF4444",
  g1:       "#8892A4",
  g2:       "#6B7280",
  card:     "rgba(255,255,255,0.05)",
  border:   "rgba(255,255,255,0.08)",
  white:    "#FFFFFF",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  role: "carer" | "manager" | null;
  carerId: string;
  carerName: string;
  /** If provided, messages are encrypted/decrypted with this key. */
  cryptoKey?: CryptoKey;
  onBack: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${C.teal}, ${C.teal2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: C.darkNavy, fontWeight: 700, fontSize: size * 0.35,
    }}>
      {initials}
    </div>
  );
}

function TagChip({ label, emoji, active, onClick }: { label: string; emoji: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "5px 10px", borderRadius: 20,
        border: `1px solid ${active ? C.teal : C.border}`,
        background: active ? "rgba(0,203,169,0.15)" : "transparent",
        color: active ? C.teal : C.g1, fontSize: 12, cursor: onClick ? "pointer" : "default",
        fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap",
      }}
    >
      <span>{emoji}</span>{label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MessagingScreen({ role, carerId, carerName, cryptoKey, onBack }: Props) {
  const isManager = role === "manager";

  const [messages,      setMessages]      = useState<Message[]>([]);
  const [queue,         setQueue]         = useState<QueuedMessage[]>([]);
  const [activeThread,  setActiveThread]  = useState<Message | null>(null);
  const [showCompose,   setShowCompose]   = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [online,        setOnline]        = useState(navigator.onLine);
  const [syncing,       setSyncing]       = useState(false);

  // Compose state
  const [composeBody,    setComposeBody]    = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeTags,    setComposeTags]    = useState<string[]>([]);
  const [sendError,      setSendError]      = useState("");
  const [sending,        setSending]        = useState(false);

  // Reply state (manager)
  const [replyBody,  setReplyBody]  = useState("");
  const [replySent,  setReplySent]  = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replying,   setReplying]   = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Encrypted persistence ────────────────────────────────────────────────────

  const STORE_MESSAGES = `msgs_${carerId}`;
  const STORE_QUEUE    = `msgqueue_${carerId}`;

  const saveMessages = useCallback(async (msgs: Message[]) => {
    if (!cryptoKey) return;
    await saveEncrypted(cryptoKey, STORE_MESSAGES, msgs);
  }, [cryptoKey, STORE_MESSAGES]);

  const saveQueue = useCallback(async (q: QueuedMessage[]) => {
    if (!cryptoKey) return;
    await saveEncrypted(cryptoKey, STORE_QUEUE, q);
  }, [cryptoKey, STORE_QUEUE]);

  // Load cached data on mount
  useEffect(() => {
    if (!cryptoKey) return;
    (async () => {
      const cachedMsgs  = await loadEncrypted<Message[]>(cryptoKey, STORE_MESSAGES);
      const cachedQueue = await loadEncrypted<QueuedMessage[]>(cryptoKey, STORE_QUEUE);
      if (cachedMsgs)  setMessages(cachedMsgs);
      if (cachedQueue) setQueue(cachedQueue);
    })();
  }, [cryptoKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Network fetch ────────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    try {
      const fetched = await apiFetchMessages(isManager ? undefined : carerId);
      setMessages(fetched);
      await saveMessages(fetched);
    } catch {
      // Offline — keep cached
    } finally {
      setLoading(false);
    }
  }, [isManager, carerId, saveMessages]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Online/offline detection
  useEffect(() => {
    const goOnline  = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Drain offline queue on reconnect ─────────────────────────────────────────

  useEffect(() => {
    if (!online || queue.length === 0 || syncing) return;
    (async () => {
      setSyncing(true);
      const remaining: QueuedMessage[] = [];
      for (const q of queue) {
        try {
          const sent = await apiSendMessage({
            fromCarerId:   q.fromCarerId,
            fromCarerName: q.fromCarerName,
            body:          q.body,
            subject:       q.subject,
            tags:          q.tags,
            timestamp:     q.timestamp,
          });
          setMessages(prev => {
            const next = [sent, ...prev.filter(m => m.id !== sent.id)];
            saveMessages(next);
            return next;
          });
        } catch {
          remaining.push(q);
        }
      }
      setQueue(remaining);
      await saveQueue(remaining);
      setSyncing(false);
    })();
  }, [online, queue, syncing, saveMessages, saveQueue]);

  // ── Send (carer) ─────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!composeBody.trim()) { setSendError("Please enter a message."); return; }
    setSending(true);
    setSendError("");
    const payload = {
      fromCarerId:   carerId,
      fromCarerName: carerName,
      body:          composeBody.trim(),
      subject:       composeSubject.trim() || undefined,
      tags:          composeTags,
      timestamp:     new Date().toISOString(),
    };

    if (!online) {
      // Queue offline
      const queued: QueuedMessage = { ...payload, tempId: `tmp-${Date.now()}`, tags: composeTags };
      const nextQueue = [queued, ...queue];
      setQueue(nextQueue);
      await saveQueue(nextQueue);
      setSending(false);
      setShowCompose(false);
      resetCompose();
      return;
    }

    try {
      const sent = await apiSendMessage(payload);
      const next = [sent, ...messages];
      setMessages(next);
      await saveMessages(next);
      setShowCompose(false);
      resetCompose();
    } catch {
      setSendError("Failed to send. Message saved to outbox.");
      const queued: QueuedMessage = { ...payload, tempId: `tmp-${Date.now()}`, tags: composeTags };
      const nextQueue = [queued, ...queue];
      setQueue(nextQueue);
      await saveQueue(nextQueue);
    } finally {
      setSending(false);
    }
  }

  function resetCompose() {
    setComposeBody(""); setComposeSubject(""); setComposeTags([]); setSendError("");
  }

  // ── Reply (manager) ──────────────────────────────────────────────────────────

  async function handleReply() {
    if (!activeThread || !replyBody.trim()) return;
    setReplying(true);
    setReplyError("");
    try {
      const updated = await apiReplyToMessage(activeThread.id, carerName, replyBody.trim());
      setActiveThread(updated);
      const next = messages.map(m => m.id === updated.id ? updated : m);
      setMessages(next);
      await saveMessages(next);
      setReplyBody("");
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2000);
    } catch {
      setReplyError("Failed to send reply. Check connection.");
    } finally {
      setReplying(false);
    }
  }

  // Mark thread read when opened
  async function openThread(msg: Message) {
    setActiveThread(msg);
    setReplyBody(""); setReplyError(""); setReplySent(false);
    if (!msg.read && online) {
      try {
        await apiMarkRead(msg.id);
        const next = messages.map(m => m.id === msg.id ? { ...m, read: true } : m);
        setMessages(next);
        await saveMessages(next);
      } catch {}
    }
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 80);
  }

  // ── Computed ─────────────────────────────────────────────────────────────────

  const unreadCount = messages.filter(m => !m.read && !isManager).length;
  const pendingCount = queue.length;

  // ── Compose quick-tag toggle ─────────────────────────────────────────────────

  function toggleTag(id: string) {
    setComposeTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  // ── Render helpers ────────────────────────────────────────────────────────────

  const shared: React.CSSProperties = {
    height: "100%", background: `linear-gradient(160deg, ${C.darkNavy} 0%, ${C.navy} 100%)`,
    display: "flex", flexDirection: "column", fontFamily: "DM Sans, sans-serif",
    color: C.white, position: "relative",
  };

  // ── Thread detail view ────────────────────────────────────────────────────────

  if (activeThread) {
    return (
      <div style={shared}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setActiveThread(null)} style={backBtn}>← Back</button>
            <Avatar name={activeThread.fromCarerName} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{activeThread.fromCarerName}</div>
              {activeThread.subject && (
                <div style={{ color: C.g1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeThread.subject}
                </div>
              )}
            </div>
            <div style={{ color: C.g2, fontSize: 11 }}>{formatRelativeTime(activeThread.timestamp)}</div>
          </div>
          {/* Tags */}
          {activeThread.tags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, paddingLeft: 52 }}>
              {activeThread.tags.map(t => (
                <TagChip key={t} label={MESSAGE_TAGS.find(x => x.id === t)?.label ?? t} emoji={tagEmoji(t)} />
              ))}
            </div>
          )}
        </div>

        {/* Thread body */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Original message */}
          <div style={bubbleLeft}>
            <Avatar name={activeThread.fromCarerName} size={28} />
            <div style={{ flex: 1 }}>
              <div style={bubbleBodyLeft}>{activeThread.body}</div>
              <div style={bubbleTime}>{formatRelativeTime(activeThread.timestamp)}</div>
            </div>
          </div>

          {/* Replies */}
          {activeThread.replies.map(r => (
            <div key={r.id} style={r.fromRole === "manager" ? bubbleRight : bubbleLeft}>
              {r.fromRole === "carer" && <Avatar name={r.fromName} size={28} />}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: r.fromRole === "manager" ? "flex-end" : "flex-start" }}>
                <div style={r.fromRole === "manager" ? bubbleBodyRight : bubbleBodyLeft}>{r.body}</div>
                <div style={bubbleTime}>{r.fromName} · {formatRelativeTime(r.timestamp)}</div>
              </div>
              {r.fromRole === "manager" && <Avatar name={r.fromName} size={28} />}
            </div>
          ))}
        </div>

        {/* Reply box — manager only */}
        {isManager && (
          <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            {replySent && (
              <div style={{ color: C.teal, fontSize: 13, marginBottom: 8, textAlign: "center" }}>✓ Reply sent</div>
            )}
            {replyError && (
              <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{replyError}</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Type a reply…"
                rows={2}
                style={textareaStyle}
              />
              <button
                onClick={handleReply}
                disabled={!replyBody.trim() || replying}
                style={sendBtnStyle(!!replyBody.trim() && !replying)}
              >
                {replying ? "…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Compose modal ─────────────────────────────────────────────────────────────

  if (showCompose) {
    return (
      <div style={shared}>
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { setShowCompose(false); resetCompose(); }} style={backBtn}>✕</button>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 20 }}>New Message</div>
          </div>
          <div style={{ color: C.g1, fontSize: 12, marginTop: 4, paddingLeft: 4 }}>To: Your manager</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {/* Quick tags */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.g1, fontSize: 12, marginBottom: 8 }}>Quick tag (optional)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MESSAGE_TAGS.map(t => (
                <TagChip
                  key={t.id}
                  label={t.label}
                  emoji={t.emoji}
                  active={composeTags.includes(t.id)}
                  onClick={() => toggleTag(t.id)}
                />
              ))}
            </div>
          </div>

          {/* Quick-send templates */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.g1, fontSize: 12, marginBottom: 8 }}>Quick send</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {QUICK_MESSAGES.map(q => (
                <button
                  key={q.body}
                  onClick={() => { setComposeBody(q.body); setComposeTags(q.tags); }}
                  style={{
                    textAlign: "left", padding: "10px 14px", borderRadius: 10,
                    border: `1px solid ${composeBody === q.body ? C.teal : C.border}`,
                    background: composeBody === q.body ? "rgba(0,203,169,0.08)" : C.card,
                    color: composeBody === q.body ? C.teal : C.white,
                    fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <span style={{ marginRight: 8 }}>{tagEmoji(q.tags[0] ?? "update")}</span>
                  {q.body}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: C.g1, fontSize: 12, marginBottom: 6 }}>Subject (optional)</div>
            <input
              value={composeSubject}
              onChange={e => setComposeSubject(e.target.value)}
              placeholder="e.g. Mary Johnson – visit update"
              style={inputStyle}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: C.g1, fontSize: 12, marginBottom: 6 }}>Message *</div>
            <textarea
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
              placeholder="Write your message here…"
              rows={5}
              style={textareaStyle}
            />
          </div>

          {!online && (
            <div style={{ background: "rgba(245,158,11,0.12)", border: `1px solid ${C.amber}`, borderRadius: 10, padding: "10px 14px", color: C.amber, fontSize: 12, marginBottom: 12 }}>
              📶 You're offline. Message will be queued and sent automatically when you reconnect.
            </div>
          )}

          {sendError && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{sendError}</div>}
        </div>

        <div style={{ padding: "12px 16px 24px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            onClick={handleSend}
            disabled={!composeBody.trim() || sending}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
              background: composeBody.trim() && !sending
                ? `linear-gradient(135deg, ${C.teal}, ${C.teal2})`
                : "rgba(255,255,255,0.06)",
              color: composeBody.trim() && !sending ? C.darkNavy : C.g2,
              fontWeight: 700, fontSize: 15, cursor: composeBody.trim() && !sending ? "pointer" : "default",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {sending ? "Sending…" : online ? "Send Message" : "Save to Outbox"}
          </button>
        </div>
      </div>
    );
  }

  // ── Inbox / thread list ────────────────────────────────────────────────────────

  const displayList: Array<Message | QueuedMessage & { _queued: true }> = [
    ...queue.map(q => ({ ...q, _queued: true as const })),
    ...messages,
  ];

  return (
    <div style={shared}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onBack} style={backBtn}>← Back</button>
            <div>
              <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 22 }}>
                {isManager ? "Team Messages" : "Messages"}
              </div>
              <div style={{ color: C.g1, fontSize: 12 }}>
                {isManager ? "All carer messages" : "Your manager"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!online && (
              <div style={{ fontSize: 10, color: C.amber, background: "rgba(245,158,11,0.12)", padding: "3px 8px", borderRadius: 20, border: `1px solid ${C.amber}` }}>
                Offline
              </div>
            )}
            {syncing && (
              <div style={{ fontSize: 10, color: C.teal, background: "rgba(0,203,169,0.12)", padding: "3px 8px", borderRadius: 20 }}>
                Syncing…
              </div>
            )}
            {!isManager && (
              <button
                onClick={() => setShowCompose(true)}
                style={{
                  padding: "8px 14px", borderRadius: 20, border: "none",
                  background: `linear-gradient(135deg, ${C.teal}, ${C.teal2})`,
                  color: C.darkNavy, fontWeight: 700, fontSize: 13,
                  cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                ✏️ Compose
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {!isManager && (
          <div style={{ display: "flex", gap: 16, marginTop: 12, paddingLeft: 4 }}>
            {unreadCount > 0 && (
              <div style={{ color: C.teal, fontSize: 12 }}>
                <span style={{ fontWeight: 700 }}>{unreadCount}</span> unread
              </div>
            )}
            {pendingCount > 0 && (
              <div style={{ color: C.amber, fontSize: 12 }}>
                <span style={{ fontWeight: 700 }}>{pendingCount}</span> pending in outbox
              </div>
            )}
            {unreadCount === 0 && pendingCount === 0 && (
              <div style={{ color: C.g2, fontSize: 12 }}>All up to date</div>
            )}
          </div>
        )}
        {isManager && messages.length > 0 && (
          <div style={{ marginTop: 12, paddingLeft: 4 }}>
            <div style={{ color: C.g2, fontSize: 12 }}>
              {messages.filter(m => !m.read).length} unread · {messages.length} total
            </div>
          </div>
        )}
      </div>

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.g2, fontSize: 14 }}>Loading…</div>
        ) : displayList.length === 0 ? (
          <EmptyState isManager={isManager} onCompose={() => setShowCompose(true)} />
        ) : (
          displayList.map(item => {
            if ("_queued" in item && item._queued) {
              // Queued message row
              return (
                <div key={item.tempId} style={{ ...threadRow, opacity: 0.75 }}>
                  <Avatar name={item.fromCarerName} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.white }}>
                        {isManager ? item.fromCarerName : "Your manager"}
                      </div>
                      <div style={{ fontSize: 10, color: C.amber, background: "rgba(245,158,11,0.15)", padding: "2px 7px", borderRadius: 10, border: `1px solid ${C.amber}`, flexShrink: 0, marginLeft: 8 }}>
                        Pending
                      </div>
                    </div>
                    {item.subject && (
                      <div style={{ color: C.g1, fontSize: 12, marginBottom: 2 }}>{item.subject}</div>
                    )}
                    <div style={{ color: C.g2, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.body}
                    </div>
                    {item.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                        {item.tags.map(t => (
                          <span key={t} style={tagPill}>{tagEmoji(t)} {MESSAGE_TAGS.find(x => x.id === t)?.label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const msg = item as Message;
            const unread = !msg.read && !isManager;
            return (
              <div
                key={msg.id}
                onClick={() => openThread(msg)}
                style={{
                  ...threadRow,
                  background: unread ? "rgba(0,203,169,0.04)" : "transparent",
                  borderLeft: unread ? `3px solid ${C.teal}` : "3px solid transparent",
                }}
              >
                <Avatar name={msg.fromCarerName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <div style={{ fontWeight: unread ? 700 : 600, fontSize: 14, color: C.white }}>
                      {isManager ? msg.fromCarerName : "Your manager"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                      {msg.replies.length > 0 && (
                        <span style={{ fontSize: 11, color: C.teal }}>💬 {msg.replies.length}</span>
                      )}
                      {!msg.read && !isManager && (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal }} />
                      )}
                      <div style={{ color: C.g2, fontSize: 11 }}>{formatRelativeTime(msg.timestamp)}</div>
                    </div>
                  </div>
                  {msg.subject && (
                    <div style={{ color: unread ? C.white : C.g1, fontSize: 12, marginBottom: 2, fontWeight: unread ? 600 : 400 }}>
                      {msg.subject}
                    </div>
                  )}
                  <div style={{ color: C.g2, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {msg.body}
                  </div>
                  {msg.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                      {msg.tags.map(t => (
                        <span key={t} style={tagPill}>{tagEmoji(t)} {MESSAGE_TAGS.find(x => x.id === t)?.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ isManager, onCompose }: { isManager: boolean; onCompose: () => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 16 }}>
      <div style={{ fontSize: 48 }}>💬</div>
      <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 20, color: "#fff", textAlign: "center" }}>
        {isManager ? "No messages yet" : "Nothing here yet"}
      </div>
      <div style={{ color: C.g1, fontSize: 14, textAlign: "center", lineHeight: 1.6 }}>
        {isManager
          ? "Messages from your carers will appear here."
          : "Send your manager a quick update, flag an overstay, or raise a concern."}
      </div>
      {!isManager && (
        <button
          onClick={onCompose}
          style={{
            marginTop: 8, padding: "12px 28px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, #00CBA9, #00A88F)`,
            color: "#0B1629", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "DM Sans, sans-serif",
          }}
        >
          ✏️ Send a message
        </button>
      )}
    </div>
  );
}

// ── Quick-send templates ──────────────────────────────────────────────────────

const QUICK_MESSAGES = [
  { body: "Running a few minutes late to my next visit.", tags: ["running-late"] },
  { body: "Overstaying this visit — client needs extra support today.", tags: ["overstay"] },
  { body: "Client has a concern I'd like to discuss — please call when free.", tags: ["client-concern"] },
  { body: "Visit completed. All well — nothing to flag.", tags: ["update"] },
  { body: "Urgent: please contact me as soon as possible.", tags: ["urgent"] },
];

// ── Shared styles ─────────────────────────────────────────────────────────────

const backBtn: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.border}`,
  background: "transparent", color: C.g1, fontSize: 13, cursor: "pointer",
  fontFamily: "DM Sans, sans-serif", flexShrink: 0,
};

const textareaStyle: React.CSSProperties = {
  flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
  borderRadius: 12, color: C.white, fontSize: 14, padding: "10px 12px",
  fontFamily: "DM Sans, sans-serif", resize: "none", outline: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
  borderRadius: 12, color: C.white, fontSize: 14, padding: "10px 12px",
  fontFamily: "DM Sans, sans-serif", outline: "none",
};

const threadRow: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 12,
  padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
  cursor: "pointer", transition: "background 0.15s",
};

const bubbleLeft: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 8,
};

const bubbleRight: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 8, flexDirection: "row-reverse",
};

const bubbleBodyLeft: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", borderRadius: "4px 14px 14px 14px",
  padding: "10px 14px", fontSize: 14, lineHeight: 1.6, color: "#fff",
  maxWidth: "80%",
};

const bubbleBodyRight: React.CSSProperties = {
  background: "rgba(0,203,169,0.15)", border: "1px solid rgba(0,203,169,0.25)",
  borderRadius: "14px 4px 14px 14px",
  padding: "10px 14px", fontSize: 14, lineHeight: 1.6, color: C.teal,
  maxWidth: "80%",
};

const bubbleTime: React.CSSProperties = {
  color: C.g2, fontSize: 11, marginTop: 4, padding: "0 4px",
};

const tagPill: React.CSSProperties = {
  fontSize: 11, color: C.g1, background: "rgba(255,255,255,0.06)",
  border: `1px solid ${C.border}`, borderRadius: 12, padding: "2px 8px",
};

function sendBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0 16px", borderRadius: 12, border: "none", flexShrink: 0,
    background: active ? `linear-gradient(135deg, #00CBA9, #00A88F)` : "rgba(255,255,255,0.06)",
    color: active ? "#0B1629" : C.g2, fontWeight: 700, fontSize: 14,
    cursor: active ? "pointer" : "default", fontFamily: "DM Sans, sans-serif",
  };
}
