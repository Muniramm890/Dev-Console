// @ts-nocheck
// TC / graduation register: every student who left the school, with TC number and reason.
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { SectionCard } from "../../components/ui/SectionCard";
import { useAuth } from "../../contexts/AuthContext";
import { useDialog } from "../../contexts/DialogContext";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { C } from "../../theme/theme";
import { Chip, fmtDate, fullName } from "./parts";

export const ExitRegisterTab = ({ years }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [qq, setQq] = useState("");
  const { user } = useAuth();
  const { dialogAlert } = useDialog();
  const isAdmin = user?.role === "school_admin";
  const [tcBusy, setTcBusy] = useState("");
  const printTc = async (x) => {
    setTcBusy(x.id);
    try { await openGeneratedPdf(`/promotion/exits/${x.id}/tc`, { name: `TC_${x.admission_no || x.id}.pdf`, title: "Transfer Certificate" }); }
    catch (e) { await dialogAlert(e.message || "Could not generate the Transfer Certificate", "TC failed"); }
    finally { setTcBusy(""); }
  };
  useEffect(() => { const t = setTimeout(() => setQq(q), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    setLoading(true); setError("");
    const p = new URLSearchParams(); if (year) p.set("academic_year_id", year); if (type) p.set("type", type); if (qq) p.set("q", qq);
    apiRequest(`/promotion/exits?${p.toString()}`).then((r) => setRows(Array.isArray(r?.data) ? r.data : [])).catch((e) => { setRows([]); setError(e?.message || "Could not load the register."); }).finally(() => setLoading(false));
  }, [year, type, qq]);

  return (
    <SectionCard icon="file" title="TC & graduation register" sub="Students who left the school. Their Student App login is switched off automatically.">
      {error && <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Could not load the register: {error}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <select className="select" style={{ width: 170 }} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All sessions</option>{years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        {[["", "All"], ["tc", "TC"], ["graduated", "Graduated"]].map(([id, label]) => (
          <button key={id} onClick={() => setType(id)} style={{ border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 20, fontWeight: 700, fontSize: 12.5, background: type === id ? C.primary : C.surfaceAlt, color: type === id ? "#fff" : C.text }}>{label}</button>
        ))}
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320 }}>
          <input className="input" placeholder="Search name, admission or TC no." value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
          <span style={{ position: "absolute", left: 11, top: 11, color: C.textMuted }}><Icon name="search" size={15} /></span>
        </div>
        <Chip color={C.textMuted}>{rows.length} record{rows.length === 1 ? "" : "s"}</Chip>
      </div>
      {loading ? <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading…</div>
        : rows.length === 0 ? <EmptyState icon="file" title="No records" sub="TC and graduation records will appear here." />
        : (
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Student</th><th>Class</th><th>Type</th><th>TC no.</th><th>Reason</th><th>Session</th><th>Date</th>{isAdmin && <th style={{ textAlign: "right" }}>Action</th>}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Avatar teacher={{ avatar_url: r.photo_url, full_name: fullName(r) }} size={34} /><div><div style={{ fontWeight: 700 }}>{fullName(r)}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>Adm# {r.admission_no}</div></div></div></td>
                    <td>{r.grade_name ? `${r.grade_name} - ${r.section_name}` : "—"}</td>
                    <td><Chip color={r.exit_type === "tc" ? C.red : C.blue}>{r.exit_type === "tc" ? "TC" : r.exit_type === "graduated" ? "Graduated" : r.exit_type}</Chip></td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.tc_number || "—"}</td>
                    <td style={{ maxWidth: 220, fontSize: 12.5 }}>{r.reason || "—"}</td>
                    <td>{r.academic_year_name || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
                    {isAdmin && <td style={{ textAlign: "right" }}><button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} disabled={tcBusy === r.id} onClick={() => printTc(r)}><Icon name="file" size={13} /> {tcBusy === r.id ? "Preparing..." : "Print TC"}</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </SectionCard>
  );
};
