// @ts-nocheck
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { C } from "../../theme/theme";
import { Chip, ProgressBar } from "./parts";

export const PromotionOverviewTab = ({ overview, loading, totals, onPromoteSection }) => {
  if (loading && !overview) return <div className="pulse" style={{ padding: 60, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading class list…</div>;
  const rows = overview?.by_grade_section || [];
  if (!rows.length) return <div className="card"><EmptyState icon="students" title="No students in this session" sub="There are no enrolments in the selected From session, so there is nothing to promote." /></div>;

  const groups = [];
  rows.forEach((r) => { let g = groups.find((x) => x.id === r.grade_id); if (!g) { g = { id: r.grade_id, name: r.grade_name, items: [] }; groups.push(g); } g.items.push(r); });
  const left = totals.pending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 14 }}>
        <KpiCard label="Students" value={totals.total} sub={`${totals.processed} processed`} icon="students" color={C.primary} />
        <KpiCard label="Still to process" value={totals.pending} sub={left ? "action needed" : "all done"} icon="clock" color={left ? C.yellow : C.green} />
        <KpiCard label="Promoted" value={totals.promoted} sub={`${totals.retained} retained`} icon="check" color={C.green} />
        <KpiCard label="Left school" value={totals.tc + totals.graduated} sub={`${totals.tc} TC / ${totals.graduated} graduated`} icon="file" color={C.red} />
      </div>

      <SectionCard icon="dashboard" title="Class-wise progress" sub="Open a class to promote, retain or issue TC. Nothing is overwritten: the old session keeps its record."
        right={<div style={{ width: 200 }}><ProgressBar value={totals.processed} total={totals.total} /></div>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {groups.map((g) => (
            <div key={g.id}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{g.name}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {g.items.map((s) => (
                  <div key={s.section_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                    <div style={{ width: 120, fontWeight: 700 }}>{g.name} - {s.section_name}</div>
                    <div style={{ flex: 1, minWidth: 160 }}><ProgressBar value={s.processed} total={s.total_students} color={s.pending ? C.yellow : C.green} /></div>
                    <div style={{ display: "flex", gap: 6, minWidth: 190 }}>
                      <Chip color={C.textMuted}>{s.total_students} students</Chip>
                      {s.pending > 0 ? <Chip color={C.yellow}>{s.pending} left</Chip> : <Chip color={C.green}>Done</Chip>}
                    </div>
                    <button className={`btn ${s.pending > 0 ? "btn-primary" : "btn-ghost"}`} style={{ padding: "7px 14px", fontSize: 12.5 }} disabled={s.pending === 0} onClick={() => onPromoteSection(s.section_id)}>
                      Process <Icon name="arrow_right" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
