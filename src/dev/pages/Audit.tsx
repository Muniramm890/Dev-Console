// @ts-nocheck
import { useState } from "react";
import { papi, ago } from "../api";
import { useLoad } from "../ui";
import { C } from "../../theme/theme";

export const AuditPage = () => {
  const a = useLoad(() => papi("/audit?limit=300"), []); const [q, setQ] = useState("");
  const rows = (a.data || []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input className="input" placeholder="Filter (school, action, admin...)" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      <div className="card">
        {rows.map((r) => (<div key={r.id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
          <b>{r.action}</b> {r.school_name ? `- ${r.school_name}` : ""} <span style={{ color: C.textMuted }}>{r.detail || ""}</span>
          <div style={{ fontSize: 11, color: C.textMuted }}>{r.admin_email || "system"} - {ago(r.created_at)}{r.ip ? ` - ${r.ip}` : ""}</div></div>))}
        {!rows.length && <p style={{ color: C.textMuted }}>{a.loading ? "Loading..." : "No entries."}</p>}
      </div>
    </div>
  );
};
