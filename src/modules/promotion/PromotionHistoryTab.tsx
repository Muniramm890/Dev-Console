// @ts-nocheck
// Every promotion run: who ran it, when, the counts, and (on tap) exactly which student went where.
import { useState } from "react";
import { apiRequest } from "../../api/client";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";
import { Chip, fmtDateTime, fullName } from "./parts";

const TYPE = { promoted: ["Promoted", C.green], retained: ["Retained", C.yellow], tc: ["TC", C.red], graduated: ["Graduated", C.blue] };

export const PromotionHistoryTab = ({ history, loading, error }) => {
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState({});
  const [busy, setBusy] = useState("");


  const toggle = async (id) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (!detail[id]) {
      setBusy(id);
      try { const r = await apiRequest(`/promotion/history/${id}`); setDetail((d) => ({ ...d, [id]: r?.data })); }
      catch (e) { setDetail((d) => ({ ...d, [id]: { error: e.message } })); } finally { setBusy(""); }
    }
  };

  if (loading) return <div className="pulse" style={{ padding: 60, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading history…</div>;
  if (error) return <div className="card" style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>Could not load history: {error}</div>;
  if (!history.length) return <div className="card"><EmptyState icon="clock" title="No promotion runs yet" sub="Every promotion you run is recorded here with full details." /></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {history.map((h) => {
        const d = detail[h.id]; const isOpen = open === h.id;
        return (
          <div key={h.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button onClick={() => toggle(h.id)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "14px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", color: C.text }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${C.primary}1f`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="arrow_right" size={17} /></div>
              <div style={{ flex: "1 1 220px" }}>
                <div style={{ fontWeight: 800 }}>{h.from_year_name} → {h.to_year_name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{fmtDateTime(h.created_at)}{h.run_by_name ? ` · by ${h.run_by_name}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Chip color={C.green}>{h.total_promoted} promoted</Chip><Chip color={C.yellow}>{h.total_retained} retained</Chip>
                <Chip color={C.red}>{h.total_tc} TC</Chip><Chip color={C.blue}>{h.total_graduated} graduated</Chip>
              </div>
              <span style={{ color: C.textMuted, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}><Icon name="arrow_right" size={15} /></span>
            </button>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 18px 16px" }}>
                {busy === h.id || !d ? <div className="pulse" style={{ color: C.primary, fontWeight: 600 }}>Loading details…</div>
                  : d.error ? <div style={{ color: C.red, fontSize: 13 }}>{d.error}</div>
                  : (d.moves.length + d.exits.length === 0 ? <div style={{ color: C.textMuted, fontSize: 13 }}>No details were recorded for this run.</div> : (
                    <div className="scroll-x">
                      <table className="table">
                        <thead><tr><th>Student</th><th>Adm#</th><th>From</th><th>Result</th><th>Roll</th></tr></thead>
                        <tbody>
                          {d.moves.map((m) => (
                            <tr key={m.student_id + m.transition_type}>
                              <td style={{ fontWeight: 600 }}>{fullName(m)}</td><td>{m.admission_no}</td>
                              <td>{m.from_grade ? `${m.from_grade} - ${m.from_section}` : "—"}</td>
                              <td><Chip color={TYPE[m.transition_type]?.[1]}>{TYPE[m.transition_type]?.[0] || m.transition_type}</Chip> <span style={{ color: C.textMuted, fontSize: 12 }}>→ {m.to_grade} - {m.to_section}</span></td>
                              <td>{m.new_roll || "—"}</td>
                            </tr>
                          ))}
                          {d.exits.map((x) => (
                            <tr key={x.id}>
                              <td style={{ fontWeight: 600 }}>{fullName(x)}</td><td>{x.admission_no}</td><td>—</td>
                              <td><Chip color={x.exit_type === "tc" ? C.red : C.blue}>{x.exit_type === "tc" ? "TC" : "Graduated"}</Chip> <span style={{ color: C.textMuted, fontSize: 12 }}>{x.tc_number || x.reason || ""}</span></td><td>—</td>
                              
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
