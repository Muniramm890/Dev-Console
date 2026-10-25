// FILE: teacher-app/src/components/modals/NotificationModal.tsx
// Bell = chat-style Inbox. Announcements (and system messages like substitution duty) arrive as
// conversations; if the sender allowed replies, you can reply — ONLY the sender / school admin sees it.
// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { Icon } from "../ui/Icon";
import { ChatThread } from "../chat/ChatThread";
import { useChatThread } from "../../hooks/useChatThread";
import { usePolling } from "../../hooks/usePolling";
import { buildReplyForm } from "../../utils/chatMedia";
import { useIsMobile } from "../../hooks/useIsMobile";
import { CATEGORY_META } from "../../modules/commhub/helpers";
import { C } from "../../theme/theme";

const SOURCE_LABEL = { substitution: "Substitution duty" };

const shortTime = (d) => {
  if (!d) return "";
  const x = new Date(d), now = new Date();
  if (x.toDateString() === now.toDateString()) return x.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (now - x < 6 * 86400000) return x.toLocaleDateString("en-IN", { weekday: "short" });
  return x.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const catColor = (cat) => C[(CATEGORY_META[cat] || CATEGORY_META.general).color] || C.primary;
const catIcon = (c) => (c.kind === "system" ? "bell" : (CATEGORY_META[c.category] || CATEGORY_META.general).icon || "megaphone");

// ── one open conversation ──
const InboxThread = ({ messageId, onOpened, onBack, isMobile }) => {
  const load = useCallback(async () => {
    const res = await apiRequest(`/inbox/${messageId}`);
    const d = res?.data || {};
    return { meta: d, replies: d.replies || [], receipts: d.receipts || [] };
  }, [messageId]);
  const poll = useCallback(async (since) => {
    const res = await apiRequest(`/inbox/${messageId}/replies?since_seq=${since}`);
    return res?.data || { replies: [] };
  }, [messageId]);
  const send = useCallback(async (body, cid, prepared) => {
    const res = await apiRequest(`/inbox/${messageId}/reply`, "POST", buildReplyForm(body, cid, prepared), true);
    return res.data;
  }, [messageId]);

  const t = useChatThread({ threadKey: messageId, load, poll, send, ownSide: "recipient" });
  useEffect(() => { if (t.meta) onOpened?.(); }, [t.meta?.message_id]); // eslint-disable-line

  const m = t.meta;
  const label = m ? (m.kind === "system" ? SOURCE_LABEL[m.source_module] || "Notification" : (CATEGORY_META[m.category] || CATEGORY_META.general).label) : "";
  const closedNote = m && !m.can_reply
    ? (m.allow_replies ? "Replies are closed for this announcement." : "Replies are turned off for this announcement.")
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: isMobile ? "10px 52px 10px 8px" : "12px 56px 12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface, minHeight: 56 }}>
        {isMobile && (
          <button className="btn btn-ghost" onClick={onBack} aria-label="Back" style={{ width: 40, height: 40, padding: 0, flexShrink: 0, justifyContent: "center", touchAction: "manipulation" }}>
            <span style={{ display: "flex", transform: "rotate(180deg)" }}><Icon name="arrow_right" size={18} /></span>
          </button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="syne" style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m?.title || "…"}</div>
          {m && <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}{m.created_by_name ? ` · from ${m.created_by_name}` : ""}</div>}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatThread
          announcement={m ? { id: m.message_id, title: m.title, body: m.body, created_at: m.created_at, created_by_name: m.created_by_name, attachments: m.attachments, label } : null}
          messages={t.messages} ownSide="recipient" canReply={!!m?.can_reply} closedNote={closedNote}
          onSend={t.send} onRetry={t.retry} sending={t.sending} loading={t.loading} error={t.error}
          emptyHint={m?.can_reply ? "You can reply to this announcement." : ""}
        />
      </div>
    </div>
  );
};

// ── sender side: private thread with ONE person about my announcement (unlimited back-and-forth) ──
const SenderThread = ({ messageId, recipientId, onOpened, onBack, isMobile }) => {
  const base = `/inbox/thread/${messageId}/${recipientId}`;
  const load = useCallback(async () => {
    const res = await apiRequest(base);
    const d = res?.data || {};
    return { meta: d, replies: d.replies || [], receipts: d.receipts || [] };
  }, [base]);
  const poll = useCallback(async (since) => {
    const res = await apiRequest(`${base}/replies?since_seq=${since}`);
    return res?.data || { replies: [] };
  }, [base]);
  const send = useCallback(async (body, cid, prepared) => {
    const res = await apiRequest(`${base}/reply`, "POST", buildReplyForm(body, cid, prepared), true);
    return res.data;
  }, [base]);

  const t = useChatThread({ threadKey: `${messageId}:${recipientId}`, load, poll, send, ownSide: "admin" });
  useEffect(() => { if (t.meta) onOpened?.(); }, [t.meta?.message_id]); // eslint-disable-line

  const m = t.meta;
  const name = m?.person?.name || "…";
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: isMobile ? "10px 52px 10px 8px" : "12px 56px 12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface, minHeight: 56 }}>
        {isMobile && (
          <button className="btn btn-ghost" onClick={onBack} aria-label="Back" style={{ width: 40, height: 40, padding: 0, flexShrink: 0, justifyContent: "center", touchAction: "manipulation" }}>
            <span style={{ display: "flex", transform: "rotate(180deg)" }}><Icon name="arrow_right" size={18} /></span>
          </button>
        )}
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.primary}22`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
          {name.trim()[0]?.toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="syne" style={{ fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Re: {m?.title || "…"}</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatThread
          announcement={m ? { id: m.message_id, title: m.title, body: m.body, created_at: m.created_at, created_by_name: m.created_by_name, attachments: m.attachments, label: "Original announcement" } : null}
          messages={t.messages} ownSide="admin" canReply
          onSend={t.send} onRetry={t.retry} sending={t.sending} loading={t.loading} error={t.error}
          placeholder={`Reply to ${name}…`}
        />
      </div>
    </div>
  );
};

const itemKey = (c) => (c.type === "thread" ? `${c.message_id}:${c.recipient_id}` : c.message_id);

export const NotificationModal = ({ open, onClose, onUnreadChange, openRequest = null }) => {
  const isMobile = useIsMobile();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null); // { type: "announcement"|"thread", messageId, recipientId? }
  const activeKey = active ? (active.type === "thread" ? `${active.messageId}:${active.recipientId}` : active.messageId) : null;
  const [onlyUnread, setOnlyUnread] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const res = await apiRequest("/inbox/unread-count");
      onUnreadChange?.(res?.data?.count || 0);
    } catch (_) { /* ignore */ }
  }, [onUnreadChange]);

  const loadList = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiRequest("/inbox?limit=50");
      setList(Array.isArray(res?.data) ? res.data : []);
      setError("");
    } catch (e) { if (!silent) setError(e.message || "Could not load messages"); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!open) return;
    setActive(openRequest || null); // push tap -> seedha wahi chat
    loadList(false);
    refreshCount();
  }, [open]); // eslint-disable-line

  usePolling(() => { loadList(true); refreshCount(); }, 20000, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") (active && isMobile ? setActive(null) : onClose?.()); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, active, isMobile, onClose]);

  const visible = useMemo(() => (onlyUnread ? list.filter((c) => c.unread) : list), [list, onlyUnread]);
  const unreadTotal = useMemo(() => list.filter((c) => c.unread).length, [list]);

  const onOpened = useCallback(() => {
    // backend ne conversation read mark kar di -> list aur badge refresh
    setList((p) => p.map((c) => (itemKey(c) === activeKey ? { ...c, unread: 0 } : c)));
    refreshCount();
  }, [activeKey, refreshCount]);

  if (!open) return null;

  const showList = !isMobile || !active;
  const showThread = !isMobile || !!active;

  const closeBtn = (
    <button
      className="btn btn-ghost" onClick={onClose} aria-label="Close"
      style={{ position: "absolute", top: isMobile ? 7 : 9, right: isMobile ? 8 : 10, zIndex: 10, width: 42, height: 42, padding: 0, justifyContent: "center", touchAction: "manipulation" }}
    >
      <Icon name="close" size={17} />
    </button>
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, padding: isMobile ? 0 : 20, alignItems: isMobile ? "stretch" : "center" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", display: "flex", background: C.surface, overflow: "hidden", width: "100%",
          maxWidth: isMobile ? "none" : 960, height: isMobile ? "100dvh" : "min(680px, 88vh)",
          borderRadius: isMobile ? 0 : 20, border: isMobile ? "none" : `1px solid ${C.border}`, boxShadow: isMobile ? "none" : "0 30px 80px rgba(0,0,0,.35)",
        }}
      >
        {/* ── conversation list ── */}
        {showList && (
          <div style={{ width: isMobile ? "100%" : 330, flexShrink: 0, borderRight: isMobile ? "none" : `1px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
            <div style={{ padding: isMobile ? "14px 56px 10px 14px" : "16px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="bell" size={17} />
                <h3 className="syne" style={{ fontSize: 17, fontWeight: 800, flex: 1 }}>Inbox</h3>
                {unreadTotal > 0 && <span className="badge badge-blue">{unreadTotal} new</span>}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {[["all", "All"], ["unread", "Unread"]].map(([k, l]) => {
                  const on = (k === "unread") === onlyUnread;
                  return (
                    <button key={k} onClick={() => setOnlyUnread(k === "unread")}
                      style={{ padding: "5px 14px", borderRadius: 100, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation",
                        border: `1px solid ${on ? C.primary : C.border}`, background: on ? `${C.primary}1f` : "transparent", color: on ? C.primary : C.textMuted }}>
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {loading && <div style={{ textAlign: "center", padding: 30, color: C.textMuted, fontSize: 13 }}>Loading…</div>}
              {!loading && error && <div style={{ textAlign: "center", padding: 24, color: C.red, fontSize: 13 }}>{error}</div>}
              {!loading && !error && visible.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: C.textMuted }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, opacity: 0.6 }}><Icon name="message" size={28} /></div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{onlyUnread ? "No unread messages" : "No messages yet"}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Announcements and duty alerts will show up here.</div>
                </div>
              )}
              {visible.map((c) => {
                const isThread = c.type === "thread";
                const on = itemKey(c) === activeKey;
                const col = isThread ? C.primary : c.kind === "system" ? C.blue : catColor(c.category);
                // announcement: "You" = recipient side.  thread (I am the sender): "You" = admin side
                const mineSide = isThread ? "admin" : "recipient";
                const preview = c.last_reply_body
                  ? `${c.last_reply_side === mineSide ? "You: " : ""}${c.last_reply_body}`
                  : c.preview;
                return (
                  <button
                    key={itemKey(c)} onClick={() => setActive({ type: c.type, messageId: c.message_id, recipientId: c.recipient_id })}
                    style={{ width: "100%", textAlign: "left", display: "flex", gap: 11, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", color: C.text,
                      border: "none", borderBottom: `1px solid ${C.border}`, background: on ? `${C.primary}14` : "transparent", touchAction: "manipulation" }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: `${col}22`, color: col, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isThread ? <span style={{ fontWeight: 800, fontSize: 16 }}>{(c.person_name || "?").trim()[0]?.toUpperCase()}</span> : <Icon name={catIcon(c)} size={18} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: c.unread ? 800 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isThread ? c.person_name : c.title}</div>
                        <span style={{ fontSize: 11, color: c.unread ? C.primary : C.textMuted, fontWeight: c.unread ? 700 : 500, flexShrink: 0 }}>{shortTime(c.last_activity_at || c.created_at)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: c.unread ? C.text : C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isThread ? `Re: ${c.title} · ` : ""}{preview}</div>
                        {c.unread ? <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.primary, flexShrink: 0 }} /> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {isMobile && closeBtn}
          </div>
        )}

        {/* ── open conversation ── */}
        {showThread && (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
            {active ? (
              active.type === "thread" ? (
                <SenderThread key={activeKey} messageId={active.messageId} recipientId={active.recipientId} onOpened={onOpened} onBack={() => setActive(null)} isMobile={isMobile} />
              ) : (
                <InboxThread key={activeKey} messageId={active.messageId} onOpened={onOpened} onBack={() => setActive(null)} isMobile={isMobile} />
              )
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 8, padding: 24, textAlign: "center" }}>
                <Icon name="message" size={34} />
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Select a message</div>
                <div style={{ fontSize: 12.5 }}>Open an announcement to read it and reply to the admin.</div>
              </div>
            )}
            {closeBtn}
          </div>
        )}
      </div>
    </div>
  );
};
