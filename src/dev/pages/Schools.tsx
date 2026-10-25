// @ts-nocheck
import { useEffect, useState } from "react";
import { papi, ago } from "../api";
import { Chip, useLoad } from "../ui";
import { C } from "../../theme/theme";

export const SchoolsPage = ({ go, onOpen }) => {
  const [q, setQ] = useState(""); const [st, setSt] = useState(""); const [del, setDel] = useState(false); const [page, setPage] = useState(1); const [items, setItems] = useState([]); const [total, setTotal] = useState(0); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
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
  return (
    <div>
      <div className="dc-grid">{cards.map(([l, v, c]) => (
        <div key={l} className="card" style={{ textAlign: "center" }}><div className="syne" style={{ fontSize: 24, fontWeight: 800, color: c }}>{v ?? "-"}</div><div style={{ fontSize: 11, color: C.textMuted }}>{l}</div></div>))}</div>
      <div className="dc-row" style={{ marginBottom: 12 }}>
        <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Search name, slug, city, email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" style={{ width: 140 }} value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">All status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option>
        </select>
        <label className="dc-row" style={{ fontSize: 13 }}><input type="checkbox" checked={del} onChange={(e) => setDel(e.target.checked)} /> Deleted</label>
        <button className="btn btn-primary" onClick={() => go("new")}>+ New school</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((s) => (
          <div key={s.id} className="card dc-school" onClick={() => go(`school:${s.id}`)}>
            <div style={{ minWidth: 0 }}>
              <div className="dc-row"><b>{s.name}</b><Chip status={s.platform_status} deleted={!!s.deleted_at} /></div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{s.slug} - {[s.city, s.state].filter(Boolean).join(", ")} - {s.students} students - {s.staff} staff</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Last login {ago(s.last_login_at)}{s.valid_until ? ` - valid till ${String(s.valid_until).slice(0, 10)}` : ""}{s.plan ? ` - ${s.plan}` : ""}</div>
            </div>
            <div className="dc-row" onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-primary" disabled={!!s.deleted_at} onClick={() => onOpen({ id: s.id, name: s.name })}>Open</button>
              <button className="btn btn-ghost" onClick={() => go(`school:${s.id}`)}>Manage</button>
            </div>
          </div>
        ))}
        {err && <div className="card" style={{ color: C.red, fontSize: 13 }}>{err} <button className="btn btn-ghost" onClick={() => fetchPage(1, true)}>Retry</button></div>}
        {!items.length && !busy && !err && <div className="card" style={{ textAlign: "center", color: C.textMuted }}>No schools found.</div>}
        {items.length < total && <button className="btn btn-ghost" disabled={busy} onClick={() => fetchPage(page + 1, false)}>{busy ? "Loading..." : `Load more (${items.length}/${total})`}</button>}
      </div>
    </div>
  );
};
