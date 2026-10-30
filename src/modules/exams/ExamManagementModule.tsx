// FILE: teacher-app/src/modules/exams/ExamManagementModule.tsx
// Source: admin App.tsx -> ExamManagementModule [18337-18953]
// @ts-nocheck
import { useLocation as useLoc, useNavigate as useNav } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useSession } from "../../contexts/SessionContext";
import { ExamCard } from "./ExamCard";
import { ExamWorkspace } from "./ExamWorkspace";
import { GradingScaleTab } from "./GradingScaleTab";
import { EXAM_STATUS_META, EXAM_TYPES } from "./helpers";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// MAIN MODULE — overview list + create/edit exam + delete confirm
// ═══════════════════════════════════════════════════════════════
export const ExamManagementModule = () => {
  const [topTab, setTopTab] = useState("exams"); // 'exams' | 'grading'
  const [exams, setExams] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const { academicYears: academicYrs, currentYear } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'delete'
  const [selectedExam, setSelectedExam] = useState(null);
  const [workspaceExam, setWorkspaceExam] = useState(null);

  const blankForm = () => ({
    name: "",
    exam_type: "unit_test",
    academic_year_id: "",
    start_date: "",
    end_date: "",
    weightage_percent: 10,
    section_ids: [],
  });
  const [form, setForm] = useState(blankForm());
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadReq = useRef(0);
  const loadAll = async () => {
    const myReq = ++loadReq.current;
    setLoading(true);
    try {
      const [examRes, gRes, secRes] = await Promise.all([
        apiRequest(`/exams${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`),
        apiRequest("/setup/grades"),
        apiRequest(`/setup/sections${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`),
      ]);
      if (myReq !== loadReq.current) return; // stale response ignore
      setExams(Array.isArray(examRes?.data) ? examRes.data : []);
      setGrades(gRes?.data || []);
      setSections(secRes?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (myReq === loadReq.current) setLoading(false);
    }
  };
  useEffect(() => {
    // naye session me purane session ka exam workspace/modal khula na rahe
    setExams([]);
    setWorkspaceExam(null);
    setSelectedExam(null);
    setModal(null);
    loadAll();
  }, [currentYear?.id]); // eslint-disable-line

  // Deep link from the dashboard: /exams?exam=ID&admit=1 opens that exam's workspace (and the Admit Cards popup once)
  const deepLoc = useLoc();
  const deepNav = useNav();
  const [admitOnOpen, setAdmitOnOpen] = useState(false);
  const deepDone = useRef(false);
  useEffect(() => {
    if (deepDone.current || !exams.length) return;
    deepDone.current = true;
    const qp = new URLSearchParams(deepLoc.search);
    const ex = exams.find((x) => x.id === qp.get("exam"));
    if (ex) { setWorkspaceExam(ex); setAdmitOnOpen(qp.get("admit") === "1"); deepNav(deepLoc.pathname, { replace: true }); }
  }, [exams]); // eslint-disable-line

  

  const filteredExams = exams.filter((e) => {
    const matchStatus = !filterStatus || e.status === filterStatus;
    const matchType = !filterType || e.exam_type === filterType;
    return matchStatus && matchType;
  });

  // ── Open modals ──────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...blankForm(), academic_year_id: currentYear?.id || "" });
    setSelectedExam(null);
    setModal("create");
  };

  const openEdit = (exam) => {
    setForm({
      name: exam.name,
      exam_type: exam.exam_type,
      academic_year_id: exam.academic_year_id,
      start_date: exam.start_date?.split("T")[0] || "",
      end_date: exam.end_date?.split("T")[0] || "",
      weightage_percent: exam.weightage_percent,
      section_ids: exam.section_ids || [],
    });
    setSelectedExam(exam);
    setModal("edit");
  };

  const openDelete = (exam) => {
    setSelectedExam(exam);
    setModal("delete");
  };

  // ── Save ─────────────────────────────────────────────────────
  const toggleSection = (sectionId) => {
    setForm((f) => ({
      ...f,
      section_ids: f.section_ids.includes(sectionId)
        ? f.section_ids.filter((id) => id !== sectionId)
        : [...f.section_ids, sectionId],
    }));
  };

  const toggleWholeGrade = (gradeId, gradeSections) => {
    const allSelected = gradeSections.every((s) =>
      form.section_ids.includes(s.id)
    );
    setForm((f) => ({
      ...f,
      section_ids: allSelected
        ? f.section_ids.filter((id) => !gradeSections.some((s) => s.id === id))
        : Array.from(
            new Set([...f.section_ids, ...gradeSections.map((s) => s.id)])
          ),
    }));
  };

  const handleSave = async () => {
    if (
      !form.name ||
      !form.academic_year_id ||
      !form.start_date ||
      !form.end_date
    ) {
      alert("Name, academic year, start date and end date are required.");
      return;
    }
    if (form.section_ids.length === 0) {
      alert("Select at least one class/section for this exam.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        exam_type: form.exam_type,
        academic_year_id: form.academic_year_id,
        start_date: form.start_date,
        end_date: form.end_date,
        weightage_percent: Number(form.weightage_percent) || 0,
      };
      let examId = selectedExam?.id;
      if (modal === "edit" && examId) {
        await apiRequest(`/exams/${examId}`, "PUT", payload);
      } else {
        const res = await apiRequest("/exams", "POST", payload);
        examId = res?.data?.id;
      }
      await apiRequest(`/exams/${examId}/classes`, "PUT", {
        section_ids: form.section_ids,
      });
      setModal(null);
      await loadAll();
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExam) return;
    setSaving(true);
    try {
      await apiRequest(`/exams/${selectedExam.id}`, "DELETE");
      setModal(null);
      await loadAll();
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async (exam, publish) => {
    try {
      await apiRequest(
        `/exams/${exam.id}/${publish ? "publish" : "unpublish"}`,
        "PUT"
      );
      await loadAll();
    } catch (e) {
      alert("Failed: " + e.message);
    }
  };

  // 🔴 Create/Edit form body — called as a plain function {ExamFormBody()},
  // never as a JSX component, so typing the exam name never loses focus.
  const ExamFormBody = () => (
    <div>
      <FormGrid cols={2}>
        <FormRow label="Exam Name *">
          <input
            className="input"
            placeholder="e.g. Half Yearly Examination"
            value={form.name}
            onChange={(e) => setF("name", e.target.value)}
          />
        </FormRow>
        <FormRow label="Exam Type *">
          <select
            className="select"
            value={form.exam_type}
            onChange={(e) => setF("exam_type", e.target.value)}
          >
            {EXAM_TYPES.map((t) => (
              <option key={t.v} value={t.v}>
                {t.l}
              </option>
            ))}
          </select>
        </FormRow>
      </FormGrid>
      <FormGrid cols={3}>
        <FormRow label="Academic Year *">
          <select
            className="select"
            value={form.academic_year_id}
            onChange={(e) => setF("academic_year_id", e.target.value)}
          >
            <option value="">-- Select --</option>
            {academicYrs.map((ay) => (
              <option key={ay.id} value={ay.id}>
                {ay.name}
                {ay.is_current ? " (Current)" : ""}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Start Date *">
          <input
            className="input"
            type="date"
            value={form.start_date}
            onChange={(e) => setF("start_date", e.target.value)}
          />
        </FormRow>
        <FormRow label="End Date *">
          <input
            className="input"
            type="date"
            value={form.end_date}
            onChange={(e) => setF("end_date", e.target.value)}
          />
        </FormRow>
      </FormGrid>
      <FormRow label="Weightage in Final Result (%)">
        <select
          className="select"
          style={{ maxWidth: 160 }}
          value={form.weightage_percent}
          onChange={(e) => setF("weightage_percent", e.target.value)}
        >
          {[5, 10, 15, 20, 25, 30, 40, 50, 100].map((v) => (
            <option key={v} value={v}>
              {v}%
            </option>
          ))}
        </select>
      </FormRow>

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: C.textMuted,
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 10,
            letterSpacing: "0.5px",
          }}
        >
          Select Participating Classes
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
            gap: 10,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {grades.map((g) => {
            const gradeSections = sections.filter((s) => s.grade_id === g.id);
            if (gradeSections.length === 0) return null;
            const allSelected = gradeSections.every((s) =>
              form.section_ids.includes(s.id)
            );
            return (
              <div
                key={g.id}
                style={{
                  background: C.surfaceAlt,
                  borderRadius: 10,
                  padding: 10,
                  border: `1px solid ${C.border}`,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    marginBottom: 8,
                    fontWeight: 700,
                    fontSize: 12.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleWholeGrade(g.id, gradeSections)}
                    style={{ accentColor: C.primary }}
                  />
                  {g.name}
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {gradeSections.map((s) => (
                    <label
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11.5,
                        padding: "3px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: form.section_ids.includes(s.id)
                          ? `${C.primary}22`
                          : C.surface,
                        color: form.section_ids.includes(s.id)
                          ? C.primary
                          : C.textMuted,
                        border: `1px solid ${
                          form.section_ids.includes(s.id) ? C.primary : C.border
                        }`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.section_ids.includes(s.id)}
                        onChange={() => toggleSection(s.id)}
                        style={{ display: "none" }}
                      />
                      Sec {s.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>
          {form.section_ids.length} section(s) selected
        </div>
      </div>
    </div>
  );

  if (workspaceExam) {
    return (
      <ExamWorkspace
        exam={workspaceExam}
        openAdmit={admitOnOpen}
        onBack={() => {
          setAdmitOnOpen(false);
          setWorkspaceExam(null);
          loadAll();
        }}
        onExamUpdated={(updated) => setWorkspaceExam(updated)}
      />
    );
  }

  const kpi = {
    total: exams.length,
    ongoing: exams.filter(
      (e) => e.status === "ongoing" || e.status === "scheduled"
    ).length,
    published: exams.filter((e) => e.status === "published").length,
    draft: exams.filter((e) => e.status === "draft").length,
  };

  return (
    <div className="slide-in">
      <SectionHeader
        title="Exam Management"
        sub="Setup exams, build date sheets, enter marks, and publish results"
        action={
          <button className="btn btn-primary" onClick={openCreate}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="plus" size={14} /> Create New Exam
            </span>
          </button>
        }
      />

      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          { id: "exams", label: "All Exams" },
          { id: "grading", label: "Grading Scale" },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab ${topTab === t.id ? "active" : ""}`}
            onClick={() => setTopTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {topTab === "grading" ? (
        <GradingScaleTab />
      ) : (
        <>
          <div
            className="grid-4"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <KpiCard
              label="Total Exams"
              value={loading ? "—" : kpi.total}
              icon="test"
              color={C.blue}
            />
            <KpiCard
              label="Ongoing / Scheduled"
              value={loading ? "—" : kpi.ongoing}
              icon="timetable"
              color={C.yellow}
            />
            <KpiCard
              label="Published"
              value={loading ? "—" : kpi.published}
              icon="check"
              color={C.green}
            />
            <KpiCard
              label="Draft"
              value={loading ? "—" : kpi.draft}
              icon="edit"
              color={C.textMuted}
            />
          </div>

          <div
            className="card"
            style={{ marginBottom: 16, padding: "12px 16px" }}
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select
                className="select"
                style={{ width: 160 }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                {EXAM_TYPES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </select>
              <select
                className="select"
                style={{ width: 160 }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                {Object.entries(EXAM_STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div
              className="card pulse"
              style={{ padding: 40, textAlign: "center", color: C.primary }}
            >
              Loading exams…
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="card" style={{ padding: 50, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
              <div
                className="syne"
                style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}
              >
                No exams yet
              </div>
              <div
                style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}
              >
                Create your first exam to start building its date sheet.
              </div>
              <button className="btn btn-primary" onClick={openCreate}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="plus" size={14} /> Create New Exam
                </span>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                gap: 16,
              }}
            >
              {filteredExams.map((exam) =>
                ExamCard({
                  exam,
                  onManage: setWorkspaceExam,
                  onEdit: openEdit,
                  onDelete: openDelete,
                  onPublishToggle: handlePublishToggle,
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ════ MODAL: CREATE / EDIT EXAM ════ */}
      <Modal
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal(null)}
        title={modal === "edit" ? "Edit Exam" : "Create New Exam"}
        width={720}
      >
        {ExamFormBody()}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20,
            justifyContent: "flex-end",
            borderTop: `1px solid ${C.border}33`,
            paddingTop: 16,
          }}
        >
          <button
            className="btn btn-ghost"
            onClick={() => setModal(null)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 150, opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? "Saving…"
              : modal === "edit"
              ? "Update Exam"
              : "Create Exam"}
          </button>
        </div>
      </Modal>

      {/* ════ MODAL: DELETE EXAM ════ */}
      <Modal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        title="Delete Exam"
        width={440}
      >
        {selectedExam && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div
              className="syne"
              style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}
            >
              Delete "{selectedExam.name}"?
            </div>
            <div
              style={{
                color: C.textMuted,
                fontSize: 13,
                marginBottom: 22,
                lineHeight: 1.6,
              }}
            >
              This permanently removes the exam, its full date sheet, every
              entered mark, and any processed results. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn btn-ghost"
                onClick={() => setModal(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={saving}
                style={{ minWidth: 140, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Deleting…" : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
