// @ts-nocheck
// Subjects per class / section. "Save for Class" applies one list to every section; "Save for A" only to that section.
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

const up = (v) => String(v).toUpperCase();
const unionOf = (m, secs) => { const u = new Set(); secs.forEach((s) => (m[up(s.id)] || new Set()).forEach((x) => u.add(x))); return u; };
const sameSets = (m, secs) => {
  if (secs.length < 2) return true;
  const key = (s) => [...(m[up(s.id)] || [])].sort().join();
  const f = key(secs[0]);
  return secs.every((s) => key(s) === f);
};

export const SubjectsClassLevelTab = ({ grades, subjects }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [gradeId, setGradeId] = useState("");
  const [sections, setSections] = useState([]);
  const [map, setMap] = useState({}); // SECTION_ID -> Set(SUBJECT_ID) as saved
  const [view, setView] = useState("class"); // "class" or a section id
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const grade = grades.find((g) => g.id === gradeId);

  useEffect(() => { if (grades.length && !gradeId) setGradeId(grades[0].id); }, [grades]); // eslint-disable-line

  const load = async (keepView) => {
    if (!gradeId) return;
    setLoading(true);
    try {
      const [sRes, yRes, mRes] = await Promise.all([
        apiRequest(`/setup/sections?grade_id=${gradeId}`),
        apiRequest("/setup/academic-years").catch(() => ({ data: [] })),
        apiRequest(`/setup/section-subjects?grade_id=${gradeId}`),
      ]);
      let secs = Array.isArray(sRes?.data) ? sRes.data : [];
      const cur = (Array.isArray(yRes?.data) ? yRes.data : []).find((y) => y.is_current);
      const inYear = cur ? secs.filter((s) => up(s.academic_year_id) === up(cur.id)) : secs;
      secs = (inYear.length ? inYear : secs).filter((s) => s.is_active !== false && s.is_active !== 0);
      const m = {};
      (Array.isArray(mRes?.data) ? mRes.data : []).forEach((r) => { (m[up(r.section_id)] = m[up(r.section_id)] || new Set()).add(up(r.subject_id)); });
      const v = keepView && keepView !== "class" && secs.some((s) => s.id === keepView) ? keepView : "class";
      setSections(secs); setMap(m); setView(v);
      setSelected(v === "class" ? unionOf(m, secs) : new Set(m[up(v)] || []));
    } catch (e) {
      console.error(e); setSections([]); setMap({}); setSelected(new Set());
    } finally { setLoading(false); }
  };
  useEffect(() => { setView("class"); load(); }, [gradeId]); // eslint-disable-line

  const pick = (v) => { setView(v); setSelected(v === "class" ? unionOf(map, sections) : new Set(map[up(v)] || [])); };
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); const k = up(id); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const save = async (targets, label) => {
    let removed = 0;
    targets.forEach((s) => (map[up(s.id)] || new Set()).forEach((x) => { if (!selected.has(x)) removed++; }));
    const parts = [];
    if (targets.length > 1 && !sameSets(map, targets)) parts.push("The sections of this class currently have different subjects. Saving will make them identical.");
    if (removed > 0) parts.push(`${removed} subject assignment(s) will be removed. They will also be removed from the timetable and teacher assignments of the affected section(s).`);
    if (parts.length && !(await dialogConfirm(`${parts.join("\n\n")}\n\nDo you want to continue?`, "Confirm Changes"))) return;
    setSaving(true);
    try {
      await apiRequest("/setup/section-subjects", "PUT", { grade_id: gradeId, section_ids: targets.map((s) => s.id), subject_ids: [...selected] });
      await dialogAlert(`Subjects saved for ${label}.`, "Saved");
      await load(view);
    } catch (e) {
      await dialogAlert(e?.message || "Could not save subjects.", "Save Failed");
    } finally { setSaving(false); }
  };

  const viewLabel = view === "class" ? `${grade?.name || "Class"} (all sections)` : `${grade?.name || ""} - ${sections.find((s) => s.id === view)?.name || ""}`;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Subjects: {viewLabel}</div>
        <span className="badge">{selected.size} selected</span>
      </div>
      <FormRow label="Class">
        <select className="select" value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
          {grades.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
        </select>
      </FormRow>

      {sections.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          {[{ id: "class", name: "All Sections" }, ...sections].map((s) => (
            <button key={s.id} className={view === s.id ? "btn btn-primary" : "btn btn-ghost"} style={{ padding: "5px 14px", fontSize: 12 }} onClick={() => pick(s.id)}>{s.name}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 20, color: C.textMuted }}>Loading…</div>
      ) : sections.length === 0 ? (
        <div style={{ padding: 20, color: C.textMuted }}>This class has no sections yet. Create a section first, then assign subjects.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8, margin: "12px 0 16px" }}>
          {subjects.map((s) => {
            const on = selected.has(up(s.id));
            return (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                border: `1px solid ${on ? C.primary : C.border}` }}>
                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} style={{ accentColor: C.primary }} />
                {s.name}
              </label>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
        {sections.map((s) => (
          <button key={s.id} className="btn btn-ghost" disabled={saving || loading} onClick={() => save([s], `${grade?.name || ""} - ${s.name}`)}>Save for {s.name}</button>
        ))}
        <button className="btn btn-primary" disabled={saving || loading || !sections.length} onClick={() => save(sections, `${grade?.name || "the class"} (all sections)`)}>
          {saving ? "Saving…" : `Save for ${grade?.name || "Class"}`}
        </button>
      </div>
    </div>
  );
};
