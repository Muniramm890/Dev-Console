// FILE: teacher-app/src/modules/commhub/MessageHistoryTab.tsx
// Source: admin App.tsx -> MessageHistoryTab [10440-10560]
// [teacher-app] Redesigned UI: summary KPIs, search/filter, message cards with delivery bar, nicer detail + viewers modals.
// API calls (/comm/messages, /comm/messages/:id, /comm/messages/:id/viewers) are unchanged.
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { Icon } from "../../components/ui/Icon";
import { DocLink } from "../../components/ui/DocLink";
import { KpiCard } from "../../components/ui/KpiCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { LogoLoader } from "../../components/ui/LogoLoader";
import { CATEGORY_META, CHANNEL_META, fmtDate, fmtSize, fmtTime } from "./helpers";
import { RepliesPanel } from "./RepliesPanel";
import { C } from "../../theme/theme";

const STATUS_BADGE = { sent: "badge-green", partial: "badge-yellow", failed: "badge-red" };

export const MessageHistoryTab = ({ onCompose }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [viewers, setViewers] = useState(null);
  const [repliesFor, setRepliesFor] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  // silent=true: background refresh (no full-screen loader) — otherwise the Replies panel gets unmounted mid-chat
  const load = async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiRequest("/comm/messages?limit=30");
      setMessages(Array.isArray(res?.data) ? res.data : []);
    } catch (e) { console.error(e.message); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id) => {
    try {
      const res = await apiRequest(`/comm/messages/${id}`);
      setDetail(res?.data || null);
    } catch (e) { console.error(e.message); }
  };

  const openViewers = async (id) => {
    try {
      const res = await apiRequest(`/comm/messages/${id}/viewers`);
      setViewers(res?.data || null);
    } catch (e) { console.error(e.message); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) =>
      (catFilter === "all" || m.category === catFilter) && (!q || (m.title || "").toLowerCase().includes(q))
    );
  }, [messages, search, catFilter]);

  const totals = useMemo(() => {
    const recipients = messages.reduce((a, m) => a + (m.recipient_count || 0), 0);
    const sent = messages.reduce((a, m) => a + (m.sent_count || 0), 0);
    const failed = messages.reduce((a, m) => a + (m.failed_count || 0), 0);
    return { recipients, sent, failed, rate: recipients ? Math.round((sent / recipients) * 100) : 0 };
  }, [messages]);

  if (loading) return <LogoLoader size={44} label="Loading announcements…" />;

  if (messages.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon="megaphone"
          title="No announcements yet"
          sub="Announcements you send will appear here, with delivery status and who has seen them."
          action={onCompose && <button className="btn btn-primary" onClick={onCompose}>Compose announcement</button>}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Summary (from the latest 30 announcements) */}
      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Announcements" value={messages.length} sub="Latest 30" icon="megaphone" color={C.primary} />
        <KpiCard label="Recipients" value={totals.recipients.toLocaleString("en-IN")} sub="Total reached" icon="users" color={C.blue} />
        <KpiCard label="Delivered" value={`${totals.rate}%`} sub={`${totals.sent.toLocaleString("en-IN")} delivered`} icon="check" color={C.green} />
        <KpiCard label="Failed" value={totals.failed.toLocaleString("en-IN")} sub="Deliveries failed" icon="alert" color={totals.failed > 0 ? C.red : C.textMuted} />
      </div>

      {/* Search + category filter */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted, display: "flex" }}>
            <Icon name="search" size={15} />
          </span>
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search announcements..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 180 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">All categories</option>
          {Object.entries(CATEGORY_META).map(([k, m]) => (<option key={k} value={k}>{m.label}</option>))}
        </select>
      </div>

      {/* Message cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((m) => {
          const cat = CATEGORY_META[m.category] || CATEGORY_META.general;
          const col = C[cat.color];
          const total = m.recipient_count || 0;
          const sentPct = total ? Math.min(100, Math.round(((m.sent_count || 0) / total) * 100)) : 0;
          const failPct = total ? Math.min(100 - sentPct, Math.round(((m.failed_count || 0) / total) * 100)) : 0;
          return (
            <div key={m.id} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${col}22`, color: col, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={cat.icon} size={20} />
              </div>

              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6, fontSize: 12, color: C.textMuted }}>
                  <span style={{ color: col, background: `${col}22`, padding: "2px 9px", borderRadius: 100, fontWeight: 700, fontSize: 11.5 }}>{cat.label}</span>
                  <span>{fmtDate(m.created_at)} · {fmtTime(m.created_at)}</span>
                  {m.attachment_count > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="paperclip" size={12} /> {m.attachment_count}</span>
                  )}
                </div>
              </div>

              <div style={{ flex: "0 0 220px", maxWidth: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: C.textMuted }}>{m.sent_count} of {total} delivered</span>
                  <span style={{ fontWeight: 700 }}>{sentPct}%</span>
                </div>
                <div style={{ display: "flex", height: 6, borderRadius: 3, background: C.surfaceAlt, overflow: "hidden" }}>
                  <div style={{ width: `${sentPct}%`, background: C.green }} />
                  <div style={{ width: `${failPct}%`, background: C.red }} />
                </div>
                {m.failed_count > 0 && <div style={{ fontSize: 11.5, color: C.red, marginTop: 5 }}>{m.failed_count} failed</div>}
              </div>

              <span className={`badge ${STATUS_BADGE[m.status] || "badge-blue"}`} style={{ textTransform: "capitalize", minWidth: 68, textAlign: "center", justifyContent: "center" }}>{m.status}</span>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => openDetail(m.id)}>View</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }} onClick={() => openViewers(m.id)}>
                  <Icon name="eye" size={13} /> {m.seen_count ?? 0}/{total} seen
                </button>
                {(m.allow_replies || m.reply_count > 0) && (
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5, position: "relative" }} onClick={() => setRepliesFor(m)}>
                    <Icon name="message" size={13} /> Replies{m.reply_count > 0 ? ` (${m.reply_count})` : ""}
                    {m.unread_replies > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 100, background: C.red, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{m.unread_replies}</span>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card"><EmptyState icon="search" title="No matching announcements" sub="Try a different search or category." /></div>
        )}
      </div>

      {repliesFor && <RepliesPanel message={repliesFor} onClose={() => setRepliesFor(null)} onChanged={() => load(true)} />}

      {/* Detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title || ""} width={560}>
        {detail && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12, fontSize: 12.5, color: C.textMuted }}>
              {(() => {
                const c = CATEGORY_META[detail.category] || CATEGORY_META.general;
                const col = C[c.color];
                return <span style={{ color: col, background: `${col}22`, padding: "2px 10px", borderRadius: 100, fontWeight: 700 }}>{c.label}</span>;
              })()}
              {detail.created_at && <span>{fmtDate(detail.created_at)} · {fmtTime(detail.created_at)}</span>}
            </div>

            <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 16 }}>
              {detail.body}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>Channels</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {(detail.channels || []).map((ch) => (
                <span key={ch} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 100, background: C.surfaceAlt, border: `1px solid ${C.border}`, fontSize: 12.5, fontWeight: 600 }}>
                  <Icon name={CHANNEL_META[ch]?.icon || "bell"} size={13} /> {CHANNEL_META[ch]?.label || ch}
                </span>
              ))}
              {(!detail.channels || detail.channels.length === 0) && <span style={{ color: C.textMuted, fontSize: 12.5 }}>—</span>}
            </div>

            {detail.attachments?.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>Attachments</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {detail.attachments.map((a) => (
                    <DocLink key={a.id} doc={{ url: a.file_url, name: a.file_name }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, textDecoration: "none", color: C.text }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.blue}22`, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="file" size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.file_name}</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted }}>{a.file_type} · {fmtSize(a.file_size_bytes)}</div>
                      </div>
                      <Icon name="download" size={14} />
                    </DocLink>
                  ))}
                </div>
              </>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>Delivery</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {detail.delivery_stats?.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surfaceAlt, borderRadius: 10, fontSize: 13 }}>
                  <Icon name={CHANNEL_META[d.channel]?.icon || "bell"} size={14} />
                  <span style={{ flex: 1, textTransform: "capitalize" }}>{CHANNEL_META[d.channel]?.label || d.channel}</span>
                  <span className={`badge ${STATUS_BADGE[d.status] || "badge-blue"}`} style={{ textTransform: "capitalize" }}>{d.status}</span>
                  <strong style={{ minWidth: 28, textAlign: "right" }}>{d.cnt}</strong>
                </div>
              ))}
              {(!detail.delivery_stats || detail.delivery_stats.length === 0) && (
                <div style={{ textAlign: "center", padding: 16, color: C.textMuted, fontSize: 13 }}>No delivery data</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Viewers */}
      <Modal open={!!viewers} onClose={() => setViewers(null)} title="Viewers" width={440}>
        {viewers && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.textMuted, marginBottom: 6 }}>
              <span>{viewers.seen} / {viewers.total} seen</span>
              <strong style={{ color: C.text }}>{viewers.total ? Math.round((viewers.seen / viewers.total) * 100) : 0}%</strong>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: C.surfaceAlt, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ width: `${viewers.total ? Math.round((viewers.seen / viewers.total) * 100) : 0}%`, height: "100%", background: C.green }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 350, overflowY: "auto" }}>
              {viewers.viewers.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${C.primary}22`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                    {(v.name || "?").trim()[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                    <div style={{ color: C.textMuted, fontSize: 11.5 }}>
                      <span style={{ textTransform: "capitalize" }}>{v.recipient_type}</span>
                      {v.is_read && v.seen_at ? ` · ${new Date(v.seen_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                      {v.reply_count > 0 ? ` · ${v.reply_count} repl${v.reply_count > 1 ? "ies" : "y"}` : ""}
                    </div>
                  </div>
                  <span className={`badge ${v.is_read ? "badge-green" : "badge-yellow"}`}>{v.is_read ? "✓✓ Seen" : "Not seen"}</span>
                </div>
              ))}
              {viewers.viewers.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: C.textMuted }}>No in-app recipients</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
