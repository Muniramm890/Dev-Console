// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { C } from "../../theme/theme";
import { Avatar, Podium } from "./ResultsPodium";

const MEDAL = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

// Leaderboard: top-3 podium with photos + ranked list, filtered by class and section
export const ResultsToppersTab = ({ examGroupId }) => {
  const [rows, setRows] = useState([]);
  const [sections, setSections] = useState([]); // classes + sections that have results for this exam
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");

  useEffect(() => {
    setGradeId(""); setSectionId("");
    apiRequest(`/results/section-wise?exam_group_id=${examGroupId}`)
      .then((res) => setSections(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setSections([]));
  }, [examGroupId]);

  useEffect(() => {
    setLoading(true);
    const q = `exam_group_id=${examGroupId}&limit=${limit}${gradeId ? `&grade_id=${gradeId}` : ""}${sectionId ? `&section_id=${sectionId}` : ""}`;
    apiRequest(`/results/toppers?${q}`)
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch((e) => { console.error(e); setRows([]); })
      .finally(() => setLoading(false));
  }, [examGroupId, limit, gradeId, sectionId]);

  const grades = useMemo(() => {
    const m = new Map(); sections.forEach((s) => m.set(s.grade_id, s.grade_name)); return [...m].map(([id, name]) => ({ id, name }));
  }, [sections]);
  const sectionOpts = sections.filter((s) => !gradeId || s.grade_id === gradeId);

  // equal percentage = equal rank
  const ranked = rows.map((r, i) => ({ ...r, rank: i > 0 && Number(r.percentage) === Number(rows[i - 1].percentage) ? null : i + 1 }));
  ranked.forEach((r, i) => { if (r.rank === null) r.rank = ranked[i - 1].rank; });
  const podium = ranked.slice(0, 3).map((s) => ({ id: s.student_id, name: s.student_name, photo_url: s.photo_url, sub: `${s.grade_name} - ${s.section_name}`, percentage: s.percentage, grade: s.grade }));
  const scope = sectionId ? sectionOpts.find((s) => s.section_id === sectionId) : null;
  const title = scope ? `${scope.grade_name} - ${scope.section_name} Leaderboard` : gradeId ? `${grades.find((g) => g.id === gradeId)?.name || "Class"} Leaderboard` : "School Leaderboard";

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 700 }}>{"\u{1F3C6}"} {title}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select className="select" style={{ width: 130 }} value={gradeId} onChange={(e) => { setGradeId(e.target.value); setSectionId(""); }}>
            <option value="">All Classes</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select className="select" style={{ width: 130 }} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All Sections</option>
            {sectionOpts.map((s) => <option key={s.section_id} value={s.section_id}>{gradeId ? s.section_name : `${s.grade_name} - ${s.section_name}`}</option>)}
          </select>
          <select className="select" style={{ width: 100 }} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[5, 10, 20, 50].map((v) => <option key={v} value={v}>Top {v}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 20 }}>Loading...</div>
      ) : !ranked.length ? (
        <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No passed students for this selection yet.</div>
      ) : (
        <>
          <Podium items={podium} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {ranked.map((s) => (
              <div key={s.student_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surfaceAlt, borderRadius: 12,
                border: `1px solid ${s.rank <= 3 ? C.yellow + "66" : C.border}` }}>
                <div className="syne" style={{ width: 34, textAlign: "center", fontWeight: 800, fontSize: s.rank <= 3 ? 20 : 14, color: C.textMuted }}>{s.rank <= 3 ? MEDAL[s.rank - 1] : s.rank}</div>
                <Avatar url={s.photo_url} name={s.student_name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.student_name}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>{s.grade_name} - {s.section_name}{s.roll_no ? ` \u00B7 Roll ${s.roll_no}` : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="syne" style={{ fontWeight: 800, fontSize: 16, color: C.primary }}>{s.percentage}%</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Grade {s.grade || "-"}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
