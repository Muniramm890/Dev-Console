// FILE: teacher-app/src/modules/setup/SetupModule.tsx
// Source: admin App.tsx -> SetupModule [5326-6534]
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { LogoLoader } from "../../components/ui/LogoLoader";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useSession } from "../../contexts/SessionContext";
import { DailyRoutineBuilder } from "./DailyRoutineBuilder";
import { SchoolSubjectsTab } from "../../shared/subjects/SchoolSubjectsTab";
import { SubjectsClassLevelTab } from "../../shared/subjects/SubjectsClassLevelTab";
import { C } from "../../theme/theme";

  // ═══════════════════════════════════════════════════════════════
 // MODULE: SCHOOL SETUP (Enterprise Level Deep Config UI) — FIXED
 // ═══════════════════════════════════════════════════════════════


export const SetupModule = () => {
  const { academicYears, reloadAcademicYears, setAcademicYearId } = useSession();
  const [tab, setTab] = useState("identity"); // 'identity', 'operations', 'classes', 'sections', 'subjects'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Real Data States
  const [schoolData, setSchoolData] = useState({});
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [periods, setPeriods] = useState([]); // 🔴 Daily routine — same pattern as grades/sections

  // Modal States
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [showAddSection, setShowAddSection] = useState({
    show: false,
    prefillGradeId: "",
  });
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });

  // Form States
  const [gradeForm, setGradeForm] = useState({
    name: "",
    numeric_order: "",
    stream: "none",
    description: "",
  });
  const [sectionForm, setSectionForm] = useState({
    grade_id: "",
    name: "",
    max_strength: 40,
  });
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    category: "core",
  });

  // ── inline saving flags per-modal (so buttons show "Saving…" and disable) ──
  const [gradeSaving, setGradeSaving] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); 
  const [deleting, setDeleting] = useState(false);

  // 🔥 1. Reusable fetch function — NOT tied only to mount.
  // useCallback so its reference stays stable across re-renders.
  const fetchSetupData = React.useCallback(
    async ({ showLoader = false } = {}) => {
      if (showLoader) setLoading(true);
      try {
        const [schRes, grRes, secRes, subRes, prRes] = await Promise.all([
          apiRequest("/setup/school", "GET").catch(() => ({ data: {} })),
          apiRequest("/setup/grades", "GET").catch(() => ({ data: [] })),
          apiRequest("/setup/sections", "GET").catch(() => ({ data: [] })),
          apiRequest("/setup/subjects", "GET").catch(() => ({ data: [] })),
          apiRequest("/timetable/periods", "GET").catch(() => ({ data: [] })),
        ]);

        if (schRes?.data) setSchoolData(schRes.data);
        setGrades(Array.isArray(grRes?.data) ? grRes.data : []);
        setSections(Array.isArray(secRes?.data) ? secRes.data : []);
        setSubjects(Array.isArray(subRes?.data) ? subRes.data : []);
        setPeriods(Array.isArray(prRes?.data) ? prRes.data : []); // 🔴 populate saved routine
      } catch (error) {
        console.error("Failed to load setup data", error);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    []
  );

  // Initial load on mount
  useEffect(() => {
    fetchSetupData({ showLoader: true });
   }, [fetchSetupData]);

  // 🔥 2. Handler to Save Deep School Config (unchanged — this one never reloaded)
  const handleSaveSchool = async () => {
    setSaving(true);
    try {
      const payload = {
        name: schoolData.name,
        tagline: schoolData.tagline,
        established_year: schoolData.established_year,
        principal_name: schoolData.principal_name,
        affiliation_board: schoolData.affiliation_board,
        affiliation_no: schoolData.affiliation_no,
        udise_code: schoolData.udise_code,
        logo_url: schoolData.logo_url,
        brand_color: schoolData.brand_color,

        address_line1: schoolData.address_line1,
        address_line2: schoolData.address_line2,
        city: schoolData.city,
        state: schoolData.state,
        pincode: schoolData.pincode,
        website: schoolData.website,
        phone: schoolData.phone,
        email: schoolData.email,

        academic_year_start: schoolData.academic_year_start,
        academic_year_end: schoolData.academic_year_end,
        school_start_time: schoolData.school_start_time,
        school_end_time: schoolData.school_end_time,
        periods_per_day: schoolData.periods_per_day,
        period_duration_min: schoolData.period_duration_min,
      };

      await apiRequest("/setup/school", "PUT", payload);
      alert("✅ School configuration updated successfully!");
    } catch (err) {
      alert("❌ Failed to update: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ✅ FIXED: no more window.location.reload()
  const handleCreateGrade = async () => {
    if (!gradeForm.name?.trim()) {
      alert("Class name is required.");
      return;
    }
    setGradeSaving(true);
    try {
      await apiRequest("/setup/grades", "POST", gradeForm);
      setShowAddGrade(false);
      setGradeForm({
        name: "",
        numeric_order: "",
        stream: "none",
        description: "",
      });
      await fetchSetupData(); // 🔴 refresh in place — no reload, no navigation change
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setGradeSaving(false);
    }
  };

  // ── Academic Sessions (uses existing GET/POST /setup/academic-years) ──────
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ymd = (v) => String(v || "").slice(0, 10);
  const fmtDate = (v) => {
    const p = ymd(v).split("-");
    return p.length === 3 ? `${p[2]} ${MONTHS[Number(p[1]) - 1]} ${p[0]}` : "—";
  };
  const pad2 = (n) => String(n).padStart(2, "0");
  const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m = 1..12

  // Suggest the next session from the months set in "Academic Session Rules"
  const suggestNextSession = () => {
    const sm = Number(schoolData.academic_year_start) || 4;
    const em = Number(schoolData.academic_year_end) || 3;
    const maxStart = academicYears.reduce((m, y) => (ymd(y.start_date) > m ? ymd(y.start_date) : m), "");
    const startYear = maxStart ? Number(maxStart.slice(0, 4)) + 1 : new Date().getFullYear();
    const endYear = em < sm ? startYear + 1 : startYear;
    return {
      name: endYear === startYear ? `${startYear}` : `${startYear}-${String(endYear).slice(2)}`,
      start_date: `${startYear}-${pad2(sm)}-01`,
      end_date: `${endYear}-${pad2(em)}-${pad2(lastDay(endYear, em))}`,
      is_current: academicYears.length === 0, // first ever session must be current
    };
  };

  const openAddSession = () => {
    setSessionForm(suggestNextSession());
    setShowAddSession(true);
  };

  const handleCreateSession = async () => {
    const name = String(sessionForm.name || "").trim();
    const sd = ymd(sessionForm.start_date);
    const ed = ymd(sessionForm.end_date);
    if (!name) return alert("Session name is required.");
    if (!sd || !ed) return alert("Start date and end date are required.");
    if (ed <= sd) return alert("End date must be after the start date.");
    if (academicYears.some((y) => String(y.name).trim().toLowerCase() === name.toLowerCase())) {
      return alert(`A session named "${name}" already exists.`);
    }
    const clash = academicYears.find((y) => sd <= ymd(y.end_date) && ed >= ymd(y.start_date));
    if (clash) {
      return alert(
        `These dates overlap with the existing session "${clash.name}" (${fmtDate(clash.start_date)} – ${fmtDate(clash.end_date)}).`
      );
    }
    if (sessionForm.is_current) {
      const cur = academicYears.find((y) => y.is_current);
      const ok = window.confirm(
        `Make "${name}" the current session?${cur ? ` "${cur.name}" will no longer be current.` : ""}\nThis changes the active session for the whole school.`
      );
      if (!ok) return;
    }
    setSessionSaving(true);
    try {
      const res = await apiRequest("/setup/academic-years", "POST", {
        name,
        start_date: sd,
        end_date: ed,
        is_current: !!sessionForm.is_current,
      });
      setShowAddSession(false);
      await reloadAcademicYears(); // refresh the global session list
      if (sessionForm.is_current && res?.data?.id) setAcademicYearId(res.data.id); // switch every module to it
      alert(`✅ Session "${name}" created.`);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSessionSaving(false);
    }
  };

  // ✅ FIXED: no more window.location.reload()
  const handleCreateSection = async () => {
    try {
      const currentYear =
        academicYears.find((y) => y.is_current) || academicYears[0];
      const payload = { ...sectionForm, academic_year_id: currentYear?.id };

      if (!payload.grade_id) return alert("Please select a Grade/Class");
      if (!payload.name?.trim()) return alert("Section name is required.");

      setSectionSaving(true);
      await apiRequest("/setup/sections", "POST", payload);
      setShowAddSection({ show: false, prefillGradeId: "" });
      setSectionForm({ grade_id: "", name: "", max_strength: 40 });
      await fetchSetupData(); // 🔴 refresh in place — no reload, no navigation change
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSectionSaving(false);
    }
  };

  // ✅ FIXED: no more window.location.reload()
  const handleCreateSubject = async () => {
    if (!subjectForm.name?.trim()) {
      alert("Subject name is required.");
      return;
    }
    setSubjectSaving(true);
    try {
      await apiRequest("/setup/subjects", "POST", subjectForm);
      setShowAddSubject(false);
      setSubjectForm({ name: "", category: "core" });
      await fetchSetupData(); // 🔴 refresh in place — no reload, no navigation change
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubjectSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint =
        deleteTarget.type === "grade"
          ? `/setup/grades/${deleteTarget.id}/hard`
          : `/setup/sections/${deleteTarget.id}/hard`;
      await apiRequest(endpoint, "DELETE");
      setDeleteTarget(null);
      await fetchSetupData(); // list turant refresh, koi reload nahi
    } catch (err) {
      alert("❌ Delete failed: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const EmptyState = ({ icon, title, desc, btnText, onClick }) => (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        background: C.surfaceAlt,
        borderRadius: 16,
        border: `2px dashed ${C.border}`,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <h3
        className="syne"
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: C.text,
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: C.textMuted,
          fontSize: 13,
          marginBottom: 20,
          maxWidth: 400,
          margin: "0 auto 20px",
        }}
      >
        {desc}
      </p>
      <button className="btn btn-primary" onClick={onClick}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            justifyContent: "center",
          }}
        >
          <Icon name="plus" size={16} /> {btnText}
        </span>
      </button>
    </div>
  );

  if (loading)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
        <LogoLoader size={56} label="Synchronizing Global Workspace..." />
      </div>
    );

  return (
    <div className="slide-in">
      <SectionHeader
        title="Institution Configuration"
        sub="Control your SaaS environment, academic structure, and daily operations."
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
          borderBottom: `1px solid ${C.border}44`,
          paddingBottom: 10,
        }}
      >
        {[
          { id: "identity", label: "Identity & Branding" },
          { id: "operations", label: "Daily Operations" },
          { id: "classes", label: "Class Hierarchy" },
          { id: "sections", label: "Sections" },
          { id: "school-subjects", label: "School Subjects" },
          { id: "subjects", label: "Subjects & Curriculum" },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
            style={{ fontWeight: tab === t.id ? 700 : 500 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. IDENTITY & CONTACT TAB */}
      {/* ──────────────────────────────────────────────────────────── */}
      {tab === "identity" && (
        <div>
          <div
            className="grid-2"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 20,
            }}
          >
            {/* Core Details */}
            <div className="card">
              <h3
                className="syne"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: C.primary,
                }}
              >
                <Icon name="setup" size={16} /> Core Identity
              </h3>
              <FormRow label="School / Institution Name">
                <input
                  className="input"
                  value={schoolData.name || ""}
                  onChange={(e) =>
                    setSchoolData({ ...schoolData, name: e.target.value })
                  }
                />
              </FormRow>
              <FormGrid>
                <FormRow label="Established Year">
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 1998"
                    value={schoolData.established_year || ""}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        established_year: e.target.value,
                      })
                    }
                  />
                </FormRow>
                <FormRow label="Principal / Head Name">
                  <input
                    className="input"
                    value={schoolData.principal_name || ""}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        principal_name: e.target.value,
                      })
                    }
                  />
                </FormRow>
              </FormGrid>
              <FormRow label="Tagline / Motto">
                <input
                  className="input"
                  placeholder="Illuminating Futures..."
                  value={schoolData.tagline || ""}
                  onChange={(e) =>
                    setSchoolData({ ...schoolData, tagline: e.target.value })
                  }
                />
              </FormRow>
              <FormGrid>
                <FormRow label="Affiliation Board">
                  <select
                    className="select"
                    value={schoolData.affiliation_board || ""}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        affiliation_board: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Select --</option>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="STATE">State Board</option>
                    <option value="IB">IB / Cambridge</option>
                  </select>
                </FormRow>
                <FormRow label="Affiliation / Reg No.">
                  <input
                    className="input"
                    value={schoolData.affiliation_no || ""}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        affiliation_no: e.target.value,
                      })
                    }
                  />
                </FormRow>
              </FormGrid>
              <FormGrid>
                <FormRow label="School Logo">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {schoolData.logo_url && (
                      <img src={schoolData.logo_url} alt="Logo" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "contain", background: C.surfaceAlt, border: `1px solid ${C.border}` }} />
                    )}
                    <input type="file" id="logo-upload" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      fd.append("type", "logo");
                      try {
                        const res = await apiRequest("/setup/school/upload-asset", "POST", fd, true);
                        setSchoolData((p) => ({ ...p, logo_url: res.data.url }));
                      } catch (err) { alert("Upload failed: " + err.message); }
                    }} />
                    <label htmlFor="logo-upload" className="btn btn-ghost" style={{ cursor: "pointer", fontSize: 12 }}>
                      <Icon name="plus" size={12} /> Upload Logo
                    </label>
                  </div>
                </FormRow>
                <FormRow label="Watermark (for receipts/documents)">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {schoolData.watermark_url && (
                      <img src={schoolData.watermark_url} alt="Watermark" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "contain", background: C.surfaceAlt, border: `1px solid ${C.border}` }} />
                    )}
                    <input type="file" id="watermark-upload" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      fd.append("type", "watermark");
                      try {
                        const res = await apiRequest("/setup/school/upload-asset", "POST", fd, true);
                        setSchoolData((p) => ({ ...p, watermark_url: res.data.url }));
                      } catch (err) { alert("Upload failed: " + err.message); }
                    }} />
                    <label htmlFor="watermark-upload" className="btn btn-ghost" style={{ cursor: "pointer", fontSize: 12 }}>
                      <Icon name="plus" size={12} /> Upload Watermark
                    </label>
                  </div>
                </FormRow>
              </FormGrid>

              <FormGrid>
                <FormRow label="UDISE Code (Govt)">
            
                  <input
                    className="input"
                    value={schoolData.udise_code || ""}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        udise_code: e.target.value,
                      })
                    }
                  />
                </FormRow>
                <FormRow label="ERP Brand Color">
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <input
                      type="color"
                      value={schoolData.brand_color || "#E8600A"}
                      onChange={(e) =>
                        setSchoolData({
                          ...schoolData,
                          brand_color: e.target.value,
                        })
                      }
                      style={{
                        width: 45,
                        height: 38,
                        borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    />
                    <input
                      className="input"
                      value={schoolData.brand_color || "#E8600A"}
                      onChange={(e) =>
                        setSchoolData({
                          ...schoolData,
                          brand_color: e.target.value,
                        })
                      }
                      style={{ flex: 1 }}
                    />
                  </div>
                </FormRow>
              </FormGrid>
            </div>

            {/* Reachability */}
            <div className="card">
              <h3
                className="syne"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: C.blue,
                }}
              >
                <Icon name="user" size={16} /> Contact & Reachability
              </h3>
              <FormRow label="Primary Campus Address">
                <input
                  className="input"
                  value={schoolData.address_line1 || ""}
                  onChange={(e) =>
                    setSchoolData({
                      ...schoolData,
                      address_line1: e.target.value,
                    })
                  }
                />
              </FormRow>
              <FormRow label="Address Line 2 (Optional)">
                <input
                  className="input"
                  value={schoolData.address_line2 || ""}
                  onChange={(e) =>
                    setSchoolData({
                      ...schoolData,
                      address_line2: e.target.value,
                    })
                  }
                />
              </FormRow>
              <FormGrid>
                <FormRow label="City">
                  <input
                    className="input"
                    value={schoolData.city || ""}
                    onChange={(e) =>
                      setSchoolData({ ...schoolData, city: e.target.value })
                    }
                  />
                </FormRow>
                <FormRow label="State">
                  <input
                    className="input"
                    value={schoolData.state || ""}
                    onChange={(e) =>
                      setSchoolData({ ...schoolData, state: e.target.value })
                    }
                  />
                </FormRow>
              </FormGrid>
              <FormGrid>
                <FormRow label="Pincode / ZIP">
                  <input
                    className="input"
                    value={schoolData.pincode || ""}
                    onChange={(e) =>
                      setSchoolData({ ...schoolData, pincode: e.target.value })
                    }
                  />
                </FormRow>
                <FormRow label="Official Phone">
                  <input
                    className="input"
                    value={schoolData.phone || ""}
                    onChange={(e) =>
                      setSchoolData({ ...schoolData, phone: e.target.value })
                    }
                  />
                </FormRow>
              </FormGrid>
              <FormGrid>
                <FormRow label="Official Email">
                  <input
                    className="input"
                    type="email"
                    value={schoolData.email || ""}
                    onChange={(e) =>
                      setSchoolData({ ...schoolData, email: e.target.value })
                    }
                  />
                </FormRow>
                <FormRow label="Website Domain">
                  <input
                    className="input"
                    placeholder="www.school.com"
                    value={schoolData.website || ""}
                    onChange={(e) =>
                      setSchoolData({ ...schoolData, website: e.target.value })
                    }
                  />
                </FormRow>
              </FormGrid>
            </div>
          </div>

          {/* Action Footer */}
          <div
            className="card"
            style={{
              background: C.surfaceAlt,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
            }}
          >
            <div style={{ fontSize: 13, color: C.textMuted }}>
              Review all details carefully before saving.
            </div>
            <button
              className="btn btn-primary"
              style={{ minWidth: 200, opacity: saving ? 0.7 : 1 }}
              onClick={handleSaveSchool}
              disabled={saving}
            >
              {saving ? "Updating ERP Core..." : "Save Identity Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. DAILY OPERATIONS TAB */}
      {/* ──────────────────────────────────────────────────────────── */}
      {tab === "operations" && (
        <div>
          <div
            className="grid-2"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 20,
            }}
          >
          <DailyRoutineBuilder periods={periods} onSaved={fetchSetupData} />

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card">
              <h3
                className="syne"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: C.green,
                }}
              >
                <Icon name="academic" size={16} /> Academic Session Rules
              </h3>
              <FormGrid>
                <FormRow label="Academic Year Starts">
                  <select
                    className="select"
                    value={schoolData.academic_year_start || 4}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        academic_year_start: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value={1}>January</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                  </select>
                </FormRow>
                <FormRow label="Academic Year Ends">
                  <select
                    className="select"
                    value={schoolData.academic_year_end || 3}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        academic_year_end: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={12}>December</option>
                  </select>
                </FormRow>
              </FormGrid>
              <div
                style={{
                  padding: 12,
                  background: `${C.green}11`,
                  border: `1px solid ${C.green}33`,
                  borderRadius: 10,
                  marginTop: 10,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: C.green,
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  Current Active Session is controlled automatically by these
                  rules. Financial module will calculate due dates accordingly.
                </p>
              </div>
            </div>

            {/* ── Academic Sessions: list + add (existing GET/POST /setup/academic-years) ── */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, margin: 0, color: C.green }}>
                  <Icon name="academic" size={16} /> Academic Sessions
                </h3>
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={openAddSession}>
                  <Icon name="plus" size={13} /> Add Session
                </button>
              </div>
              {academicYears.length === 0 ? (
                <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 0" }}>
                  No session yet. Add your first academic session to start enrolling students.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {academicYears.map((y) => (
                    <div
                      key={y.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        border: `1px solid ${y.is_current ? `${C.green}55` : C.border}`,
                        background: y.is_current ? `${C.green}0d` : "transparent",
                        borderRadius: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{y.name}</div>
                        <div style={{ fontSize: 11.5, color: C.textMuted }}>
                          {fmtDate(y.start_date)} – {fmtDate(y.end_date)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {y.is_current && <span className="badge badge-green">Current</span>}
                        {y.is_locked && <span className="badge badge-yellow">Locked</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>
                Sections are created per session. Tick “Make this the current session” while adding to switch the active session.
              </div>
            </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              background: C.surfaceAlt,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
            }}
          >
            <div style={{ fontSize: 13, color: C.textMuted }}>
              These settings directly impact Timetable & Fee Modules.
            </div>
            <button
              className="btn btn-primary"
              style={{ minWidth: 200, opacity: saving ? 0.7 : 1 }}
              onClick={handleSaveSchool}
              disabled={saving}
            >
              {saving ? "Updating..." : "Save Operation Settings"}
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. GRADES / CLASSES TAB */}
      {/* ──────────────────────────────────────────────────────────── */}
      {tab === "classes" && (
        <div className="card">
          {grades.length === 0 ? (
            <EmptyState
              icon="🏫"
              title="No Classes Setup Yet"
              desc="Start your ERP journey by adding the classes/grades (e.g., Class 1, Class 10) that run in your school."
              btnText="Add First Class"
              onClick={() => setShowAddGrade(true)}
            />
          ) : (
            <>
              <SectionHeader
                title="Class Hierarchy"
                action={
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowAddGrade(true)}
                  >
                    <Icon name="plus" size={14} /> Add New Class
                  </button>
                }
              />
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Grade Name</th>
                      <th>Stream</th>
                      <th>Numeric Level</th>
                      <th>Linked Sections</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g) => (
                      <tr key={g.id}>
                        <td>
                          <span
                            className="syne"
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                              color: C.text,
                            }}
                          >
                            {g.name}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              g.stream === "none"
                                ? "badge-blue"
                                : "badge-purple"
                            }`}
                          >
                            {g.stream === "none" ? "General" : g.stream}
                          </span>
                        </td>
                        <td>Level {g.numeric_order}</td>
                        <td>
                          <span className="badge badge-blue">
                            {sections.filter((s) => s.grade_id === g.id).length}{" "}
                            Sections
                          </span>
                        </td>
                        <td>
                          {g.is_active !== false ? (
                            <span className="badge badge-green">Active</span>
                          ) : (
                            <span className="badge badge-red">Disabled</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "5px 9px" }}
                            title="Delete Class"
                            onClick={() =>
                              setDeleteTarget({
                                type: "grade",
                                id: g.id,
                                name: g.name,
                              })
                            }
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. SECTIONS TAB */}
      {/* ──────────────────────────────────────────────────────────── */}
      {tab === "sections" && (
        <>
          {grades.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="⚠️"
                title="Grades Required First"
                desc="You need to create at least one Class/Grade before you can assign sections to it."
                btnText="Go to Grades Setup"
                onClick={() => setTab("classes")}
              />
            </div>
          ) : (
            <div
              className="grid-3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
                gap: 16,
              }}
            >
              {grades.map((g) => {
                const gradeSections = sections.filter(
                  (sec) => sec.grade_id === g.id
                );
                return (
                  <div
                    key={g.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      borderTop: `4px solid ${C.primary}`,
                    }}
                  >
                    <div
                      className="syne"
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        marginBottom: 16,
                        color: C.text,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: 10,
                        borderBottom: `1px solid ${C.border}44`,
                      }}
                    >
                      <span>{g.name}</span>
                      <button
                        className="btn btn-ghost"
                        style={{
                          padding: "4px 10px",
                          fontSize: 11,
                          background: `${C.primary}15`,
                          color: C.primary,
                          border: "none",
                        }}
                        onClick={() => {
                          setSectionForm({ ...sectionForm, grade_id: g.id });
                          setShowAddSection({
                            show: true,
                            prefillGradeId: g.id,
                          });
                        }}
                      >
                        + Add Section
                      </button>
                    </div>
                    <div style={{ flex: 1 }}>
                      {gradeSections.length === 0 ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: C.textMuted,
                            textAlign: "center",
                            padding: "20px 0",
                          }}
                        >
                          No sections added yet.
                        </div>
                      ) : (
                        gradeSections.map((sec) => (
                          <div
                            key={sec.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 12px",
                              background: C.surfaceAlt,
                              borderRadius: 10,
                              marginBottom: 8,
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                color: C.text,
                              }}
                            >
                              Sec {sec.name}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <span
                                style={{ fontSize: 11, color: C.textMuted }}
                              >
                                Cap: {sec.max_strength}
                              </span>
                              <button
                                className="btn btn-danger"
                                style={{ padding: "3px 7px" }}
                                title="Delete Section"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "section",
                                    id: sec.id,
                                    name: `${g.name} - Sec ${sec.name}`,
                                  })
                                }
                              >
                                <Icon name="trash" size={11} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. SUBJECTS TAB */}
      {/* ──────────────────────────────────────────────────────────── */}
      {tab === "school-subjects" && (
  <SchoolSubjectsTab subjects={subjects} onSubjectsChanged={fetchSetupData} />
 )}
 {tab === "subjects" && <SubjectsClassLevelTab grades={grades} subjects={subjects} />}

      {/* ═════════════════════════ MODALS ═════════════════════════ */}

      <Modal
        open={showAddSession}
        onClose={() => setShowAddSession(false)}
        title="Add Academic Session"
      >
        <FormRow label="Session Name (e.g. 2026-27)">
          <input
            className="input"
            placeholder="e.g. 2026-27"
            value={sessionForm.name}
            onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
          />
        </FormRow>
        <FormGrid>
          <FormRow label="Start Date">
            <input
              className="input"
              type="date"
              value={sessionForm.start_date}
              onChange={(e) => setSessionForm({ ...sessionForm, start_date: e.target.value })}
            />
          </FormRow>
          <FormRow label="End Date">
            <input
              className="input"
              type="date"
              value={sessionForm.end_date}
              onChange={(e) => setSessionForm({ ...sessionForm, end_date: e.target.value })}
            />
          </FormRow>
        </FormGrid>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 12, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!sessionForm.is_current}
            onChange={(e) => setSessionForm({ ...sessionForm, is_current: e.target.checked })}
          />
          Make this the current session
        </label>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>
          Dates are suggested from the months in “Academic Session Rules”. Sessions cannot overlap or repeat a name.
        </div>
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 16, opacity: sessionSaving ? 0.7 : 1 }}
          onClick={handleCreateSession}
          disabled={sessionSaving}
        >
          {sessionSaving ? "Creating…" : "Create Session"}
        </button>
      </Modal>

      <Modal
        open={showAddGrade}
        onClose={() => setShowAddGrade(false)}
        title="Create New Class/Grade"
      >
        <FormGrid>
          <FormRow label="Class Name (e.g. Class 10)">
            <input
              className="input"
              placeholder="e.g. Class 10"
              value={gradeForm.name}
              onChange={(e) =>
                setGradeForm({ ...gradeForm, name: e.target.value })
              }
            />
          </FormRow>
          <FormRow label="Numeric Level (For sorting)">
            <input
              className="input"
              type="number"
              placeholder="e.g. 10"
              value={gradeForm.numeric_order}
              onChange={(e) =>
                setGradeForm({ ...gradeForm, numeric_order: e.target.value })
              }
            />
          </FormRow>
        </FormGrid>
        <FormRow label="Academic Stream">
          <select
            className="select"
            value={gradeForm.stream}
            onChange={(e) =>
              setGradeForm({ ...gradeForm, stream: e.target.value })
            }
          >
            <option value="none">General (Up to Class 10)</option>
            <option value="Science">Science</option>
            <option value="Commerce">Commerce</option>
            <option value="Arts">Arts</option>
          </select>
        </FormRow>
        <button
          className="btn btn-primary"
          style={{
            width: "100%",
            marginTop: 16,
            opacity: gradeSaving ? 0.7 : 1,
          }}
          onClick={handleCreateGrade}
          disabled={gradeSaving}
        >
          {gradeSaving ? "Creating…" : "Create Grade Hierarchy"}
        </button>
      </Modal>

      <Modal
        open={showAddSection.show}
        onClose={() => setShowAddSection({ show: false, prefillGradeId: "" })}
        title="Deploy New Section"
      >
        <FormRow label="Parent Class">
          <select
            className="select"
            value={sectionForm.grade_id}
            onChange={(e) =>
              setSectionForm({ ...sectionForm, grade_id: e.target.value })
            }
            disabled={!!showAddSection.prefillGradeId}
          >
            <option value="">-- Select Class --</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </FormRow>
        <FormGrid>
          <FormRow label="Section Label (e.g. A, B)">
            <input
              className="input"
              placeholder="e.g. A"
              value={sectionForm.name}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, name: e.target.value })
              }
            />
          </FormRow>
          <FormRow label="Max Student Capacity">
            <input
              className="input"
              type="number"
              value={sectionForm.max_strength}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, max_strength: e.target.value })
              }
            />
          </FormRow>
        </FormGrid>
        <button
          className="btn btn-primary"
          style={{
            width: "100%",
            marginTop: 16,
            opacity: sectionSaving ? 0.7 : 1,
          }}
          onClick={handleCreateSection}
          disabled={sectionSaving}
        >
          {sectionSaving ? "Saving…" : "Save Section Capacity"}
        </button>
      </Modal>

      <Modal
        open={showAddSubject}
        onClose={() => setShowAddSubject(false)}
        title="Register Subject to Curriculum"
      >
        <FormRow label="Subject Name">
          <input
            className="input"
            placeholder="e.g. Mathematics"
            value={subjectForm.name}
            onChange={(e) =>
              setSubjectForm({ ...subjectForm, name: e.target.value })
            }
          />
        </FormRow>
        <FormRow label="Subject Category">
          <select
            className="select"
            value={subjectForm.category}
            onChange={(e) =>
              setSubjectForm({ ...subjectForm, category: e.target.value })
            }
          >
            <option value="core">Core / Main Subject</option>
            <option value="language">Language</option>
            <option value="elective">Elective / Optional</option>
            <option value="practical">Lab / Practical</option>
          </select>
        </FormRow>
        <button
          className="btn btn-primary"
          style={{
            width: "100%",
            marginTop: 16,
            opacity: subjectSaving ? 0.7 : 1,
          }}
          onClick={handleCreateSubject}
          disabled={subjectSaving}
        >
          {subjectSaving ? "Registering…" : "Finalize Subject Registration"}
        </button>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type === "grade" ? "Class" : "Section"}?`}
        width={420}
      >
        {deleteTarget && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div
              className="syne"
              style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}
            >
              Delete "{deleteTarget.name}"?
            </div>
            <div
              style={{
                color: C.textMuted,
                fontSize: 13,
                marginBottom: 22,
                lineHeight: 1.6,
              }}
            >
              {deleteTarget.type === "grade"
                ? "This permanently removes the class and its subject mappings. Blocked if any sections still exist under it."
                : "This permanently removes the section. Blocked if any students are enrolled in it."}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ minWidth: 140, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
