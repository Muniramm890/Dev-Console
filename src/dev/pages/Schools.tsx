// @ts-nocheck
import { useEffect, useState } from "react";
import { papi, ago, explain, toast } from "../api";
import { Chip, Modal, Field, statusColor, useLoad } from "../ui";
import { healthFlags } from "../health";
import { C } from "../../theme/theme";

const FLAG = { red: C.red, yellow: C.yellow, grey: C.textMuted };

const exportCsv = async () => {
  try {
    let page = 1, all = [];
    for (;;) { const r = await papi(`/schools?limit=200&page=${page}`); all = all.concat(r.items); if (all.length >= r.total || !r.items.length) break; page++; }
    const cols = ["name", "slug", "city", "state", "platform_status", "students", "staff", "plan", "valid_until", "max_students", "max_staff", "last_login_at", "created_at"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...all.map((s) => cols.map((c) => esc(s[c])).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `schools-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  } catch (e) { toast(explain(e), "err"); }
};

export const SchoolsPage = ({ go, onOpen }) => {
  const [q, setQ] = useState(""); const [st, setSt] = useState(""); const [del, setDel] = useState(false); const [page, setPage] = useState(1);
  const [items, setItems] = useState([]); const [total, setTotal] = useState(0); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [sel, setSel] = useState(null); const [bulk, setBulk] = useState(null); const [reason, setReason] = useState(""); const [message, setMessage] = useState("");
  const ov = useLoad(() => papi("/overview"), []);
  const fetchPage = async (p, replace) => {
    setBusy(true); setErr("");
    try {
      const r = await papi(`/schools?q=${encodeURIComponent(q)}&status=${st}&deleted=${del ? 1 : 0}&page=${p}&limit=30`);
      setItems((prev) => (replace ? r.items : [...prev, ...r.items])); setTotal(r.total); setPage(p);
    } catch (e) { setErr(e.message || "Could not load schools"); } finally { setBusy(false); }
  };
  useEffect(() => { const t = setTimeout(() => fetchPage(1, true), 250); return () => clearTimeout(t); }, [q, st, del]); // eslint-disable-line
  const o = ov.data || {};
  const cards = [["Schools", o.schools, C.primary], ["Active", o.active, C.green], ["Suspended", o.suspended, C.yellow], ["Blocked", o.blocked, C.red], ["Students", o.students, C.blue], ["Staff", o.staff, C.purple]];
  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const runBulk = async () => {
    try { const r = await papi("/schools/bulk", "POST", { ids: [...sel], action: bulk, reason, message }); toast(`Done (${r.affected} school(s))`); setBulk(null); setSel(null); setReason(""); setMessage(""); fetchPage(1, true); ov.reload(); }
    catch (e) { toast(explain(e), "err"); }
  };
  return (
    <div>
      <div className="dc-grid">{cards.map(([l, v, c]) => (<div key={l} className="card dc-kpi" style={{ "--k": c }}><b className="syne" style={{ color: c }}>{v ?? "-"}</b><span>{l}</span></div>))}</div>

      <div className="dc-row" style={{ marginBottom: 12 }}>
        <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Search name, slug, city, email" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="dc-seg">{[["", "All"], ["active", "Active"], ["suspended", "Suspended"], ["blocked", "Blocked"]].map(([v, l]) => <button key={v} className={st === v ? "on" : ""} onClick={() => setSt(v)}>{l}</button>)}</div>
        <label className="dc-row" style={{ fontSize: 13 }}><input type="checkbox" checked={del} onChange={(e) => setDel(e.target.checked)} /> Deleted</label>
      </div>
      <div className="dc-row" style={{ marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => go("new")}>+ New school</button>
        <button className="btn btn-ghost" onClick={() => setSel(sel ? null : new Set())}>{sel ? "Cancel selection" : "Select multiple"}</button>
        <button className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted }}>{items.length} of {total}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((s) => {
          const flags = healthFlags(s);
          return (
            <div key={s.id} className="card dc-school" onClick={() => (sel ? toggle(s.id) : go(`school:${s.id}`))}>
              <div className="dc-stripe" style={{ background: s.deleted_at ? C.textMuted : statusColor(s.platform_status) }} />
              <div className="dc-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="dc-row">
                    {sel && <input type="checkbox" checked={sel.has(s.id)} readOnly />}
                    <b style={{ fontSize: 15 }}>{s.name}</b><Chip status={s.platform_status} deleted={!!s.deleted_at} />
                    {flags.map(([t, c]) => <span key={t} className="dc-chip" style={{ background: `${FLAG[c]}22`, color: FLAG[c] }}>{t}</span>)}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{s.slug} - {[s.city, s.state].filter(Boolean).join(", ")}{s.plan ? ` - ${s.plan}` : ""}{s.valid_until ? ` - valid till ${String(s.valid_until).slice(0, 10)}` : ""}</div>
                  <div style={{ fontSize: 12.5, marginTop: 6 }}><b>{s.students}</b>{s.max_students != null ? `/${s.max_students}` : ""} students - <b>{s.staff}</b>{s.max_staff != null ? `/${s.max_staff}` : ""} staff - last login {ago(s.last_login_at)}</div>
                </div>
                {!sel && (
                  <div className="dc-row" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-primary" disabled={!!s.deleted_at} onClick={() => onOpen({ id: s.id, name: s.name })}>Open</button>
                    <button className="btn btn-ghost" onClick={() => go(`school:${s.id}`)}>Manage</button>
                  </div>)}
              </div>
            </div>
          );
        })}
        {err && <div className="card" style={{ color: C.red, fontSize: 13 }}>{err} <button className="btn btn-ghost" onClick={() => fetchPage(1, true)}>Retry</button></div>}
        {!items.length && !busy && !err && <div className="card" style={{ textAlign: "center", color: C.textMuted }}>No schools found.</div>}
        {items.length < total && <button className="btn btn-ghost" disabled={busy} onClick={() => fetchPage(page + 1, false)}>{busy ? "Loading..." : `Load more (${items.length}/${total})`}</button>}
      </div>

      {sel && sel.size > 0 && (
        <div className="card dc-bulk">
          <b>{sel.size} selected</b>
          <button className="btn btn-ghost" onClick={() => setBulk("suspend")}>Suspend</button>
          <button className="btn btn-ghost" style={{ color: C.red }} onClick={() => setBulk("block")}>Block</button>
          <button className="btn btn-ghost" onClick={() => setBulk("unblock")}>Unblock</button>
          <button className="btn btn-ghost" onClick={() => setBulk("force-logout")}>Force logout</button>
        </div>)}
      {bulk && (
        <Modal title={`${bulk} - ${sel.size} school(s)`} onClose={() => setBulk(null)}>
          {["block", "suspend"].includes(bulk) && <>
            <Field label="Reason (internal, required)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <Field label="Message shown to the schools (optional)"><input className="input" value={message} onChange={(e) => setMessage(e.target.value)} /></Field></>}
          {!["block", "suspend"].includes(bulk) && <p style={{ fontSize: 13 }}>This will apply to all selected schools immediately.</p>}
          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={["block", "suspend"].includes(bulk) && reason.trim().length < 3} onClick={runBulk}>Confirm</button>
        </Modal>)}
    </div>
  );
};
