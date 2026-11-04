// @ts-nocheck
// Console -> Inquiries: demo requests from the website form (POST /api/public/inquiries), managed through /platform/inquiries*.
// Everything the visitor typed is rendered as plain text (React escapes it), never as HTML.
import { useEffect, useState } from "react";
import { papi, ago, explain, toast } from "../api";
import { Modal, useLoad } from "../ui";
import { C } from "../../theme/theme";

const ST = { new: ["New", C.blue], contacted: ["Contacted", C.yellow], demo: ["Demo", C.primary], won: ["Won", C.green], lost: ["Lost", C.textMuted], spam: ["Spam", C.red] };
const ORDER = ["new", "contacted", "demo", "won", "lost", "spam"];
const qs = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null))).toString();
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-");
const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the browser's time zone
const isDue = (r) => r.follow_up_on && r.follow_up_on <= todayStr() && ["new", "contacted", "demo"].includes(r.status);
// spreadsheet apps run cells that start with = + - @ as formulas: a leading apostrophe keeps visitor-typed text inert
const cell = (v) => { let t = String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; return `"${t.replace(/"/g, '""')}"`; };
const notify = () => window.dispatchEvent(new Event("dc-inq-changed"));
const St = ({ s }) => { const [l, c] = ST[s] || [s, C.textMuted]; return <span className="dc-chip" style={{ background: `${c}22`, color: c }}>{l}</span>; };

const InquiryModal = ({ id, onClose, onChanged }) => {
  const r = useLoad(() => papi(`/inquiries/${id}`), [id]);
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [del, setDel] = useState(false); const [word, setWord] = useState(""); const [fu, setFu] = useState(null);
  const d = r.data;
  const run = async (fn, ok) => { setBusy(true); try { await fn(); if (ok) toast(ok); notify(); onChanged(); } catch (e) { toast(explain(e), "err"); } finally { setBusy(false); } };
  const setStatus = (status) => run(async () => { await papi(`/inquiries/${id}`, "PATCH", { status }); await r.reload(); }, "Status updated");
  const addNote = () => note.trim() && run(async () => { await papi(`/inquiries/${id}/notes`, "POST", { note: note.trim() }); setNote(""); await r.reload(); }, "Note added");
  const remove = () => run(async () => { await papi(`/inquiries/${id}`, "DELETE"); onClose(); }, "Removed from the list");
  const purge = () => word === "DELETE" && run(async () => { await papi(`/inquiries/${id}/purge`, "POST", { confirm: "DELETE" }); onClose(); }, "Deleted permanently");
  const saveFu = (v) => run(async () => { await papi(`/inquiries/${id}`, "PATCH", { follow_up_on: v || null }); setFu(null); await r.reload(); }, v ? "Follow-up saved" : "Follow-up cleared");
  const rows = d ? [["School", d.school_name], ["City / State", `${d.city}, ${d.state}`], ["Students", d.student_strength], ["Interested in", d.module], ["Role", d.role], ["Email", d.email || "-"], ["Received", when(d.created_at)], ["Last submitted", d.repeat_count > 1 ? `${when(d.last_submitted_at)} (${d.repeat_count} times)` : null], ["First contacted", d.contacted_at ? when(d.contacted_at) : null], ["Consent given", when(d.consent_at)]] : [];
  return (
    <Modal title={d ? `${d.ref} - ${d.name}` : "Inquiry"} onClose={onClose} wide>
      {r.loading && !d && <p style={{ color: C.textMuted }}>Loading...</p>}
      {r.err && <p style={{ color: C.red }}>{r.err}</p>}
      {d && (
        <>
          <div className="dc-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <div className="dc-row"><St s={d.status} />{d.repeat_count > 1 && <span className="dc-chip" style={{ background: `${C.yellow}22`, color: C.yellow }}>sent {d.repeat_count}x</span>}</div>
            <div className="dc-row">
              <a className="btn btn-primary" href={`tel:+91${d.phone}`}>Call</a>
              <a className="btn btn-ghost" href={`https://wa.me/91${d.phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              {d.email && <a className="btn btn-ghost" href={`mailto:${d.email}`}>Email</a>}
            </div>
          </div>
          <div style={{ fontSize: 14, marginBottom: 10 }}><b className="dc-mono">+91 {d.phone}</b></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px 16px", marginBottom: 12 }}>
            {rows.filter((x) => x[1]).map(([l, v]) => <div key={l}><span className="dc-label">{l}</span><div style={{ fontSize: 13, wordBreak: "break-word" }}>{v}</div></div>)}
          </div>
          {d.message && <><span className="dc-label">Message</span><div style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word", background: C.surfaceAlt, padding: 10, borderRadius: 8, marginBottom: 12 }}>{d.message}</div></>}
          <span className="dc-label">Status</span>
          <div className="dc-seg" style={{ marginBottom: 12, flexWrap: "wrap" }}>{ORDER.map((s) => <button key={s} disabled={busy} className={d.status === s ? "on" : ""} onClick={() => d.status !== s && setStatus(s)}>{ST[s][0]}</button>)}</div>
          <span className="dc-label">Follow-up date</span>
          <div className="dc-row" style={{ marginBottom: 12 }}>
            <input className="input" type="date" style={{ width: 160 }} value={fu ?? d.follow_up_on ?? ""} onChange={(e) => setFu(e.target.value)} />
            <button className="btn btn-primary" disabled={busy || fu === null} onClick={() => saveFu(fu)}>Save</button>
            {d.follow_up_on && <button className="btn btn-ghost" disabled={busy} onClick={() => saveFu("")}>Clear</button>}
            {isDue(d) && <span className="dc-chip" style={{ background: `${C.red}22`, color: C.red }}>Follow-up due</span>}
          </div>
          <span className="dc-label">Internal notes</span>
          <div className="dc-row" style={{ marginBottom: 8, alignItems: "flex-start" }}>
            <textarea className="input" rows={2} maxLength={1000} placeholder="Call summary, next step, demo date..." value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
            <button className="btn btn-primary" disabled={busy || !note.trim()} onClick={addNote}>Add note</button>
          </div>
          <div style={{ maxHeight: "26vh", overflow: "auto" }}>
            {(d.notes || []).map((n) => (
              <div key={n.id} style={{ padding: "7px 0", borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
                {n.kind === "follow" ? <span>{n.body}</span> : n.kind === "status" ? <span>Status: <b>{String(n.body).replace("->", "→")}</b></span> : n.kind === "repeat" ? <span style={{ color: C.yellow }}>{n.body}</span> : <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{n.body}</span>}
                <div style={{ fontSize: 11, color: C.textMuted }}>{n.admin_name || (n.kind === "repeat" ? "Website" : "system")} - {ago(n.created_at)}</div>
              </div>
            ))}
            {!(d.notes || []).length && <p style={{ fontSize: 12.5, color: C.textMuted }}>No notes yet.</p>}
          </div>
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            {!del ? <div className="dc-row" style={{ justifyContent: "flex-end" }}><button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setDel(true)}>Delete...</button></div> : (
              <>
                <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 8 }}><b>Remove</b> hides it from the list but keeps the record. <b>Delete permanently</b> erases it and all its notes for good and cannot be undone.</div>
                <div className="dc-row" style={{ flexWrap: "wrap" }}>
                  <button className="btn btn-ghost" disabled={busy} onClick={remove}>Remove from list</button>
                  <input className="input" style={{ width: 150 }} placeholder="Type DELETE" value={word} onChange={(e) => setWord(e.target.value)} />
                  <button className="btn btn-primary" style={{ background: C.red }} disabled={busy || word !== "DELETE"} onClick={purge}>Delete permanently</button>
                  <button className="btn btn-ghost" onClick={() => { setDel(false); setWord(""); }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
};

export const InquiriesPage = () => {
  const F0 = { status: "", q: "", from: "", to: "", due: "" };
  const [f, setF] = useState(F0); const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, limit: 25 }); const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  const [sel, setSel] = useState(null); const [tick, setTick] = useState(0);
  const stats = useLoad(() => papi("/inquiries/stats"), [tick]);
  const key = `${f.status}|${f.q}|${f.from}|${f.to}|${f.due}|${page}|${tick}`;
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      papi(`/inquiries?${qs({ status: f.status, q: f.q.trim(), from: f.from, to: f.to, due: f.due, page, limit: 25 })}`)
        .then((r) => { setData(r); setErr(""); }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = []; for (let p = 1; p <= 20; p++) { const r = await papi(`/inquiries?${qs({ status: f.status, q: f.q.trim(), from: f.from, to: f.to, due: f.due, page: p, limit: 100 })}`); all.push(...r.rows); if (all.length >= r.total) break; }
      const head = ["Ref", "Received", "Name", "Role", "Phone", "Email", "School", "City", "State", "Students", "Interested in", "Status", "Follow-up", "Times submitted", "Message"];
      const body = all.map((r) => [r.ref, r.created_at, r.name, r.role, r.phone, r.email, r.school_name, r.city, r.state, r.student_strength, r.module, r.status, r.follow_up_on, r.repeat_count, r.message].map(cell).join(","));
      const url = URL.createObjectURL(new Blob(["\uFEFF" + [head.map(cell).join(","), ...body].join("\r\n")], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = `inquiries-${todayStr()}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast(`${all.length} inquiries exported`);
    } catch (e) { toast(explain(e), "err"); } finally { setExporting(false); }
  };
  const s = stats.data, pages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || 25)));
  const cards = s ? [["New", s.counts.new, C.blue], ["Contacted", s.counts.contacted, C.yellow], ["Demo", s.counts.demo, C.primary], ["Won", s.counts.won, C.green], ["Last 7 days", s.last_7d, C.textMuted], ["Follow-ups due", s.follow_up_due, C.red, "due"]] : [];
  return (
    <>
      {s && <div className="dc-grid" style={{ marginBottom: 14 }}>{cards.map(([l, v, c, flt]) => <div key={l} className="card dc-kpi" style={{ "--k": c, cursor: flt ? "pointer" : undefined, outline: flt && f.due ? `2px solid ${c}` : undefined }} onClick={flt ? () => { setF({ ...f, due: f.due ? "" : "1" }); setPage(1); } : undefined}><b>{v}</b><span>{l}</span></div>)}</div>}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="dc-row">
          <div className="dc-seg" style={{ flexWrap: "wrap" }}>
            <button className={f.status === "" ? "on" : ""} onClick={() => { setF({ ...f, status: "" }); setPage(1); }}>Active</button>
            {ORDER.map((k) => <button key={k} className={f.status === k ? "on" : ""} onClick={() => { setF({ ...f, status: k }); setPage(1); }}>{ST[k][0]}</button>)}
          </div>
          <input className="input" style={{ width: 220 }} placeholder="Name, school, phone, city, INQ-000123" value={f.q} onChange={set("q")} />
          <input className="input" type="date" style={{ width: 140 }} value={f.from} onChange={set("from")} title="From" />
          <input className="input" type="date" style={{ width: 140 }} value={f.to} onChange={set("to")} title="To" />
          {(f.status || f.q || f.from || f.to || f.due) && <button className="btn btn-ghost" onClick={() => { setF(F0); setPage(1); }}>Reset</button>}
          <button className="btn btn-ghost" disabled={exporting || !data.total} onClick={exportCsv} style={{ marginLeft: "auto" }}>{exporting ? "Exporting..." : "Export CSV"}</button>
        </div>
      </div>
      {err && <div className="card" style={{ color: C.red, marginBottom: 12 }}>{err}</div>}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading && !data.rows.length ? <p style={{ padding: 20, color: C.textMuted }}>Loading...</p> : !data.rows.length ? <p style={{ padding: 20, color: C.textMuted }}>No inquiries match these filters.</p> : (
          <div className="scroll-x"><table className="table">
            <thead><tr><th>Ref</th><th>Received</th><th>Contact</th><th>School</th><th>Interested in</th><th>Students</th><th>Status</th></tr></thead>
            <tbody>{data.rows.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer", opacity: loading ? 0.6 : 1 }} onClick={() => setSel(r.id)}>
                <td className="dc-mono">{r.ref}</td>
                <td style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>{ago(r.created_at)}</td>
                <td><div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{r.role} - {r.phone}</div></td>
                <td><div style={{ fontSize: 13 }}>{r.school_name}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{r.city}, {r.state}</div></td>
                <td style={{ fontSize: 12.5 }}>{r.module}</td>
                <td style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{r.student_strength}</td>
                <td><St s={r.status} />{r.follow_up_on && <span className="dc-chip" style={{ background: isDue(r) ? `${C.red}22` : `${C.textMuted}22`, color: isDue(r) ? C.red : C.textMuted, marginLeft: 4 }}>{isDue(r) ? "Due " : "Follow-up "}{r.follow_up_on}</span>}{r.repeat_count > 1 && <span className="dc-chip" style={{ background: `${C.yellow}22`, color: C.yellow, marginLeft: 4 }}>x{r.repeat_count}</span>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
        {data.total > 0 && (
          <div className="dc-row" style={{ padding: "10px 14px", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, fontSize: 12.5 }}>
            <span style={{ color: C.textMuted }}>{data.total} inquir{data.total === 1 ? "y" : "ies"}</span>
            <div className="dc-row"><button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button><span>{page} / {pages}</span><button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>
          </div>
        )}
      </div>
      {sel && <InquiryModal id={sel} onClose={() => setSel(null)} onChanged={() => setTick((t) => t + 1)} />}
    </>
  );
};
