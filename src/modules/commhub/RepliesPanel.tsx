// @ts-nocheck
// Admin side of announcement chat: every person who replied has ONE private thread with the admin side.
// Visible only to school_admin / the sender (backend enforces it) — recipients never see each other.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { Icon } from "../../components/ui/Icon";
import { ChatThread } from "../../components/chat/ChatThread";
import { useChatThread } from "../../hooks/useChatThread";
import { usePolling } from "../../hooks/usePolling";
import { buildReplyForm } from "../../utils/chatMedia";
import { useIsMobile } from "../../hooks/useIsMobile";
import { CATEGORY_META } from "./helpers";
import { C } from "../../theme/theme";

const shortTime = (d) => {
  if (!d) return "";
  const x = new Date(d), now = new Date();
  if (x.toDateString() === now.toDateString()) return x.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return x.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const AdminThread = ({ messageId, recipientId, name, announcement, isMobile, onBack, onChanged }) => {
  const base = `/comm/messages/${messageId}/threads/${recipientId}`;
  const load = useCallback(async () => {
    const res = await apiRequest(base);
    return { meta: res?.data, replies: res?.data?.replies || [], receipts: res?.data?.receipts || [] };
  }, [base]);
  const poll = useCallback(async (since) => {
    const res = await apiRequest(`${base}?since_seq=${since}`);
    return res?.data || { replies: [] };
  }, [base]);
  const send = useCallback(async (body, cid, prepared) => {
    const res = await apiRequest(`${base}/reply`, "POST", buildReplyForm(body, cid, prepared), true);
    onChanged?.();
    return res.data;
  }, [base]); // eslint-disable-line

  const t = useChatThread({ threadKey: recipientId, load, poll, send, ownSide: "admin" });
  useEffect(() => { if (t.meta) onChanged?.(); }, [t.meta?.recipient?.recipient_id]); // eslint-disable-line

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: isMobile ? "10px 52px 10px 8px" : "12px 56px 12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface, minHeight: 56 }}>
        {isMobile && (
          <button className="btn btn-ghost" onClick={onBack} aria-label="Back" style={{ width: 40, height: 40, padding: 0, flexShrink: 0, justifyContent: "center", touchAction: "manipulation" }}>
            <span style={{ display: "flex", transform: "rotate(180deg)" }}><Icon name="arrow_right" size={18} /></span>
          </button>
        )}
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${C.primary}22`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
          {(name || "?").trim()[0]?.toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="syne" style={{ fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatThread
          announcement={announcement} messages={t.messages} ownSide="admin" canReply
          onSend={t.send} onRetry={t.retry} sending={t.sending} loading={t.loading} error={t.error}
          placeholder={`Reply to ${name || "recipient"}…`}
        />
      </div>
    </div>
  );
};

export const RepliesPanel = ({ message, onClose, onChanged }) => {
  const isMobile = useIsMobile();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [onlyUnanswered, setOnlyUnanswered] = useState(false);
  const [detail, setDetail] = useState(null);

  const loadThreads = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiRequest(`/comm/messages/${message.id}/threads`);
      setThreads(res?.data?.threads || []);
      setError("");
    } catch (e) { if (!silent) setError(e.message || "Could not load replies"); }
    finally { if (!silent) setLoading(false); }
  }, [message.id]);

  useEffect(() => { loadThreads(false); }, [loadThreads]);

  // desktop: pehli baar list aate hi sabse zaroori thread (unread / unanswered) khud khul jaye
  const autoPicked = useRef(false);
  useEffect(() => {
    if (autoPicked.current || isMobile || !threads.length) return;
    autoPicked.current = true;
    const first = threads.find((t) => t.unread) || threads.find((t) => t.unanswered) || threads[0];
    if (first) setActiveId(first.recipient_id);
  }, [threads, isMobile]);
  usePolling(() => loadThreads(true), 15000, true);

  useEffect(() => {
    apiRequest(`/comm/messages/${message.id}`).then((r) => setDetail(r?.data || null)).catch(() => {});
  }, [message.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") (activeId && isMobile ? setActiveId(null) : onClose?.()); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, isMobile, onClose]);

  const visible = useMemo(() => (onlyUnanswered ? threads.filter((t) => t.unanswered) : threads), [threads, onlyUnanswered]);
  const active = threads.find((t) => t.recipient_id === activeId);
  const cat = CATEGORY_META[message.category] || CATEGORY_META.general;
  const announcement = {
    id: message.id, title: message.title, body: detail?.body ?? message.body, created_at: message.created_at,
    created_by_name: message.created_by_name, attachments: detail?.attachments, label: cat.label,
  };
  const unansweredCount = threads.filter((t) => t.unanswered).length;

  const showList = !isMobile || !activeId;
  const showThread = !isMobile || !!activeId;
  const closeBtn = (
    <button className="btn btn-ghost" onClick={onClose} aria-label="Close"
      style={{ position: "absolute", top: isMobile ? 7 : 9, right: isMobile ? 8 : 10, zIndex: 10, width: 42, height: 42, padding: 0, justifyContent: "center", touchAction: "manipulation" }}>
      <Icon name="close" size={17} />
    </button>
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, padding: isMobile ? 0 : 20, alignItems: isMobile ? "stretch" : "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", display: "flex", background: C.surface, overflow: "hidden", width: "100%", maxWidth: isMobile ? "none" : 980,
          height: isMobile ? "100dvh" : "min(700px, 90vh)", borderRadius: isMobile ? 0 : 20, border: isMobile ? "none" : `1px solid ${C.border}`, boxShadow: isMobile ? "none" : "0 30px 80px rgba(0,0,0,.35)" }}>
        {showList && (
          <div style={{ width: isMobile ? "100%" : 330, flexShrink: 0, borderRight: isMobile ? "none" : `1px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
            <div style={{ padding: isMobile ? "14px 56px 10px 14px" : "16px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
              <h3 className="syne" style={{ fontSize: 16, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Replies</h3>
              <div style={{ fontSize: 12, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{message.title}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {[["all", `All (${threads.length})`], ["un", `Unanswered (${unansweredCount})`]].map(([k, l]) => {
                  const on = (k === "un") === onlyUnanswered;
                  return (
                    <button key={k} onClick={() => setOnlyUnanswered(k === "un")}
                      style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation",
                        border: `1px solid ${on ? C.primary : C.border}`, background: on ? `${C.primary}1f` : "transparent", color: on ? C.primary : C.textMuted }}>{l}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {loading && <div style={{ textAlign: "center", padding: 30, color: C.textMuted, fontSize: 13 }}>Loading…</div>}
              {!loading && error && <div style={{ textAlign: "center", padding: 24, color: C.red, fontSize: 13 }}>{error}</div>}
              {!loading && !error && visible.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
                  {onlyUnanswered ? "Everyone who replied has been answered." : message.allow_replies ? "No replies yet." : "Replies were not enabled for this announcement."}
                </div>
              )}
              {visible.map((t) => (
                <button key={t.recipient_id} onClick={() => setActiveId(t.recipient_id)}
                  style={{ width: "100%", textAlign: "left", display: "flex", gap: 11, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", color: C.text, border: "none",
                    borderBottom: `1px solid ${C.border}`, background: t.recipient_id === activeId ? `${C.primary}14` : "transparent", touchAction: "manipulation" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: `${C.primary}22`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                    {(t.name || "?").trim()[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: t.unread ? 800 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                      <span style={{ fontSize: 11, color: t.unread ? C.primary : C.textMuted, flexShrink: 0 }}>{shortTime(t.last_recipient_reply_at)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.last_reply_side === "admin" ? "You: " : ""}{t.last_reply_preview}
                      </div>
                      {t.unread ? <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.primary, flexShrink: 0 }} /> : null}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 3, textTransform: "capitalize" }}>{t.recipient_type}{t.unanswered ? " · awaiting your reply" : ""}</div>
                  </div>
                </button>
              ))}
            </div>
            {isMobile && closeBtn}
          </div>
        )}
        {showThread && (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
            {activeId ? (
              <AdminThread key={activeId} messageId={message.id} recipientId={activeId} name={active?.name} announcement={announcement}
                isMobile={isMobile} onBack={() => setActiveId(null)}
                onChanged={() => { loadThreads(true); onChanged?.(); }} />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 8, padding: 24, textAlign: "center" }}>
                <Icon name="message" size={34} />
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Select a reply</div>
                <div style={{ fontSize: 12.5 }}>Open a reply to read it and respond.</div>
              </div>
            )}
            {closeBtn}
          </div>
        )}
      </div>
    </div>
  );
};
