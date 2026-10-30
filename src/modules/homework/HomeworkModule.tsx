// FILE: teacher-app/src/modules/homework/HomeworkModule.tsx
// Source: admin App.tsx -> HomeworkModule [21575-21993]
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { DocLink } from "../../components/ui/DocLink";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { useSession } from "../../contexts/SessionContext";
import { C } from "../../theme/theme";
import { todayISO } from "../../utils/date";

// ═══════════════════════════════════════════════════════════════
// HOMEWORK MODULE — Library-style, SaaS-aware, real backend (Azure SQL + Blob)
// ═══════════════════════════════════════════════════════════════
export const HomeworkModule = ({ school }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const { currentYear } = useSession();

  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);

  const [viewState, setViewState] = useState("classes"); // classes -> list
  const [activeClass, setActiveClass] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState("ALL");

  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit

  const [showAttachments, setShowAttachments] = useState(false);
  const [activeAttachments, setActiveAttachments] = useState([]);
  const [activeHwTitle, setActiveHwTitle] = useState("");

  // ── Editor form state ──
  const [form, setForm] = useState({ title: "", description: "", given_date: todayISO(), due_date: "" });
  const [targets, setTargets] = useState([]); // [{section_id, section_name, class_name, subject_id, subject_name}]
  const [pickGrade, setPickGrade] = useState("");
  const [pickSection, setPickSection] = useState("");
  const [pickSubject, setPickSubject] = useState("");
  const [gradeSubjects, setGradeSubjects] = useState([]);
  const [loadingGradeSubjects, setLoadingGradeSubjects] = useState(false);
  const [files, setFiles] = useState([]);

  // ── Initial load: grades + sections + homework list (school-wide, SaaS scoped by JWT) ──
  const loadBase = React.useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, secRes, hwRes] = await Promise.all([
        apiRequest("/setup/grades"),
        apiRequest(`/setup/sections${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`),
        apiRequest("/homework"),
      ]);
      setGrades(gRes?.data || []);
      setSections(secRes?.data || []);
      setHomeworks(Array.isArray(hwRes?.data) ? hwRes.data : []);
    } catch (e) {
      dialogAlert("Failed to load homework data: " + e.message, "Sync Error");
    } finally {
      setLoading(false);
    }
  }, [dialogAlert, currentYear?.id]);

  // session badalne par naye session me na hone wala section hata do
  useEffect(() => {
    if (pickSection && !sections.some((s) => s.id === pickSection)) setPickSection("");
  }, [sections]); // eslint-disable-line

  useEffect(() => { loadBase(); }, [loadBase]);

  // ── Auto-fetch subjects for the grade picked inside the target-builder ──
  useEffect(() => {
    if (!pickGrade) { setGradeSubjects([]); setPickSubject(""); return; }
    setLoadingGradeSubjects(true);
    apiRequest(`/setup/grade-subjects?grade_id=${pickGrade}`)
      .then((res) => setGradeSubjects(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setGradeSubjects([]))
      .finally(() => setLoadingGradeSubjects(false));
  }, [pickGrade]);

  const filteredSectionsForPick = sections.filter((s) => s.grade_id === pickGrade);

  // ── KPIs ──
  const kpis = React.useMemo(() => {
    const total = homeworks.length;
    const visible = homeworks.filter((h) => h.is_visible).length;
    const hidden = total - visible;
    const attachments = homeworks.reduce((sum, h) => sum + (h.attachments?.length || 0), 0);
    return { total, visible, hidden, attachments };
  }, [homeworks]);

  // ── Library hierarchy: group by class_name (a homework can appear in multiple classes) ──
  const classMap = React.useMemo(() => {
    const map = {};
    homeworks.forEach((hw) => {
      const seen = new Set();
      (hw.targets || []).forEach((t) => {
        const cls = t.class_name || "General";
        if (seen.has(cls)) return;
        seen.add(cls);
        if (!map[cls]) map[cls] = [];
        map[cls].push(hw);
      });
    });
    return map;
  }, [homeworks]);

  const classSubjectsInView = React.useMemo(() => {
    if (!activeClass) return [];
    const set = new Set();
    (classMap[activeClass] || []).forEach((hw) =>
      (hw.targets || []).filter((t) => t.class_name === activeClass).forEach((t) => t.subject_name && set.add(t.subject_name))
    );
    return Array.from(set).sort();
  }, [activeClass, classMap]);

  const listInView = React.useMemo(() => {
    if (!activeClass) return [];
    let list = classMap[activeClass] || [];
    if (subjectFilter !== "ALL") {
      list = list.filter((hw) => (hw.targets || []).some((t) => t.class_name === activeClass && t.subject_name === subjectFilter));
    }
    return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [activeClass, subjectFilter, classMap]);

  // ── Editor helpers ──
  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", given_date: todayISO(), due_date: "" });
    setTargets([]);
    setPickGrade(""); setPickSection(""); setPickSubject("");
    setFiles([]);
    setShowEditor(true);
  };

  const openEdit = (hw) => {
    setEditing(hw);
    setForm({ title: hw.title, description: hw.description || "", given_date: hw.given_date?.slice(0, 10) || todayISO(), due_date: hw.due_date?.slice(0, 10) || "" });
    setTargets((hw.targets || []).map((t) => ({ section_id: t.section_id, section_name: t.section_name, class_name: t.class_name, subject_id: t.subject_id, subject_name: t.subject_name })));
    setPickGrade(""); setPickSection(""); setPickSubject("");
    setFiles([]);
    setShowEditor(true);
  };

  const addTarget = () => {
    if (!pickGrade || !pickSection) return dialogAlert("Select Class and Section first.", "Missing Selection");
    const grade = grades.find((g) => g.id === pickGrade);
    const section = sections.find((s) => s.id === pickSection);
    const subject = gradeSubjects.find((s) => s.id === pickSubject);
    const key = `${pickSection}_${pickSubject || "ALL"}`;
    if (targets.some((t) => `${t.section_id}_${t.subject_id || "ALL"}` === key)) {
      return dialogAlert("This class/section + subject is already added.", "Duplicate");
    }
    setTargets((prev) => [...prev, {
      section_id: pickSection,
      section_name: section?.name || "",
      class_name: grade?.name || "",
      subject_id: pickSubject || null,
      subject_name: subject?.name || "All Subjects",
    }]);
    setPickSection(""); setPickSubject("");
  };

  const removeTarget = (idx) => setTargets((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.title.trim()) return dialogAlert("Homework title is required.", "Missing Info");
    if (targets.length === 0) return dialogAlert("Add at least one Class/Section target.", "Missing Target");

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("given_date", form.given_date);
      fd.append("due_date", form.due_date || "");
      fd.append("targets", JSON.stringify(targets.map((t) => ({ section_id: t.section_id, subject_id: t.subject_id }))));
      files.forEach((f) => fd.append("files", f));

      if (editing) {
        await apiRequest(`/homework/${editing.id}`, "PUT", fd, true);
        await dialogAlert("Homework updated successfully.", "Saved");
      } else {
        await apiRequest("/homework", "POST", fd, true);
        await dialogAlert("Homework assigned successfully.", "Published");
      }
      setShowEditor(false);
      loadBase();
    } catch (e) {
      dialogAlert("Save failed: " + e.message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (hw) => {
    const nextVal = !hw.is_visible;
    setHomeworks((prev) => prev.map((h) => (h.id === hw.id ? { ...h, is_visible: nextVal } : h)));
    try {
      await apiRequest(`/homework/${hw.id}/visibility`, "PATCH", { is_visible: nextVal });
    } catch (e) {
      dialogAlert("Visibility toggle failed.", "Error");
      loadBase();
    }
  };

  const handleDelete = async (hw) => {
    if (!(await dialogConfirm(`Permanently delete "${hw.title}"? This also removes its files.`, "Delete Homework"))) return;
    try {
      setHomeworks((prev) => prev.filter((h) => h.id !== hw.id));
      await apiRequest(`/homework/${hw.id}`, "DELETE");
    } catch (e) {
      dialogAlert("Delete failed: " + e.message, "Error");
      loadBase();
    }
  };

  const dueBadge = (due_date) => {
    if (!due_date) return { label: "No Deadline", color: C.textMuted };
    const diff = Math.ceil((new Date(due_date) - new Date(todayISO())) / 86400000);
    if (diff < 0) return { label: "Overdue", color: C.red };
    if (diff === 0) return { label: "Due Today", color: C.yellow };
    if (diff <= 2) return { label: `Due in ${diff}d`, color: C.yellow };
    return { label: `Due in ${diff}d`, color: C.green };
  };

  // ── RENDER: Classes grid (library home) ──
  const renderClasses = () => {
    if (loading) return <div className="card pulse" style={{ padding: 60, textAlign: "center", color: C.primary }}>Loading Homework Library...</div>;
    const classes = Object.keys(classMap).sort();
    if (classes.length === 0) return <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No homework assigned yet. Create one to begin.</div>;

    const gradients = [
      `linear-gradient(135deg, ${C.blue}, #7c3aed)`, `linear-gradient(135deg, ${C.green}, #10b981)`,
      `linear-gradient(135deg, ${C.red}, #f97316)`, `linear-gradient(135deg, ${C.yellow}, #fbbf24)`,
      `linear-gradient(135deg, ${C.purple || "#8b5cf6"}, ${C.primary})`,
    ];

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }} className="slide-in">
        {classes.map((cls, i) => (
          <div key={cls}
            style={{ background: gradients[i % gradients.length], borderRadius: 24, padding: 24, color: "white", cursor: "pointer", position: "relative", overflow: "hidden", minHeight: 170, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
            onClick={() => { setActiveClass(cls); setSubjectFilter("ALL"); setViewState("list"); }}>
            <div style={{ position: "absolute", bottom: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            <div style={{ position: "relative", zIndex: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.2)", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}><Icon name="homework" size={22} color="white" /></div>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{classMap[cls].length} Assigned</span>
              </div>
              <h3 className="syne" style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{cls}</h3>
              <p style={{ fontSize: 12, opacity: 0.85, marginTop: 4, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>View Homework <Icon name="arrow_right" size={12} /></p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── RENDER: Homework list for a class (with subject filter chips) ──
  const renderList = () => (
    <div className="slide-in pb-10">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, background: C.surfaceAlt, padding: "12px 16px", borderRadius: 16, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" style={{ padding: "8px 12px", background: C.surface }} onClick={() => { setViewState("classes"); setActiveClass(null); }}>
          <Icon name="arrow_right" size={14} style={{ transform: "rotate(180deg)" }} />
        </button>
        <div style={{ flex: 1, minWidth: 160 }}>
          <h2 className="syne" style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>{activeClass}</h2>
          <p style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "2px 0 0 0" }}>{listInView.length} Homework Items</p>
        </div>
        <select className="select" style={{ fontSize: 12, maxWidth: 200 }} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="ALL">All Subjects</option>
          {classSubjectsInView.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {listInView.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.textMuted }}>No homework matches this filter.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {listInView.map((hw) => {
            const badge = dueBadge(hw.due_date);
            const relevantTargets = (hw.targets || []).filter((t) => t.class_name === activeClass);
            return (
              <div key={hw.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", opacity: hw.is_visible ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, paddingRight: 10 }}>
                    <h5 style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{hw.title}</h5>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, marginTop: 4 }}>By {hw.teacher_name || "—"}</p>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: `${badge.color}22`, color: badge.color, border: `1px solid ${badge.color}44`, whiteSpace: "nowrap" }}>{badge.label}</span>
                </div>

                {hw.description && <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 10px 0", lineHeight: 1.4 }}>{hw.description}</p>}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {relevantTargets.map((t, i) => (
                    <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}33` }}>
                      {t.section_name} • {t.subject_name}
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surfaceAlt, padding: "8px 12px", borderRadius: 10, marginBottom: 12, border: `1px solid ${C.border}` }}>
                  <button className="btn btn-ghost" style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() => { setActiveAttachments(hw.attachments || []); setActiveHwTitle(hw.title); setShowAttachments(true); }}>
                    <Icon name="file" size={12} color={C.primary} /> {hw.attachments?.length || 0} Files
                  </button>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="calendar" size={12} /> {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : "—"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${C.border}66` }}>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }} onClick={() => openEdit(hw)}>
                    <Icon name="edit" size={12} /> Edit
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: hw.is_visible ? C.green : C.textMuted }} onClick={() => handleToggleVisibility(hw)}>
                    <Icon name="eye" size={12} /> {hw.is_visible ? "Visible" : "Hidden"}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "6px 10px", color: C.red }} onClick={() => handleDelete(hw)}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Homework Library</h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Organised by class — assign, manage visibility, and track submissions from one place.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={openCreate}>
          <Icon name="plus" size={14} /> Assign Homework
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total Homework" value={kpis.total} icon="homework" color={C.primary} />
        <KpiCard label="Visible to Students" value={kpis.visible} icon="eye" color={C.green} />
        <KpiCard label="Hidden" value={kpis.hidden} icon="eye" color={C.textMuted} />
        <KpiCard label="Total Attachments" value={kpis.attachments} icon="file" color={C.blue} />
      </div>

      {viewState === "classes" ? renderClasses() : renderList()}

      {/* ── CREATE / EDIT MODAL ── */}
      <Modal open={showEditor} onClose={() => setShowEditor(false)} title={editing ? "Edit Homework" : "Assign New Homework"} width={680}>
        <FormRow label="Title">
          <input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Chapter 4 — Algebra Worksheet" />
        </FormRow>
        <FormRow label="Description">
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Instructions for students..." />
        </FormRow>
        <FormGrid cols={2}>
          <FormRow label="Given Date">
            <input className="input" type="date" value={form.given_date} onChange={(e) => setForm((p) => ({ ...p, given_date: e.target.value }))} />
          </FormRow>
          <FormRow label="Due Date">
            <input className="input" type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
          </FormRow>
        </FormGrid>

        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginTop: 6, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.primary, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Assign To (Class + Section + Subject)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <select className="select" style={{ flex: 1, minWidth: 120 }} value={pickGrade} onChange={(e) => { setPickGrade(e.target.value); setPickSection(""); }}>
              <option value="">Select Class</option>
              {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select className="select" style={{ flex: 1, minWidth: 120 }} value={pickSection} onChange={(e) => setPickSection(e.target.value)} disabled={!pickGrade}>
              <option value="">Select Section</option>
              {filteredSectionsForPick.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="select" style={{ flex: 1, minWidth: 140 }} value={pickSubject} onChange={(e) => setPickSubject(e.target.value)} disabled={!pickGrade || loadingGradeSubjects}>
              <option value="">{loadingGradeSubjects ? "Loading..." : "All Subjects"}</option>
              {gradeSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={addTarget} disabled={!pickGrade || !pickSection}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {targets.length === 0 && <span style={{ fontSize: 11, color: C.textMuted }}>No targets added yet.</span>}
            {targets.map((t, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20, background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}33`, display: "flex", alignItems: "center", gap: 6 }}>
                {t.class_name} {t.section_name} • {t.subject_name}
                <span style={{ cursor: "pointer", fontWeight: 900 }} onClick={() => removeTarget(i)}>×</span>
              </span>
            ))}
          </div>
        </div>

        <FormRow label={editing ? "Add More Files (optional)" : "Attachments"}>
          <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
            onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          {files.length > 0 && <p style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{files.length} file(s) selected</p>}
          {editing && editing.attachments?.length > 0 && (
            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{editing.attachments.length} existing file(s) will be kept.</p>
          )}
        </FormRow>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={() => setShowEditor(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Assign Homework"}
          </button>
        </div>
      </Modal>

      {/* ── ATTACHMENTS MODAL ── */}
      <Modal open={showAttachments} onClose={() => setShowAttachments(false)} title={`Files — ${activeHwTitle}`} width={480}>
        {activeAttachments.length === 0 ? (
          <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: 20 }}>No attachments for this homework.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeAttachments.map((f) => (
              <DocLink key={f.id} doc={{ url: f.file_url, name: f.file_name, mime: (f.mime_type || f.content_type || (String(f.file_type || "").toLowerCase() === "pdf" ? "application/pdf" : undefined)) }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.surfaceAlt, borderRadius: 10, border: `1px solid ${C.border}`, textDecoration: "none", color: C.text }}>
                <Icon name="file" size={16} color={C.primary} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file_name}</span>
                <Icon name="download" size={14} color={C.textMuted} />
              </DocLink>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
