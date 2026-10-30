// @ts-nocheck
// Year-end promotion, one class-section at a time. Smart defaults (result based), one-tap actions, safe confirm.
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { ACTIONS, ActionPills, Chip, fullName, secLabel } from "./parts";

export const PromoteStudentsTab = ({ fromYear, toYear, overview, sectionId, onSectionChange, onChanged, onOpenSetup, onCopyStructure }) => {
  const { dialogConfirm, dialogAlert } = useDialog();
  const [data, setData] = useState(null);
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const sections = overview?.by_grade_section?.map((r) => ({ id: r.section_id, name: r.section_name, grade_id: r.grade_id, grade_name: r.grade_name })) || [];
  const pendingMap = useMemo(() => Object.fromEntries((overview?.by_grade_section || []).map((r) => [r.section_id, r.pending])), [overview]);

  const smart = (list, d) => {
    const out = {};
    list.forEach((s) => {
      const action = d.is_last_grade ? "graduate" : s.result_status === "fail" ? "retain" : "promote";
      out[s.student_id] = { enrolment_id: s.enrolment_id, action, to_section_id: action === "promote" ? (d.suggested_next_section?.id || "") : "", roll_no: s.roll_no || "", reason: "" };
    });
    return out;
  };

  const load = async () => {
    if (!sectionId || !fromYear || !toYear) return;
    setLoading(true); setResult(null); setError("");
    try {
      const res = await apiRequest(`/promotion/section-students?section_id=${sectionId}&academic_year_id=${fromYear.id}&to_academic_year_id=${toYear.id}`);
      const d = res?.data; setData(d); setRows(smart(d.students || [], d));
    } catch (e) { setData(null); setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [sectionId, fromYear?.id, toYear?.id]); // eslint-disable-line

  const setRow = (id, patch) => setRows((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  const setAll = (fn) => setRows((p) => { const n = {}; Object.keys(p).forEach((id) => { n[id] = { ...p[id], ...fn(p[id], id) }; }); return n; });

  const counts = useMemo(() => { const c = { promote: 0, retain: 0, tc: 0, graduate: 0 }; Object.values(rows).forEach((r) => { c[r.action] = (c[r.action] || 0) + 1; }); return c; }, [rows]);
  const toSecs = data?.to_sections || [];
  const gid = (v) => String(v || "").toLowerCase();
  // promotion always goes to the NEXT class; the admin only picks the section
  const nextSecs = data?.next_grade ? toSecs.filter((t) => gid(t.grade_id) === gid(data.next_grade.id)) : [];
  const sameSecs = data ? toSecs.filter((t) => gid(t.grade_id) === gid(data.section.grade_id)) : [];
  const nextPending = sections.find((s) => s.id !== sectionId && pendingMap[s.id] > 0);

  const submit = async () => {
    const list = data?.students || [];
    const bad = list.find((s) => { const r = rows[s.student_id]; return r.action === "promote" && !r.to_section_id || r.action === "retain" && !data.retain_section && !r.to_section_id; });
    if (bad) { setError(`Choose the target section for ${fullName(bad)}.`); return; }
    const exits = counts.tc + counts.graduate;
    const msg = `Process ${list.length} students of ${secLabel({ grade_name: data.section.grade_name, name: data.section.name })} into ${toYear.name}?\n\n`
      + `Promote: ${counts.promote}   Retain: ${counts.retain}   TC: ${counts.tc}   Graduate: ${counts.graduate}`
      + (exits ? `\n\n${exits} student(s) will be marked as left and their Student App login will be switched off.` : "");
    if (!(await dialogConfirm(msg, "Confirm promotion"))) return;
    setSaving(true); setError("");
    try {
      const actions = list.map((s) => { const r = rows[s.student_id];
        return { student_id: s.student_id, enrolment_id: r.enrolment_id, action: r.action, to_section_id: r.action === "promote" ? r.to_section_id : (r.action === "retain" && !data.retain_section && r.to_section_id ? r.to_section_id : undefined), roll_no: r.roll_no, reason: r.reason }; });
      const res = await apiRequest("/promotion/run", "POST", { from_academic_year_id: fromYear.id, to_academic_year_id: toYear.id, actions });
      setResult({ ...res.data, names: Object.fromEntries(list.map((s) => [s.student_id, fullName(s)])) });
      setData(null); setRows({}); onChanged?.();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  if (!toYear) return <div className="card"><EmptyState icon="calendar" title="Select the To session" sub="Choose the session students will move into, at the top of this page." /></div>;
  if (toYear.noSections) return (
    <div className="card"><EmptyState icon="setup" title={`No classes in ${toYear.name} yet`} sub="Create the classes and sections of the new session in School Setup first. Students are placed into those sections."
      action={<div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}><button className="btn btn-primary" onClick={onCopyStructure}>Copy structure from another session</button><button className="btn btn-ghost" onClick={onOpenSetup}>Open School Setup</button></div>} /></div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>{error}</div>}

      {!sectionId && !result && (
        <div className="card"><EmptyState icon="students" title={sections.length ? "Select a class" : "No classes found"}
          sub={sections.length ? "Choose the class and section from the Class selector at the top of this page." : `There are no class-sections in ${fromYear?.name || "the From session"}.`} /></div>
      )}

      {result && (
        <div className="card" style={{ borderColor: `${C.green}66` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.green}22`, color: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={18} /></div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Done</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: result.skipped?.length ? 12 : 0 }}>
            <Chip color={C.green}>{result.counts.promoted} promoted</Chip><Chip color={C.yellow}>{result.counts.retained} retained</Chip>
            <Chip color={C.red}>{result.counts.tc} TC</Chip><Chip color={C.blue}>{result.counts.graduated} graduated</Chip>
            {result.counts.skipped > 0 && <Chip color={C.textMuted}>{result.counts.skipped} skipped</Chip>}
          </div>
          {result.skipped?.length > 0 && (
            <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.7 }}>
              {result.skipped.slice(0, 8).map((s, i) => <div key={i}>• <b style={{ color: C.text }}>{result.names[s.student_id] || "Student"}</b>: {s.reason}</div>)}
              {result.skipped.length > 8 && <div>…and {result.skipped.length - 8} more</div>}
            </div>
          )}
          {nextPending && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => { onSectionChange(nextPending.id); setResult(null); }}>Next: {secLabel(nextPending)} <Icon name="arrow_right" size={13} /></button>}
        </div>
      )}

      {loading ? <div className="pulse" style={{ padding: 50, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading students…</div>
        : data && (data.students.length === 0
          ? <div className="card"><EmptyState icon="check" title="All students of this section are processed" sub="Pick another class from the selector at the top." /></div>
          : (<>
            {!data.is_last_grade && nextSecs.length === 0 && (
              <div className="card" style={{ padding: "12px 16px", fontSize: 13, color: C.yellow, fontWeight: 600, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 220 }}>{toYear.name} has no sections for {data.next_grade?.name}. Add them first to promote this class.</span>
                <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={onCopyStructure}>Copy structure</button>
                <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={onOpenSetup}>Open School Setup</button>
              </div>
            )}
            <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "12px 16px" }}>
              <div style={{ fontWeight: 800 }}>{secLabel({ grade_name: data.section.grade_name, name: data.section.name })}</div>
              <Chip color={C.textMuted}>{data.students.length} students</Chip>
              {data.is_last_grade && <Chip color={C.blue}>Last class: graduate</Chip>}
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setRows(smart(data.students, data))}>Smart defaults</button>
              <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setAll(() => ({ action: "promote", to_section_id: data.suggested_next_section?.id || "" }))}>All promote</button>
              <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={() => setAll(() => ({ action: "retain", to_section_id: "" }))}>All retain</button>
              {!data.is_last_grade && (
                <>
                  <Chip color={C.primary}>Promote to {data.next_grade?.name} ({toYear.name})</Chip>
                  <select className="select" style={{ width: 150 }} value="" disabled={!nextSecs.length}
                    onChange={(e) => e.target.value && setAll((r) => (r.action === "promote" ? { to_section_id: e.target.value } : {}))}>
                    <option value="">Section for all...</option>
                    {nextSecs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.students.map((s) => {
                const r = rows[s.student_id] || {};
                const failed = s.result_status === "fail";
                return (
                  <div key={s.student_id} className="card" style={{ padding: "12px 16px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <Avatar teacher={{ avatar_url: s.photo_url, full_name: fullName(s), gender: s.gender }} size={40} />
                    <div style={{ flex: "1 1 190px", minWidth: 170 }}>
                      <div style={{ fontWeight: 700 }}>{fullName(s)}</div>
                      <div style={{ fontSize: 12, color: C.textMuted, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                        <span>Adm# {s.admission_no}</span><span>Roll {s.roll_no || "—"}</span>
                        {s.percentage != null ? <span style={{ color: failed ? C.red : C.green, fontWeight: 700 }}>{s.percentage}% {s.result_grade || ""} · {failed ? "Fail" : "Pass"}</span> : <span>No result</span>}
                      </div>
                    </div>
                    <ActionPills value={r.action} onChange={(a) => setRow(s.student_id, { action: a, to_section_id: a === "promote" ? (data.suggested_next_section?.id || "") : "" })} />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: "1 1 250px", justifyContent: "flex-end" }}>
                      {(r.action === "promote" || (r.action === "retain" && !data.retain_section)) && (
                        <select className="select" style={{ width: 170 }} value={r.to_section_id || ""} onChange={(e) => setRow(s.student_id, { to_section_id: e.target.value })}>
                          <option value="">{r.action === "promote" ? `${data.next_grade?.name || "Next class"} section...` : "Section..."}</option>
                          {(r.action === "retain" ? sameSecs : nextSecs).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.enrolled}{t.max_strength ? `/${t.max_strength}` : ""})</option>)}
                        </select>
                      )}
                      {r.action === "retain" && data.retain_section && <Chip color={C.yellow}>Stays in {secLabel(data.retain_section)}</Chip>}
                      {(r.action === "promote" || r.action === "retain") && <input className="input" style={{ width: 80 }} placeholder="Roll: auto" value={r.roll_no || ""} onChange={(e) => setRow(s.student_id, { roll_no: e.target.value })} />}
                      {(r.action === "tc" || r.action === "graduate") && <input className="input" style={{ width: 210 }} placeholder="Reason (optional)" value={r.reason || ""} onChange={(e) => setRow(s.student_id, { reason: e.target.value })} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ position: "sticky", bottom: 0, zIndex: 5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", boxShadow: "0 -6px 24px rgba(0,0,0,.18)" }}>
              {ACTIONS.map((a) => counts[a.id] > 0 && <Chip key={a.id} color={a.color}>{counts[a.id]} {a.label.toLowerCase()}</Chip>)}
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary" disabled={saving} onClick={submit} style={{ minWidth: 190 }}>{saving ? "Processing…" : `Confirm ${data.students.length} students`}</button>
            </div>
          </>))}
    </div>
  );
};
