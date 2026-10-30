// @ts-nocheck
// Move a student to another section of the SAME class in the same session (no new history row, only the section changes).
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { SectionCard } from "../../components/ui/SectionCard";
import { C } from "../../theme/theme";
import { Chip, SectionChips, fullName, secLabel } from "./parts";

export const SectionTransferTab = ({ year }) => {
  const [sections, setSections] = useState([]);
  const [fromId, setFromId] = useState("");
  const [students, setStudents] = useState([]);
  const [moves, setMoves] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState(null); // {ok, text}

  useEffect(() => {
    setFromId(""); setStudents([]);
    if (!year) return;
    apiRequest(`/setup/sections?academic_year_id=${year.id}`).then((r) => setSections(Array.isArray(r?.data) ? r.data : [])).catch(() => setSections([]));
  }, [year?.id]);

  useEffect(() => {
    if (!fromId || !year) return;
    setLoading(true); setNote(null);
    apiRequest(`/promotion/section-students?section_id=${fromId}&academic_year_id=${year.id}`)
      .then((r) => { const list = r?.data?.students || []; setStudents(list); setMoves(Object.fromEntries(list.map((s) => [s.student_id, { to: "", roll: "", enrolment_id: s.enrolment_id }]))); })
      .catch((e) => setNote({ ok: false, text: e.message })).finally(() => setLoading(false));
  }, [fromId, year?.id]);

  const from = sections.find((s) => s.id === fromId);
  const targets = sections.filter((s) => from && s.id !== fromId && s.grade_id === from.grade_id);
  const setMove = (id, patch) => setMoves((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const move = async (s) => {
    const m = moves[s.student_id]; if (!m?.to) return;
    setBusy(s.student_id); setNote(null);
    try {
      const r = await apiRequest("/promotion/section-change", "POST", { student_id: s.student_id, enrolment_id: m.enrolment_id, to_section_id: m.to, roll_no: m.roll });
      setStudents((p) => p.filter((x) => x.student_id !== s.student_id));
      setNote({ ok: true, text: `${fullName(s)} moved to ${secLabel(sections.find((x) => x.id === m.to))} (roll ${r?.data?.roll_no || "auto"}).` });
    } catch (e) { setNote({ ok: false, text: e.message }); } finally { setBusy(""); }
  };

  if (!year) return <div className="card"><EmptyState icon="calendar" title="Select a session" sub="Choose the session at the top of this page." /></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard icon="refresh" title="Section transfer" sub={`Within ${year.name}: move a student to another section of the same class.`}>
        {sections.length ? <SectionChips sections={sections} value={fromId} onChange={setFromId} /> : <div style={{ color: C.textMuted, fontSize: 13 }}>No sections in this session.</div>}
      </SectionCard>
      {note && <div style={{ fontSize: 13, fontWeight: 600, color: note.ok ? C.green : C.red }}>{note.text}</div>}
      {loading ? <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading…</div>
        : fromId && (students.length === 0
          ? <div className="card"><EmptyState icon="students" title="No active students in this section" sub="Pick another section." /></div>
          : targets.length === 0
            ? <div className="card"><EmptyState icon="warning" title="No other section of this class" sub="Create another section for this class in School Setup to transfer students." /></div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {students.map((s) => (
                  <div key={s.student_id} className="card" style={{ padding: "12px 16px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <Avatar teacher={{ avatar_url: s.photo_url, full_name: fullName(s), gender: s.gender }} size={40} />
                    <div style={{ flex: "1 1 180px" }}>
                      <div style={{ fontWeight: 700 }}>{fullName(s)}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>Adm# {s.admission_no} · Roll {s.roll_no || "—"}</div>
                    </div>
                    <Chip color={C.textMuted}>{secLabel(from)}</Chip>
                    <Icon name="arrow_right" size={15} />
                    <select className="select" style={{ width: 170 }} value={moves[s.student_id]?.to || ""} onChange={(e) => setMove(s.student_id, { to: e.target.value })}>
                      <option value="">Move to…</option>
                      {targets.map((t) => <option key={t.id} value={t.id}>{t.name}{t.student_count != null ? ` (${t.student_count})` : ""}</option>)}
                    </select>
                    <input className="input" style={{ width: 90 }} placeholder="Roll: auto" value={moves[s.student_id]?.roll || ""} onChange={(e) => setMove(s.student_id, { roll: e.target.value })} />
                    <button className="btn btn-primary" style={{ padding: "8px 16px" }} disabled={!moves[s.student_id]?.to || busy === s.student_id} onClick={() => move(s)}>{busy === s.student_id ? "Moving…" : "Move"}</button>
                  </div>
                ))}
              </div>
            ))}
    </div>
  );
};
