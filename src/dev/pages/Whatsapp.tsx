// @ts-nocheck
// Console -> WhatsApp (Meta): usage overview, per-school numbers, message log.
// Webhook + billing are placeholders for later. Uses the existing /platform/whatsapp/* and /platform/schools/:id/whatsapp routes.
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { papi, ago, explain, toast } from "../api";
import { Modal, Field, useLoad } from "../ui";
import { C } from "../../theme/theme";

const PURPOSES = {
  OTP_SIGNUP: "Signup OTP", OTP_FORGOT: "Password reset OTP", OTP_STUDENT: "Student reset OTP",
  ATTENDANCE_ALERT: "Attendance alert", FEE_RECEIPT: "Fee receipt", COMMHUB: "Notification", TEST: "Test", OTHER: "Other",
};
const REASONS = { no_number: "No school number", not_verified: "Number not verified", own_failed: "Own number failed" };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pLabel = (p) => PURPOSES[p] || p;
const dayLabel = (d) => `${Number(String(d).slice(8, 10))} ${MON[Number(String(d).slice(5, 7)) - 1]}`;
const fmtNum = (n) => { const d = String(n || "").replace(/\D/g, ""); return !d ? "-" : d.length === 12 && d.startsWith("91") ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : `+${d}`; };
const qs = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null))).toString();
const STATUS_COL = { verified: C.green, pending: C.yellow, blocked: C.red, not_set: C.textMuted };

const StatusChip = ({ s }) => { const col = STATUS_COL[s] || C.textMuted; return <span className="dc-chip" style={{ background: `${col}22`, color: col }}>{String(s || "not_set").replace("_", " ")}</span>; };
const Soon = () => <span className="dc-chip" style={{ background: `${C.yellow}22`, color: C.yellow }}>upcoming</span>;
const EMPTY = { month: "", purpose: "", status: "", via: "", q: "" };

// ---------- school picker (search platform schools) ----------
const SchoolList = ({ onPick }) => {
  const [q, setQ] = useState("");
  const l = useLoad(() => papi(`/schools?q=${encodeURIComponent(q)}&limit=12`), [q]);
  return (
    <div>
      <input className="input" autoFocus placeholder="Search school" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ marginTop: 10, maxHeight: "50vh", overflow: "auto" }}>
        {(l.data?.items || []).filter((s) => !s.deleted_at).map((s) => (
          <div key={s.id} className="card" style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => onPick({ id: s.id, name: s.name })}>
            <b>{s.name}</b> <span style={{ fontSize: 12, color: C.textMuted }}>{s.city || ""}</span>
          </div>
        ))}
        {l.loading && <p style={{ color: C.textMuted }}>Loading...</p>}
      </div>
    </div>
  );
};

// ---------- filters ----------
const FilterBar = ({ f, setF, school, setSchool, schoolFilter }) => {
  const [pick, setPick] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="dc-row">
        {schoolFilter && (school
          ? <button className="btn btn-primary" onClick={() => setSchool(null)}>{school.name} x</button>
          : <button className="btn btn-ghost" onClick={() => setPick(true)}>All schools (filter)</button>)}
        <input className="input" type="month" style={{ width: 150 }} value={f.month} onChange={set("month")} />
        <select className="select" style={{ width: 170 }} value={f.purpose} onChange={set("purpose")}>
          <option value="">All message types</option>
          {Object.entries(PURPOSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="select" style={{ width: 120 }} value={f.status} onChange={set("status")}>
          <option value="">Any status</option><option value="sent">Sent</option><option value="failed">Failed</option>
        </select>
        <select className="select" style={{ width: 170 }} value={f.via} onChange={set("via")}>
          <option value="">Any sender</option><option value="own">School number</option><option value="fallback">Platform number</option>
        </select>
        <input className="input" style={{ width: 150 }} placeholder="Phone" value={f.q} onChange={set("q")} />
        {(f.month || f.purpose || f.status || f.via || f.q) && <button className="btn btn-ghost" onClick={() => setF(EMPTY)}>Reset</button>}
      </div>
      {pick && <Modal title="Filter by school" onClose={() => setPick(false)}><SchoolList onPick={(s) => { setSchool(s); setPick(false); }} /></Modal>}
    </div>
  );
};

// ---------- usage view (KPIs, daily chart, tables) ----------
const UsageView = ({ d, onManage }) => {
  if (!d) return null;
  const t = d.totals || {};
  const cards = [["Total", t.total, C.blue], ["Sent", t.sent, C.green], ["Failed", t.failed, C.red], ["Success rate", `${t.success_rate || 0}%`, C.primary], ["School number", t.own_number, C.purple], ["Platform number", t.fallback_number, C.yellow]];
  const chart = (d.by_period || []).map((p) => ({ name: dayLabel(p.period), Sent: p.sent, Failed: p.failed }));
  const bill = d.by_category || [];
  const reasons = (d.fallback_reasons || []).map((r) => `${REASONS[r.reason] || r.reason}: ${r.total}`).join("  |  ");
  return (
    <>
      <div className="dc-grid">{cards.map(([l, v, c]) => <div key={l} className="card dc-kpi" style={{ "--k": c }}><b>{v ?? 0}</b><span>{l}</span></div>)}</div>

      {chart.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <b className="syne" style={{ fontSize: 14 }}>Messages per day{d.range === "last_30_days" ? " (last 30 days)" : ""}</b>
          <div style={{ height: 220, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}88`} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.textMuted }} />
                <Tooltip />
                <Bar dataKey="Sent" stackId="a" fill={C.green} />
                <Bar dataKey="Failed" stackId="a" fill={C.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="dc-split" style={{ marginBottom: 14 }}>
        <div className="card">
          <b className="syne" style={{ fontSize: 14 }}>Billable: sent from platform number</b>
          <div style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 8px" }}>Messages that went out from the School Office number, by Meta category.</div>
          {bill.length ? bill.map((c) => (
            <div key={c.category} className="dc-row" style={{ justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ textTransform: "capitalize" }}>{c.category}</span><b>{c.fallback_number} <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>of {c.total}</span></b>
            </div>
          )) : <p style={{ color: C.textMuted }}>No data.</p>}
          {reasons && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Why platform number: {reasons}</div>}
        </div>
        <div className="card">
          <b className="syne" style={{ fontSize: 14 }}>Top errors</b>
          {(d.top_errors || []).length ? d.top_errors.map((e, i) => (
            <div key={i} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12.5 }}>
              <b>{e.error_code || "?"}</b> ({e.total}) <span style={{ color: C.textMuted }}>{e.message || ""}</span>
            </div>
          )) : <p style={{ color: C.textMuted, marginTop: 8 }}>No failed messages.</p>}
        </div>
      </div>

      {d.by_school && (
        <div className="card" style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
          <div className="scroll-x"><table className="table">
            <thead><tr><th>School</th><th>Total</th><th>Sent</th><th>Failed</th><th>School no.</th><th>Platform no.</th><th /></tr></thead>
            <tbody>{d.by_school.map((r, i) => (
              <tr key={r.school_id || i}>
                <td style={{ fontWeight: 700, fontSize: 12.5 }}>{r.school_name || "Platform (signup OTPs)"}</td>
                <td>{r.total}</td><td style={{ color: C.green }}>{r.sent}</td><td style={{ color: r.failed ? C.red : undefined }}>{r.failed}</td>
                <td>{r.own_number}</td><td>{r.fallback_number}</td>
                <td>{r.school_id && onManage && <button className="btn btn-ghost" onClick={() => onManage({ id: r.school_id, name: r.school_name })}>Manage</button>}</td>
              </tr>))}</tbody>
          </table></div>
        </div>
      )}

      {(d.by_purpose || []).length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Message type</th><th>Total</th><th>Sent</th><th>Failed</th><th>School no.</th><th>Platform no.</th></tr></thead>
            <tbody>{d.by_purpose.map((r) => (
              <tr key={r.purpose}>
                <td style={{ fontWeight: 700, fontSize: 12.5 }}>{pLabel(r.purpose)} <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>{r.category}</span></td>
                <td>{r.total}</td><td style={{ color: C.green }}>{r.sent}</td><td style={{ color: r.failed ? C.red : undefined }}>{r.failed}</td><td>{r.own_number}</td><td>{r.fallback_number}</td>
              </tr>))}</tbody>
          </table></div>
        </div>
      )}
    </>
  );
};

// ---------- tab: overview ----------
const Overview = ({ f, setF, school, setSchool, onManage }) => {
  const o = useLoad(() => papi(`/whatsapp/overview?${qs({ ...f, school_id: school?.id || "" })}`), [f.month, f.purpose, f.status, f.via, f.q, school?.id]);
  return (
    <>
      <FilterBar f={f} setF={setF} school={school} setSchool={setSchool} schoolFilter />
      {o.err && <div className="card" style={{ color: C.red }}>{o.err}</div>}
      {o.loading && !o.data ? <p style={{ color: C.textMuted }}>Loading...</p> : <UsageView d={o.data} onManage={school ? null : onManage} />}
    </>
  );
};

// ---------- tab: per-school number ----------
const Numbers = ({ school, setSchool }) => {
  const [edit, setEdit] = useState(false); const [clear, setClear] = useState(false); const [busy, setBusy] = useState(false);
  const [number, setNumber] = useState(""); const [phoneId, setPhoneId] = useState(""); const [status, setStatus] = useState("pending");
  const d = useLoad(() => (school ? papi(`/schools/${school.id}/whatsapp`) : Promise.resolve(null)), [school?.id]);
  if (!school) return (<div className="card"><b className="syne">Choose a school</b><div style={{ marginTop: 10 }}><SchoolList onPick={setSchool} /></div></div>);

  const info = d.data || {};
  const openEdit = () => { setNumber(info.number || ""); setPhoneId(info.phone_id || ""); setStatus(info.status === "not_set" ? "pending" : info.status || "pending"); setEdit(true); };
  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); } };
  const save = () => run(async () => { await papi(`/schools/${school.id}/whatsapp`, "PUT", { number, phone_id: phoneId, status }); toast("Saved"); setEdit(false); d.reload(); });
  const verify = () => run(async () => {
    const r = await papi(`/schools/${school.id}/whatsapp/verify`, "POST");
    if (r.ok) toast(`Meta: ${r.check.verified_name || "ok"} ${fmtNum(r.check.display_phone)}${r.matched ? "" : " (number does not match the saved one)"}`, r.matched ? "ok" : "err");
    else toast(r.check?.error || "Meta could not verify this Phone ID", "err");
    d.reload();
  });
  const doClear = () => run(async () => { await papi(`/schools/${school.id}/whatsapp/clear`, "POST"); toast("Number removed"); setClear(false); d.reload(); });

  return (
    <>
      <div className="dc-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <b className="syne" style={{ fontSize: 16 }}>{school.name}</b>
        <button className="btn btn-ghost" onClick={() => setSchool(null)}>Change school</button>
      </div>
      {d.err && <div className="card" style={{ color: C.red }}>{d.err}</div>}
      {d.loading && !d.data ? <p style={{ color: C.textMuted }}>Loading...</p> : (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="dc-row" style={{ justifyContent: "space-between" }}><b className="syne" style={{ fontSize: 14 }}>Sender number</b><StatusChip s={info.status} /></div>
            <span className="dc-label">Number</span><div style={{ fontWeight: 600 }}>{fmtNum(info.number)}</div>
            <span className="dc-label">Phone ID</span><div className="dc-mono">{info.phone_id || "-"}</div>
            <span className="dc-label">Verified name</span><div>{info.verified_name || "-"}</div>
            <span className="dc-label">Last updated</span><div>{info.updated_at ? ago(info.updated_at) : "-"}</div>
            <div className="dc-row" style={{ marginTop: 14 }}>
              <button className="btn btn-primary" onClick={openEdit}>{info.number ? "Edit number" : "Set number"}</button>
              {info.phone_id && <button className="btn btn-ghost" disabled={busy} onClick={verify}>Verify with Meta</button>}
              {info.phone_id && <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setClear(true)}>Remove</button>}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Only a verified number is used for sending. Otherwise messages go from the platform number and are billable.</div>
          </div>
          <UsageView d={info.usage} />
        </>
      )}
      {edit && (
        <Modal title="WhatsApp number" onClose={() => setEdit(false)}>
          <Field label="Number"><input className="input" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 9876543210" /></Field>
          <Field label="Phone ID"><input className="input" inputMode="numeric" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} /></Field>
          <Field label="Status">
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">Pending</option><option value="verified">Verified</option><option value="blocked">Blocked</option>
            </select>
          </Field>
          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy} onClick={save}>{busy ? "Saving..." : "Save"}</button>
        </Modal>
      )}
      {clear && (
        <Modal title="Remove WhatsApp number" onClose={() => setClear(false)}>
          <p style={{ fontSize: 13, color: C.textMuted }}>The school will go back to the platform number. The school can then add a number again from its Setup page.</p>
          <button className="btn btn-danger" disabled={busy} onClick={doClear}>{busy ? "Removing..." : "Remove number"}</button>
        </Modal>
      )}
    </>
  );
};

// ---------- tab: message log ----------
const Logs = ({ f, setF, school, setSchool }) => {
  const [rows, setRows] = useState([]); const [pg, setPg] = useState({ total: 0, page: 1, pages: 1 }); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  const key = `${f.month}|${f.purpose}|${f.status}|${f.via}|${f.q}|${school?.id || ""}`;
  useEffect(() => { setPage(1); }, [key]);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      papi(`/whatsapp/logs?${qs({ ...f, school_id: school?.id || "", page, limit: 40 })}`, "GET", undefined, true)
        .then((r) => { setRows(Array.isArray(r?.data) ? r.data : []); setPg(r?.pagination || { total: 0, page: 1, pages: 1 }); setErr(""); })
        .catch((e) => setErr(e.message)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [key, page]); // eslint-disable-line
  return (
    <>
      <FilterBar f={f} setF={setF} school={school} setSchool={setSchool} schoolFilter />
      {err && <div className="card" style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <p style={{ padding: 20, color: C.textMuted }}>Loading...</p> : !rows.length ? <p style={{ padding: 20, color: C.textMuted }}>No messages match these filters.</p> : (
          <div className="scroll-x"><table className="table">
            <thead><tr><th>School</th><th>Type</th><th>To</th><th>Sender</th><th>Status</th><th>When</th></tr></thead>
            <tbody>{rows.map((l) => (
              <tr key={l.id}>
                <td style={{ fontSize: 12.5, fontWeight: 700 }}>{l.school_name || "Platform"}</td>
                <td style={{ fontSize: 12.5 }}>{pLabel(l.purpose)}</td>
                <td className="dc-mono">{l.to_phone ? `+${l.to_phone}` : "-"}</td>
                <td><span className="dc-chip" style={{ background: `${l.via_fallback ? C.yellow : C.green}22`, color: l.via_fallback ? C.yellow : C.green }}>{l.via_fallback ? "platform" : "school"}</span></td>
                <td>
                  <span className="dc-chip" style={{ background: `${l.send_status === "sent" ? C.green : C.red}22`, color: l.send_status === "sent" ? C.green : C.red }}>{l.send_status}</span>
                  {l.send_status === "failed" && l.error_message && <div style={{ fontSize: 10.5, color: C.red, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.error_code} {l.error_message}</div>}
                </td>
                <td style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>{ago(l.created_at)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
        {pg.pages > 1 && (
          <div className="dc-row" style={{ justifyContent: "space-between", padding: "10px 14px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>Page {pg.page} of {pg.pages} - {pg.total} messages</span>
            <div className="dc-row">
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="btn btn-ghost" disabled={page >= pg.pages} onClick={() => setPage((p) => Math.min(pg.pages, p + 1))}>Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ---------- tab: webhook + billing (placeholders) ----------
const Later = () => (
  <div className="dc-split">
    <div className="card">
      <div className="dc-row" style={{ justifyContent: "space-between" }}><b className="syne" style={{ fontSize: 15 }}>Meta webhook</b><Soon /></div>
      <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, margin: "8px 0" }}>
        Receive delivery, read and failed updates from Meta for every message and keep the message log accurate automatically. Today a message is marked Sent when Meta accepts it.
      </p>
      <Field label="Callback URL"><input className="input" disabled value="" placeholder="Available with the webhook release" /></Field>
      <Field label="Verify token"><input className="input" disabled value="" placeholder="Available with the webhook release" /></Field>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>Planned: message status updates, template status, number quality alerts.</div>
    </div>
    <div className="card">
      <div className="dc-row" style={{ justifyContent: "space-between" }}><b className="syne" style={{ fontSize: 15 }}>Billing</b><Soon /></div>
      <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, margin: "8px 0" }}>
        Monthly charges per school for messages sent from the platform number, using per-category rates (authentication, utility, marketing). The billable counts are already shown on the Overview tab.
      </p>
    </div>
  </div>
);

// ---------- page ----------
export const WhatsappPage = ({ focusId }) => {
  const [tab, setTab] = useState(focusId ? "numbers" : "overview");
  const [f, setF] = useState(EMPTY);
  const [school, setSchool] = useState(focusId ? { id: focusId, name: "School" } : null);
  useEffect(() => { if (focusId) papi(`/schools/${focusId}`).then((s) => setSchool({ id: focusId, name: s?.name || "School" })).catch(() => {}); }, [focusId]);
  const manage = (s) => { setSchool(s); setTab("numbers"); };
  const TABS = [["overview", "Overview"], ["numbers", "School numbers"], ["logs", "Message log"], ["later", "Webhook & billing"]];
  return (
    <div>
      <div className="dc-tabs">{TABS.map(([k, l]) => <button key={k} className={`btn ${tab === k ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === "overview" && <Overview f={f} setF={setF} school={school} setSchool={setSchool} onManage={manage} />}
      {tab === "numbers" && <Numbers school={school} setSchool={setSchool} />}
      {tab === "logs" && <Logs f={f} setF={setF} school={school} setSchool={setSchool} />}
      {tab === "later" && <Later />}
    </div>
  );
};
