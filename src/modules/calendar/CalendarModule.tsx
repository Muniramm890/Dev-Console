// @ts-nocheck
// Calendar: holidays & events (admin adds) + leave applications (everyone applies, admin approves). Mobile first, global components.
import { useEffect, useMemo, useState } from "react";
import { useLocation as useLoc } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { useDialog } from "../../contexts/DialogContext";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PillTabs } from "../../components/ui/PillTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Icon } from "../../components/ui/Icon";
import { DateField } from "../exams/DateField";
import { C } from "../../theme/theme";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => { const d = new Date(); return ymd(d.getFullYear(), d.getMonth(), d.getDate()); };
const parts = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number); return { y, m: m - 1, d }; };
const fmt = (iso) => { const p = parts(iso); return `${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}`; };
const fmtRange = (a, b) => (a === b ? fmt(a) : `${fmt(a)} - ${fmt(b)}`);
const addDay = (iso, n) => { const p = parts(iso); const d = new Date(Date.UTC(p.y, p.m, p.d + n)); return ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const span = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5) + 1;
const KIND = { holiday: { label: "Holiday", color: C.red }, event: { label: "Event", color: C.blue } };
const STATUS = { pending: { label: "Pending", color: C.yellow }, approved: { label: "Approved", color: C.green }, rejected: { label: "Rejected", color: C.red }, cancelled: { label: "Cancelled", color: C.textMuted } };
const lab = { display: "block", fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 600, letterSpacing: 0.3 };

const CSS = `.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.cal-cell{position:relative;min-height:clamp(54px,9vw,88px);padding:6px;border-radius:12px;border:1px solid ${C.border};cursor:pointer;overflow:hidden;text-align:left;background:transparent;color:inherit}
.cal-cell .cal-title{display:block;font-size:10.5px;margin-top:3px;padding:1px 5px;border-radius:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:640px){.cal-cell{padding:4px;border-radius:9px}.cal-cell .cal-title{display:none}}`;

const Chip = ({ color, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}40` }}>{children}</span>
);
const Round = ({ onClick, children, label }) => (
  <button className="btn btn-ghost" aria-label={label} onClick={onClick} style={{ width: 34, height: 34, padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1 }}>{children}</button>
);

export const CalendarModule = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin";
  const { dialogAlert, dialogConfirm } = useDialog();
  const qs = new URLSearchParams(useLoc().search);
  const first = qs.get("tab");
  const [tab, setTab] = useState(["calendar", "upcoming", "my"].includes(first) || (first === "leaves" && isAdmin) ? first : "calendar");
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(todayIso());
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [evForm, setEvForm] = useState(null);
  const [lvStatus, setLvStatus] = useState("pending");
  const [lvType, setLvType] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [review, setReview] = useState(null);
  const [mine, setMine] = useState([]);
  const [apply, setApply] = useState(null);
  const [busy, setBusy] = useState(false);

  const gridStart = useMemo(() => { const f = new Date(cur.y, cur.m, 1); return addDay(ymd(cur.y, cur.m, 1), -f.getDay()); }, [cur]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDay(gridStart, i)), [gridStart]);
  const byDay = useMemo(() => {
    const m = {};
    events.forEach((e) => { for (let d = e.start_date; d <= e.end_date && span(e.start_date, d) <= 400; d = addDay(d, 1)) (m[d] = m[d] || []).push(e); });
    return m;
  }, [events]);

  const loadEvents = async () => {
    try { const r = await apiRequest(`/calendar/events?from=${days[0]}&to=${days[41]}`); setEvents(Array.isArray(r?.data) ? r.data : []); } catch { setEvents([]); }
  };
  const loadUpcoming = async () => { try { const r = await apiRequest("/calendar/upcoming?limit=40"); setUpcoming(Array.isArray(r?.data) ? r.data : []); } catch { setUpcoming([]); } };
  const loadLeaves = async () => {
    if (!isAdmin) return;
    try {
      const r = await apiRequest(`/calendar/leaves?${lvStatus ? `status=${lvStatus}&` : ""}${lvType ? `type=${lvType}` : ""}`);
      setLeaves(Array.isArray(r?.data) ? r.data : []); setPendingCount(r?.pending_count || 0);
    } catch { setLeaves([]); }
  };
  const loadMine = async () => { try { const r = await apiRequest("/calendar/leaves/my"); setMine(Array.isArray(r?.data) ? r.data : []); } catch { setMine([]); } };

  useEffect(() => { loadEvents(); }, [cur]); // eslint-disable-line
  useEffect(() => { loadUpcoming(); loadMine(); if (isAdmin) loadLeaves(); }, []); // eslint-disable-line
  useEffect(() => { loadLeaves(); }, [lvStatus, lvType]); // eslint-disable-line

  const saveEvent = async () => {
    const f = evForm;
    if (!f.title.trim()) return dialogAlert("Please enter a title.", "Calendar");
    if (!f.start_date) return dialogAlert("Please select a start date.", "Calendar");
    setBusy(true);
    try {
      const body = { title: f.title, kind: f.kind, start_date: f.start_date, end_date: f.end_date || f.start_date, details: f.details };
      await apiRequest(f.id ? `/calendar/events/${f.id}` : "/calendar/events", f.id ? "PUT" : "POST", body);
      setEvForm(null); await Promise.all([loadEvents(), loadUpcoming()]);
    } catch (e) { await dialogAlert(e?.message || "Could not save the event.", "Calendar"); } finally { setBusy(false); }
  };
  const deleteEvent = async (f) => {
    if (!(await dialogConfirm(`Delete "${f.title}"?`, "Delete Event"))) return;
    try { await apiRequest(`/calendar/events/${f.id}`, "DELETE"); setEvForm(null); await Promise.all([loadEvents(), loadUpcoming()]); }
    catch (e) { await dialogAlert(e?.message || "Could not delete the event.", "Calendar"); }
  };
  const doReview = async (status) => {
    setBusy(true);
    try {
      const r = await apiRequest(`/calendar/leaves/${review.id}/review`, "PUT", { status, note: review.note || "" });
      const n = r?.data?.days_marked || 0;
      setReview(null);
      await dialogAlert(status === "approved" ? `Leave approved.${n ? ` Attendance marked as Leave for ${n} day${n === 1 ? "" : "s"}.` : ""}` : "Leave rejected.", "Leave Request");
      loadLeaves();
    } catch (e) { await dialogAlert(e?.message || "Could not update the request.", "Leave Request"); } finally { setBusy(false); }
  };
  const doApply = async () => {
    const f = apply;
    if (!f.from_date) return dialogAlert("Please select the leave dates.", "Apply for Leave");
    setBusy(true);
    try {
      await apiRequest("/calendar/leaves/my", "POST", { from_date: f.from_date, to_date: f.to_date || f.from_date, reason: f.reason });
      setApply(null); await dialogAlert("Your leave request has been submitted for approval.", "Apply for Leave"); loadMine();
    } catch (e) { await dialogAlert(e?.message || "Could not submit the request.", "Apply for Leave"); } finally { setBusy(false); }
  };
  const cancelMine = async (l) => {
    if (!(await dialogConfirm("Cancel this leave request?", "Cancel Request"))) return;
    try { await apiRequest(`/calendar/leaves/my/${l.id}`, "DELETE"); loadMine(); } catch (e) { await dialogAlert(e?.message || "Could not cancel.", "Cancel Request"); }
  };
  const newEvent = (date) => setEvForm({ title: "", kind: "holiday", start_date: date || todayIso(), end_date: date || todayIso(), details: "" });
  const move = (n) => setCur((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const tabs = [
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "upcoming", label: "Upcoming", icon: "clock" },
    ...(isAdmin ? [{ id: "leaves", label: pendingCount ? `Leave Requests (${pendingCount})` : "Leave Requests", icon: "check" }] : []),
    { id: "my", label: "My Leaves", icon: "user" },
  ];

  const EventRow = ({ e }) => {
    const k = KIND[e.kind] || KIND.event;
    const p = parts(e.start_date);
    return (
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", padding: 14, borderLeft: `4px solid ${k.color}` }}>
        <div style={{ minWidth: 52, textAlign: "center", borderRadius: 12, padding: "6px 0", background: `${k.color}14` }}>
          <div className="syne" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{p.d}</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: k.color, textTransform: "uppercase" }}>{MONTHS[p.m].slice(0, 3)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{fmtRange(e.start_date, e.end_date)}{e.start_date !== e.end_date ? ` · ${span(e.start_date, e.end_date)} days` : ""}</div>
          {e.details && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{e.details}</div>}
        </div>
        <Chip color={k.color}>{k.label}</Chip>
        {isAdmin && <Round label="Edit" onClick={() => setEvForm({ ...e })}><Icon name="edit" size={14} /></Round>}
      </div>
    );
  };

  const LeaveRow = ({ l, admin }) => {
    const s = STATUS[l.status] || STATUS.pending;
    const n = span(l.from_date, l.to_date);
    return (
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            {admin && (
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {l.applicant_name || "Unknown"}
                <span style={{ fontWeight: 500, fontSize: 12, color: C.textMuted }}> · {l.applicant_type === "student" ? `${l.class_name || ""}${l.section_name ? `-${l.section_name}` : ""}` || "Student" : "Staff"}</span>
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: admin ? 2 : 0 }}>{fmtRange(l.from_date, l.to_date)} <span style={{ color: C.textMuted, fontWeight: 500 }}>· {n} day{n === 1 ? "" : "s"}</span></div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>{l.reason}</div>
            {l.review_note && <div style={{ fontSize: 12, marginTop: 4 }}>Note: {l.review_note}</div>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <Chip color={s.color}>{s.label}</Chip>
            {admin && l.status === "pending" && <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => setReview({ ...l, note: "" })}>Review</button>}
            {!admin && l.status === "pending" && <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => cancelMine(l)}>Cancel</button>}
          </div>
        </div>
      </div>
    );
  };

  const selEvents = byDay[sel] || [];
  const grouped = upcoming.reduce((a, e) => { const k = `${parts(e.start_date).y}-${parts(e.start_date).m}`; (a[k] = a[k] || []).push(e); return a; }, {});
  const today = todayIso();

  return (
    <div className="slide-in">
      <style>{CSS}</style>
      <SectionHeader title="Calendar" sub="Holidays, events and leave applications"
        action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setApply({ from_date: todayIso(), to_date: todayIso(), reason: "" })}>Apply for Leave</button>
          {isAdmin && <button className="btn btn-primary" onClick={() => newEvent(sel)}><Icon name="plus" size={14} /> Add Event</button>}
        </div>} />
      <div style={{ marginBottom: 18, overflowX: "auto" }}><PillTabs tabs={tabs} active={tab} onChange={setTab} /></div>

      {tab === "calendar" && (
        <div style={{ display: "grid", gap: 18 }}>
          <div className="card" style={{ background: `linear-gradient(135deg, ${C.primary}10, transparent 55%)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <Round label="Previous month" onClick={() => move(-1)}>&lsaquo;</Round>
              <h3 className="syne" style={{ fontSize: 19, fontWeight: 800, minWidth: 150, textAlign: "center" }}>{MONTHS[cur.m]} {cur.y}</h3>
              <Round label="Next month" onClick={() => move(1)}>&rsaquo;</Round>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setCur({ y: now.getFullYear(), m: now.getMonth() }); setSel(today); }}>Today</button>
              <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 12, color: C.textMuted }}>
                {Object.values(KIND).map((k) => (<span key={k.label} style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: k.color }} />{k.label}</span>))}
              </div>
            </div>
            <div className="cal-grid" style={{ marginBottom: 6 }}>
              {DOW.map((d, i) => (<div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: i === 0 ? C.red : C.textMuted }}>{d}</div>))}
            </div>
            <div className="cal-grid">
              {days.map((d) => {
                const p = parts(d), inMonth = p.m === cur.m, ev = byDay[d] || [], hol = ev.find((e) => e.kind === "holiday");
                const isSel = d === sel, isToday = d === today, sun = new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay() === 0;
                return (
                  <button key={d} className="cal-cell" onClick={() => setSel(d)}
                    style={{ opacity: inMonth ? 1 : 0.4, background: hol ? `${C.red}12` : sun ? `${C.red}06` : "transparent", borderColor: isSel ? C.primary : C.border, boxShadow: isSel ? `0 0 0 2px ${C.primary}40` : "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, borderRadius: 11, fontSize: 12, fontWeight: 700, color: isToday ? "#fff" : sun || hol ? C.red : C.text, background: isToday ? C.primary : "transparent" }}>{p.d}</span>
                    {ev.slice(0, 2).map((e) => (<span key={e.id} className="cal-title" style={{ background: `${(KIND[e.kind] || KIND.event).color}22`, color: (KIND[e.kind] || KIND.event).color, fontWeight: 600 }}>{e.title}</span>))}
                    {ev.length > 0 && (
                      <span style={{ position: "absolute", left: 6, bottom: 5, display: "flex", gap: 3 }}>
                        {ev.slice(0, 3).map((e) => (<span key={e.id} style={{ width: 5, height: 5, borderRadius: "50%", background: (KIND[e.kind] || KIND.event).color }} />))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{fmt(sel)}</h4>
            {selEvents.length === 0 ? (
              <EmptyState icon="calendar" title="No holidays or events" sub={isAdmin ? "Tap Add Event to schedule one for this day." : "Nothing is scheduled for this day."} />
            ) : (<div style={{ display: "grid", gap: 10 }}>{selEvents.map((e) => (<EventRow key={e.id} e={e} />))}</div>)}
          </div>
        </div>
      )}

      {tab === "upcoming" && (
        upcoming.length === 0 ? <EmptyState icon="calendar" title="No upcoming holidays or events" sub={isAdmin ? "Add the first one with the Add Event button." : "The school has not scheduled anything yet."} /> : (
          <div style={{ display: "grid", gap: 18 }}>
            {Object.keys(grouped).map((k) => {
              const [y, m] = k.split("-").map(Number);
              return (
                <div key={k}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>{MONTHS[m]} {y}</div>
                  <div style={{ display: "grid", gap: 10 }}>{grouped[k].map((e) => (<EventRow key={e.id} e={e} />))}</div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "leaves" && isAdmin && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div className="scroll-x">
              <PillTabs tabs={[{ id: "pending", label: "Pending" }, { id: "approved", label: "Approved" }, { id: "rejected", label: "Rejected" }, { id: "", label: "All" }]} active={lvStatus} onChange={setLvStatus} />
            </div>
            <select className="select" style={{ width: "auto", fontSize: 12.5 }} value={lvType} onChange={(e) => setLvType(e.target.value)} aria-label="Applicant type">
              <option value="">Students &amp; Staff</option><option value="student">Students</option><option value="staff">Staff</option>
            </select>
          </div>
          {leaves.length === 0 ? <EmptyState icon="check" title="No leave requests" sub="Nothing here for the selected filters." /> : leaves.map((l) => (<LeaveRow key={l.id} l={l} admin />))}
        </div>
      )}

      {tab === "my" && (
        <div style={{ display: "grid", gap: 12 }}>
          {mine.length === 0 ? <EmptyState icon="user" title="No leave requests yet" sub="Use Apply for Leave to send a request for approval." /> : mine.map((l) => (<LeaveRow key={l.id} l={l} />))}
        </div>
      )}

      <Modal open={!!evForm} onClose={() => setEvForm(null)} title={evForm?.id ? "Edit Event" : "Add Event"} width={480}>
        {evForm && (
          <div style={{ display: "grid", gap: 14 }}>
            <div><label style={lab}>TITLE</label><input className="input" value={evForm.title} placeholder="e.g. Diwali Break" onChange={(e) => setEvForm({ ...evForm, title: e.target.value })} /></div>
            <div>
              <label style={lab}>TYPE</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(KIND).map(([id, k]) => (
                  <button key={id} className={evForm.kind === id ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setEvForm({ ...evForm, kind: id })}>{k.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              <div><label style={lab}>START DATE</label><DateField width="100%" value={evForm.start_date} onChange={(v) => setEvForm({ ...evForm, start_date: v, end_date: !evForm.end_date || evForm.end_date < v ? v : evForm.end_date })} /></div>
              <div><label style={lab}>END DATE</label><DateField width="100%" value={evForm.end_date} onChange={(v) => setEvForm({ ...evForm, end_date: v })} /></div>
            </div>
            <div><label style={lab}>DETAILS (OPTIONAL)</label><textarea className="input" rows={3} value={evForm.details} onChange={(e) => setEvForm({ ...evForm, details: e.target.value })} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              {evForm.id ? <button className="btn btn-danger" onClick={() => deleteEvent(evForm)}>Delete</button> : <span />}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setEvForm(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEvent} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!review} onClose={() => setReview(null)} title="Review Leave Request" width={480}>
        {review && (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{review.applicant_name}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{fmtRange(review.from_date, review.to_date)} · {span(review.from_date, review.to_date)} day(s)</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6 }}>{review.reason}</div>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>Approving marks attendance as Leave for every working day (Sundays and holidays are skipped).</div>
            <div><label style={lab}>NOTE (OPTIONAL)</label><textarea className="input" rows={2} value={review.note} onChange={(e) => setReview({ ...review, note: e.target.value })} /></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-danger" onClick={() => doReview("rejected")} disabled={busy}>Reject</button>
              <button className="btn btn-primary" onClick={() => doReview("approved")} disabled={busy}>{busy ? "Saving…" : "Approve"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!apply} onClose={() => setApply(null)} title="Apply for Leave" width={480}>
        {apply && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
              <div><label style={lab}>FROM</label><DateField width="100%" value={apply.from_date} onChange={(v) => setApply({ ...apply, from_date: v, to_date: !apply.to_date || apply.to_date < v ? v : apply.to_date })} /></div>
              <div><label style={lab}>TO</label><DateField width="100%" value={apply.to_date} onChange={(v) => setApply({ ...apply, to_date: v })} /></div>
            </div>
            <div><label style={lab}>REASON</label><textarea className="input" rows={3} value={apply.reason} placeholder="Reason for leave" onChange={(e) => setApply({ ...apply, reason: e.target.value })} /></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setApply(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doApply} disabled={busy}>{busy ? "Submitting…" : "Submit Request"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
