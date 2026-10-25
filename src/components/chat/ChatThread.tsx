// @ts-nocheck
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { DocLink } from "../ui/DocLink";
import { C } from "../../theme/theme";
import { useIsMobile } from "../../hooks/useIsMobile";
import { fmtSize, prepareFile } from "../../utils/chatMedia";

const fmtClock = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const dayKey = (d) => new Date(d).toDateString();
const dayLabel = (d) => {
  const x = new Date(d), t = new Date(), y = new Date(Date.now() - 86400000);
  if (x.toDateString() === t.toDateString()) return "Today";
  if (x.toDateString() === y.toDateString()) return "Yesterday";
  return x.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// ✓ sent   ✓✓ delivered   ✓✓(blue) read
const Ticks = ({ m }) => {
  const read = !!m.read_at, delivered = !!m.delivered_at || read;
  const col = read ? "#34B7F1" : "currentColor";
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="none" stroke={col} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: read ? 1 : 0.75, flexShrink: 0 }} aria-label={read ? "Seen" : delivered ? "Delivered" : "Sent"}>
      <path d="M1.5 5.8l3 3L10 2.3" />
      {delivered && <path d="M6.5 8.4l.5.5L12.5 2.3" />}
    </svg>
  );
};

const Media = ({ m, onOpen }) => {
  const src = m.media_url || m.local_url;
  if (m.kind === "image") {
    const ratio = m.media_w && m.media_h ? m.media_w / m.media_h : 4 / 3;
    return (
      <div onClick={() => src && onOpen(src)} style={{ cursor: "zoom-in", width: 240, maxWidth: "100%", aspectRatio: String(Math.min(Math.max(ratio, 0.6), 1.8)), background: C.surface, borderRadius: 12, overflow: "hidden" }}>
        {src && <img src={src} alt={m.media_name || "photo"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
    );
  }
  if (m.kind === "video") {
    return (
      <video src={src} controls playsInline preload="metadata" style={{ width: 260, maxWidth: "100%", borderRadius: 12, background: "#000", display: "block" }} />
    );
  }
  return (
    <DocLink doc={{ url: src, name: m.media_name }}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(0,0,0,.12)", borderRadius: 12, textDecoration: "none", color: "inherit", minWidth: 190 }}>
      {({ busy, pct, done }) => (<>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="file" size={18} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{m.media_name || "Document"}</div>
        <div style={{ fontSize: 11, opacity: 0.75 }}>{fmtSize(m.media_size)}</div>
      </div>
      {busy
        ? <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 30, textAlign: "right" }}>{pct > 0 && pct < 100 ? `${pct}%` : "…"}</span>
        : <Icon name={done ? "check" : "download"} size={15} />}
      </>)}
    </DocLink>
  );
};

// Announcement (admin ka original message) ek card ki tarah, uske neeche private reply bubbles.
//  ownSide: kis side ke bubbles "mine" (right, primary colour) dikhte hain
export const ChatThread = ({
  announcement, messages, ownSide, canReply, closedNote, onSend, onRetry,
  sending, loading, error, privacyNote, placeholder = "Write a reply…", emptyHint, allowMedia = true, isStudent = false,
}) => {
  const isMobile = useIsMobile();
  const scroller = useRef(null);
  const stick = useRef(true);
  const [text, setText] = useState("");
  const ta = useRef(null);
  const photoInput = useRef(null);
  const docInput = useRef(null);
  const [menu, setMenu] = useState(false);
  const [pending, setPending] = useState(null);   // prepared file waiting for caption + send
  const [pickError, setPickError] = useState("");
  const [viewer, setViewer] = useState(null);
  const [infoKey, setInfoKey] = useState(null);   // tap on my bubble -> sent / delivered / seen times

  const onScroll = () => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading, pending]);
  useEffect(() => { stick.current = true; }, [announcement?.id]);

  const grow = () => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };
  useEffect(grow, [text]);
  useEffect(() => () => { if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl); }, []); // eslint-disable-line

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    setMenu(false);
    if (!f) return;
    setPickError("");
    try { setPending(await prepareFile(f, { isStudent })); }
    catch (err) { setPickError(err.message || "Could not use this file"); }
  };

  const submit = async () => {
    const t = text.trim();
    if (!t && !pending) return;
    const p = pending;
    setText(""); setPending(null); setPickError("");
    stick.current = true;
    await onSend(t, p);
  };
  const onKey = (e) => {
    // desktop: Enter = send, Shift+Enter = new line.  mobile: Enter = new line
    if (e.key === "Enter" && !e.shiftKey && !isMobile) { e.preventDefault(); submit(); }
  };

  let lastDay = null;
  const lastMineIdx = (() => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].sender_side === ownSide) return i; return -1; })();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div ref={scroller} onScroll={onScroll} onClick={() => setMenu(false)} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
        {announcement && (
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.primary}`, borderRadius: 14, padding: 14, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: C.textMuted, marginBottom: 6, flexWrap: "wrap" }}>
              <Icon name="megaphone" size={13} />
              <span style={{ fontWeight: 700, color: C.primary }}>{announcement.label || "Announcement"}</span>
              {announcement.created_by_name && <span>· {announcement.created_by_name}</span>}
              {announcement.created_at && <span>· {dayLabel(announcement.created_at)}, {fmtClock(announcement.created_at)}</span>}
            </div>
            <div className="syne" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, wordBreak: "break-word" }}>{announcement.title}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{announcement.body}</div>
            {announcement.attachments?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {announcement.attachments.map((a) =>
                  a.file_type === "image" ? (
                    <img key={a.id} src={a.file_url} alt={a.file_name} onClick={() => setViewer(a.file_url)} style={{ maxWidth: "100%", borderRadius: 10, display: "block", cursor: "zoom-in" }} />
                  ) : (
                    <DocLink key={a.id} doc={{ url: a.file_url, name: a.file_name }}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, textDecoration: "none", color: C.text, fontSize: 13 }}>
                      {({ busy, pct, done }) => (<>
                        <Icon name="file" size={14} /> <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.file_name}</span>
                        {busy ? <span style={{ fontSize: 11.5, fontWeight: 700 }}>{pct > 0 && pct < 100 ? `${pct}%` : "…"}</span> : <Icon name={done ? "check" : "download"} size={13} />}
                      </>)}
                    </DocLink>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {loading && <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12.5, padding: 12 }}>Loading…</div>}
        {error && !loading && <div style={{ textAlign: "center", color: C.red, fontSize: 12.5, padding: 8 }}>{error}</div>}

        {!loading && messages.length === 0 && emptyHint && (
          <div style={{ textAlign: "center", color: C.textMuted, fontSize: 12.5, padding: "18px 12px", lineHeight: 1.5 }}>{emptyHint}</div>
        )}

        {messages.map((m, idx) => {
          const mine = m.sender_side === ownSide;
          const mk = m.id || m.key;
          const dk = dayKey(m.created_at);
          const showDay = dk !== lastDay;
          lastDay = dk;
          const isMedia = m.kind === "image" || m.kind === "video" || m.kind === "file";
          const photoOnly = isMedia && !m.body && (m.kind === "image" || m.kind === "video");
          const showInfo = mine && m.id && infoKey === mk;
          const lastRead = mine && idx === lastMineIdx && m.read_at;
          return (
            <div key={mk}>
              {showDay && (
                <div style={{ textAlign: "center", margin: "8px 0" }}>
                  <span style={{ fontSize: 11, color: C.textMuted, background: C.surfaceAlt, padding: "3px 10px", borderRadius: 100 }}>{dayLabel(m.created_at)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", minWidth: 0 }}>
                  {!mine && m.sender_name && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2, marginLeft: 4 }}>{m.sender_name}</div>}
                  <div
                    onClick={() => mine && m.id && setInfoKey(showInfo ? null : mk)}
                    style={{
                      padding: photoOnly ? 4 : "9px 13px", borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4,
                      background: mine ? C.primary : C.surfaceAlt, color: mine ? "#fff" : C.text,
                      border: mine ? "none" : `1px solid ${C.border}`, fontSize: 13.5, lineHeight: 1.5,
                      whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: m.status === "sending" ? 0.65 : 1, position: "relative",
                      cursor: mine && m.id ? "pointer" : "default",
                    }}
                  >
                    {isMedia && <div style={{ marginBottom: m.body ? 6 : 0 }}><Media m={m} onOpen={setViewer} /></div>}
                    {m.body}
                  </div>
                  <div style={{ fontSize: 10.5, color: m.status === "failed" ? C.red : C.textMuted, marginTop: 2, display: "flex", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "center", gap: 5, padding: "0 4px" }}>
                    {m.status === "failed" ? (
                      <span>Not sent · <button onClick={() => onRetry?.(m.key)} style={{ background: "none", border: "none", color: C.red, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }}>Retry</button></span>
                    ) : m.status === "sending" ? (m.kind && m.kind !== "text" ? "Uploading…" : "Sending…") : (
                      <>
                        <span>{fmtClock(m.created_at)}</span>
                        {mine && <span style={{ color: m.read_at ? "#34B7F1" : C.textMuted, display: "flex" }}><Ticks m={m} /></span>}
                        {lastRead && !showInfo && <span style={{ color: "#34B7F1" }}>Seen {fmtClock(m.read_at)}</span>}
                      </>
                    )}
                  </div>
                  {showInfo && (
                    <div style={{ fontSize: 11, color: C.textMuted, textAlign: "right", padding: "2px 4px", lineHeight: 1.6 }}>
                      Sent {fmtClock(m.created_at)}<br />
                      {m.delivered_at || m.read_at ? <>Delivered {fmtClock(m.delivered_at || m.read_at)}<br /></> : "Not delivered yet"}
                      {m.read_at && <span style={{ color: "#34B7F1" }}>Seen {fmtClock(m.read_at)}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canReply ? (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", background: C.surface, position: "relative" }}>
          {pickError && <div style={{ fontSize: 12, color: C.red, marginBottom: 6 }}>{pickError}</div>}

          {pending && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, marginBottom: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12 }}>
              {pending.kind === "image" ? (
                <img src={pending.previewUrl} alt="" style={{ width: 54, height: 54, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 54, height: 54, borderRadius: 8, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={pending.kind === "video" ? "eye" : "file"} size={20} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pending.file.name}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted }}>{pending.kind === "video" ? "Video" : pending.kind === "image" ? "Photo" : "Document"} · {fmtSize(pending.file.size)}{pending.duration ? ` · ${pending.duration}s` : ""} · add a caption below</div>
              </div>
              <button className="btn btn-ghost" onClick={() => { URL.revokeObjectURL(pending.previewUrl); setPending(null); }} aria-label="Remove" style={{ width: 34, height: 34, padding: 0, justifyContent: "center" }}><Icon name="close" size={15} /></button>
            </div>
          )}

          {privacyNote && !pending && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><Icon name="eye" size={11} /> {privacyNote}</div>}

          {menu && (
            <div style={{ position: "absolute", left: 12, bottom: "calc(100% - 4px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 10px 30px rgba(0,0,0,.3)", padding: 6, zIndex: 20, minWidth: 190 }}>
              <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: 10 }} onClick={() => photoInput.current?.click()}>🖼️ Photo / Video</button>
              <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "flex-start", gap: 10 }} onClick={() => docInput.current?.click()}>📄 Document</button>
            </div>
          )}
          <input ref={photoInput} type="file" accept="image/*,video/*" hidden onChange={pick} />
          <input ref={docInput} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" hidden onChange={pick} />

          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            {allowMedia && (
              <button className="btn btn-ghost" onClick={() => setMenu((v) => !v)} aria-label="Attach" title="Attach"
                style={{ width: 42, height: 42, padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, touchAction: "manipulation" }}>
                <Icon name="paperclip" size={18} />
              </button>
            )}
            <textarea
              ref={ta} rows={1} value={text} maxLength={2000} placeholder={pending ? "Add a caption…" : placeholder}
              onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
              style={{ flex: 1, resize: "none", padding: "10px 12px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontFamily: "inherit", fontSize: isMobile ? 16 : 13.5, lineHeight: 1.4, outline: "none", maxHeight: 120 }}
            />
            <button
              className="btn btn-primary" onClick={submit} disabled={(!text.trim() && !pending) || sending}
              title="Send" style={{ width: 42, height: 42, padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, touchAction: "manipulation" }}
            >
              <Icon name="send" size={17} />
            </button>
          </div>
        </div>
      ) : (
        closedNote && <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 14px", fontSize: 12.5, color: C.textMuted, textAlign: "center", background: C.surface }}>{closedNote}</div>
      )}

      {viewer && (
        <div data-native-back onClick={() => setViewer(null)}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <img src={viewer} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          <button className="btn btn-ghost" aria-label="Close" style={{ position: "absolute", top: 12, right: 12, width: 44, height: 44, padding: 0, justifyContent: "center", color: "#fff", background: "rgba(255,255,255,.12)" }}><Icon name="close" size={18} /></button>
          <DocLink doc={{ url: viewer, name: "photo.jpg", mime: "image/jpeg" }} stopPropagation
            style={{ position: "absolute", bottom: 16, right: 16, color: "#fff", background: "rgba(255,255,255,.14)", borderRadius: 100, padding: "10px 16px", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            {({ busy, pct }) => (<><Icon name="download" size={15} /> {busy ? (pct > 0 && pct < 100 ? `${pct}%` : "…") : "Save"}</>)}
          </DocLink>
        </div>
      )}
    </div>
  );
};
