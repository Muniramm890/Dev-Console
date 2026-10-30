// FILE: teacher-app/src/modules/students/StudentsModule.tsx
// Source: admin App.tsx -> StudentsModule [2975-5133]
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { uploadToCloudinary } from "../../api/uploads";
import { Field } from "../../components/ui/Field";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { IdCardButton } from "../../components/ui/IdCardButton";
import { LogoLoader } from "../../components/ui/LogoLoader";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { IdCardBulkButton } from "../../components/ui/IdCardBulkButton";
import { useSession } from "../../contexts/SessionContext";
import { IssueTCModal } from "./IssueTCModal";
import { StudentCard } from "./StudentCard";
import { C } from "../../theme/theme";

export const StudentsModule = () => {
  // ── State ──────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [stats, setStats] = useState({ active: 0, male: 0, female: 0 });
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const { academicYears: academicYrs, currentYear } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  // 🔴 Student Photo Upload Handler
  const [uploadingStudentPhoto, setUploadingStudentPhoto] = useState(false);

  const handleStudentPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStudentPhoto(true);
    try {
      const url = await uploadToCloudinary(file);
      setF("photo_url", url);
    } catch (err) {
      alert("Photo upload failed. Please try again.");
    } finally {
      setUploadingStudentPhoto(false);
    }
  };
  // Filters
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSec, setFilterSec] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modals
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'view' | 'delete' | 'bulk'
  const [tcStudent, setTcStudent] = useState(null); // 🔴 Issue TC modal target
  const [activeTab, setActiveTab] = useState("personal");
  const [selected, setSelected] = useState(null);

  // Bulk import (v2: classes/sections auto-create + legacy dues, server-side preview)
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkPreview, setBulkPreview] = useState(null); // { academic_year, summary, rows, available_classes }
  const [bulkChecking, setBulkChecking] = useState(false);
  const [bulkParseError, setBulkParseError] = useState("");
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkFilter, setBulkFilter] = useState("all"); // all | needs | errors
  const [bulkFileName, setBulkFileName] = useState("");
  const bulkRowsRef = useRef([]);
  const bulkTimerRef = useRef(null);
  const bulkReqRef = useRef(0);
  const fileRef = useRef(null);

  // ── Blank Form ─────────────────────────────────────────────
  const blankForm = () => ({
    admission_no: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    gender: "Male",
    date_of_birth: "",
    blood_group: "",
    nationality: "Indian",
    religion: "",
    caste: "",
    sub_caste: "",
    is_ews: false,
    aadhaar_no: "",
    previous_school: "",
    tc_no: "",
    admission_date: new Date().toISOString().split("T")[0],
    address_permanent: "",
    address_current: "",
    city: "",
    state: "",
    pincode: "",
    photo_url: "",
    medical_conditions: "",
    disabilities: "",
    extra_curricular: "",
    is_active: true,
    grade_id: "",
    section_id: "",
    academic_year_id: "",
    roll_no: "",
    g_relation: "Father",
    g_full_name: "",
    g_phone: "",
    g_email: "",
    g2_relation: "Mother",
    g2_full_name: "",
    g2_phone: "",
    g2_email: "",
  });

  const [form, setForm] = useState(blankForm());
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [search, filterGrade, filterSec, filterGender, filterStatus]);

  // session badalne par: page 1, section filter (section ids session-specific hain), open modal/selection reset
  const firstYearRun = useRef(true);
  useEffect(() => {
    if (firstYearRun.current) { firstYearRun.current = false; return; }
    setPage(1);
    setFilterSec("");
    setStudents([]);
    setTotalStudents(0);
    setModal(null);
    setSelected(null);
  }, [currentYear?.id]); // eslint-disable-line

  useEffect(() => {
    loadAll();
  }, [page, search, filterGrade, filterSec, filterGender, filterStatus, currentYear?.id]);

  const loadReq = useRef(0);
  const loadAll = async () => {
    const myReq = ++loadReq.current; // sirf latest request ka response apply hoga
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: PAGE_SIZE,
        search: search || "",
        grade_id: filterGrade || "",
        section_id: filterSec || "",
        academic_year_id: currentYear?.id || "",
        gender: filterGender || "",
        sort: "roll_no",
        order: "asc",
        is_active:
          filterStatus === "active"
            ? "true"
            : filterStatus === "inactive"
            ? "false"
            : "",
      });

      const [gRes, secRes, stuRes] = await Promise.all([
        apiRequest("/setup/grades"),
        apiRequest(`/setup/sections${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`),
        apiRequest(`/students?include=guardian,enrolment&${params.toString()}`),
      ]);

      if (myReq !== loadReq.current) return; // stale (purane session ka) response
      setGrades(gRes?.data || []);
      setSections(secRes?.data || []);
      setStudents(Array.isArray(stuRes?.data) ? stuRes.data : []);
      setTotalStudents(stuRes?.total || 0);
      if (stuRes?.stats) {
        setStats(stuRes.stats);
      } else {
        const d = stuRes?.data || [];
        setStats({
          active: d.filter((s) => s.is_active).length,
          male: d.filter((s) => s.gender === "Male").length,
          female: d.filter((s) => s.gender === "Female").length,
        });
      }
    } catch (e) {
      console.error("Load failed", e);
    } finally {
      if (myReq === loadReq.current) setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const filteredSections = (gid) => sections.filter((s) => s.grade_id === gid);
  const gradeName = (gid) => grades.find((g) => g.id === gid)?.name || "—";
  const secName = (sid) => sections.find((s) => s.id === sid)?.name || "—";
  const totalPages = Math.ceil(totalStudents / PAGE_SIZE) || 0;
  const pageData = students;

  // ── Open modals ────────────────────────────────────────────
  const openAdd = () => {
    setForm({ ...blankForm(), academic_year_id: currentYear?.id || "" });
    setActiveTab("personal");
    setModal("add");
  };

  const openEdit = (s) => {
    setForm({
      ...blankForm(),
      ...s,
      admission_date: s.admission_date ? s.admission_date.split("T")[0] : "",
      date_of_birth: s.date_of_birth ? s.date_of_birth.split("T")[0] : "",
      photo_url: s.photo_url || "",
      grade_id: s.enrolment?.grade_id || "",
      section_id: s.enrolment?.section_id || "",
      academic_year_id: s.enrolment?.academic_year_id || currentYear?.id || "",
      roll_no: s.enrolment?.roll_no || "",
      g_relation: s.guardians?.[0]?.relation || "Father",
      g_full_name: s.guardians?.[0]?.full_name || "",
      g_phone: s.guardians?.[0]?.phone || "",
      g_email: s.guardians?.[0]?.email || "",
      g2_relation: s.guardians?.[1]?.relation || "Mother",
      g2_full_name: s.guardians?.[1]?.full_name || "",
      g2_phone: s.guardians?.[1]?.phone || "",
      g2_email: s.guardians?.[1]?.email || "",
    });
    setSelected(s);
    setActiveTab("personal");
    setModal("edit");
  };

  const openView = (s) => {
    setSelected(s);
    setModal("view");
  };
  const openDel = (s) => {
    setSelected(s);
    setModal("delete");
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.first_name || !form.date_of_birth || !form.gender) {
      alert("First name, DOB and Gender are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        admission_no: form.admission_no,
        first_name: form.first_name,
        middle_name: form.middle_name,
        last_name: form.last_name,
        gender: form.gender,
        date_of_birth: form.date_of_birth,
        blood_group: form.blood_group,
        nationality: form.nationality,
        religion: form.religion,
        caste: form.caste,
        sub_caste: form.sub_caste,
        is_ews: form.is_ews,
        aadhaar_no: form.aadhaar_no,
        previous_school: form.previous_school,
        tc_no: form.tc_no,
        admission_date: form.admission_date,
        address_permanent: form.address_permanent,
        address_current: form.address_current,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        photo_url: form.photo_url,
        medical_conditions: form.medical_conditions,
        disabilities: form.disabilities,
        extra_curricular: form.extra_curricular,
        is_active: form.is_active,
        enrolment: form.grade_id
          ? {
              grade_id: form.grade_id,
              section_id: form.section_id,
              academic_year_id: form.academic_year_id,
              roll_no: form.roll_no,
            }
          : null,
        guardians: [
          form.g_full_name
            ? {
                relation: form.g_relation,
                full_name: form.g_full_name,
                phone: form.g_phone,
                email: form.g_email,
                is_primary: true,
              }
            : null,
          form.g2_full_name
            ? {
                relation: form.g2_relation,
                full_name: form.g2_full_name,
                phone: form.g2_phone,
                email: form.g2_email,
                is_primary: false,
              }
            : null,
        ].filter(Boolean),
      };

      if (modal === "edit" && selected?.id) {
        await apiRequest(`/students/${selected.id}`, "PUT", payload);
      } else {
        await apiRequest("/students", "POST", payload);
      }
      setModal(null);
      await loadAll();
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiRequest(`/students/${selected.id}`, "DELETE");
      setModal(null);
      await loadAll();
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk CSV Import v2: auto classes/sections + legacy dues ──────────────
  // Flow: upload CSV → POST /students/bulk-import {dryRun:true} (nothing is saved)
  //       → admin fixes class / section / DOB where flagged → POST {dryRun:false} in chunks.
  const STU_COLS = [
    "admission_no", "first_name", "middle_name", "last_name", "gender", "date_of_birth", "admission_date",
    "class_name", "section_name", "roll_no",
    "blood_group", "nationality", "religion", "caste", "sub_caste", "is_ews", "aadhaar_no",
    "previous_school", "tc_no", "address_permanent", "address_current", "city", "state", "pincode",
    "medical_conditions", "disabilities",
    "guardian_name", "guardian_relation", "guardian_phone", "guardian_email",
    "guardian2_name", "guardian2_relation", "guardian2_phone", "guardian2_email",
    "legacy_due", "legacy_due_remark", "extra_fee_title", "extra_fee_amount",
  ];
  const STU_ACCEPTED = [...STU_COLS, "full_name"];
  const STU_ALIASES = {
    student_full_name: "full_name", student_name: "full_name", name: "full_name", fullname: "full_name",
    address_city: "city", address_pincode: "pincode", pin: "pincode", pin_code: "pincode",
    dob: "date_of_birth", birth_date: "date_of_birth", class: "class_name", grade: "class_name",
    section: "section_name", roll: "roll_no", roll_number: "roll_no",
    admission_number: "admission_no", adm_no: "admission_no", admission_date_: "admission_date",
    guardian_mobile: "guardian_phone", parent_name: "guardian_name", parent_phone: "guardian_phone",
    previous_due: "legacy_due", previous_dues: "legacy_due", arrears: "legacy_due", pending_due: "legacy_due",
    old_due: "legacy_due", extra_charge_title: "extra_fee_title", extra_charge_amount: "extra_fee_amount",
  };
  const BULK_CHUNK = 25;
  const BULK_MAX_ROWS = 2000;
  const NEEDS_LABEL = { class: "Class", section: "Section", dob: "Date of birth" };
  const inr = (paise) => "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: (paise || 0) % 100 ? 2 : 0, maximumFractionDigits: 2 });

  // RFC-4180 style CSV parser (quotes, commas/newlines inside quotes, BOM, \r\n)
  const parseCsvText = (text) => {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const table = [];
    let row = [];
    let cur = "";
    let inQ = false;
    const pushRow = () => {
      row.push(cur);
      cur = "";
      if (row.some((c) => c.trim() !== "")) table.push(row);
      row = [];
    };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        pushRow();
      } else cur += ch;
    }
    if (cur !== "" || row.length) pushRow();
    return table;
  };

  const parseBulkFile = (text) => {
    const table = parseCsvText(text);
    if (table.length < 2) return { error: "The file has no data rows." };
    const header = table[0].map((h) => {
      const k = h.trim().toLowerCase().replace(/[\s\-]+/g, "_");
      return STU_ALIASES[k] || k;
    });
    if (!header.includes("first_name") && !header.includes("full_name")) {
      return { error: "Header row must contain first_name (or student_full_name). Download the template to see all columns." };
    }
    if (table.length - 1 > BULK_MAX_ROWS) {
      return { error: `Too many rows (max ${BULK_MAX_ROWS} per file). Split the file and import in parts.` };
    }
    const rows = table.slice(1).map((vals, i) => {
      const r = { line: i + 2 };
      header.forEach((h, ci) => {
        if (STU_ACCEPTED.includes(h)) r[h] = (vals[ci] ?? "").trim();
      });
      return r;
    });
    return { rows };
  };

  const csvCell = (v) => {
    const t = v === undefined || v === null ? "" : String(v);
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const downloadCsv = (filename, lines) => {
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resetBulk = () => {
    clearTimeout(bulkTimerRef.current);
    bulkReqRef.current += 1;
    bulkRowsRef.current = [];
    setBulkRows([]);
    setBulkPreview(null);
    setBulkChecking(false);
    setBulkParseError("");
    setBulkProgress(null);
    setBulkDone(false);
    setBulkResult(null);
    setBulkFilter("all");
    setBulkFileName("");
  };

  // Server dry-run. Latest request wins (older responses are ignored).
  const runBulkPreview = async (rows) => {
    const reqId = ++bulkReqRef.current;
    setBulkChecking(true);
    setBulkParseError("");
    try {
      const res = await apiRequest("/students/bulk-import", "POST", { dryRun: true, rows });
      if (reqId === bulkReqRef.current) setBulkPreview(res.data);
    } catch (e) {
      if (reqId === bulkReqRef.current) setBulkParseError("Could not validate the file: " + e.message);
    } finally {
      if (reqId === bulkReqRef.current) setBulkChecking(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseBulkFile(String(ev.target.result || ""));
      setBulkProgress(null);
      setBulkDone(false);
      setBulkResult(null);
      setBulkPreview(null);
      setBulkFilter("all");
      setBulkFileName(file.name);
      if (parsed.error) {
        bulkRowsRef.current = [];
        setBulkRows([]);
        setBulkParseError(parsed.error);
        return;
      }
      bulkRowsRef.current = parsed.rows;
      setBulkRows(parsed.rows);
      runBulkPreview(parsed.rows);
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-selecting the same file
  };

  // ── fixing flagged rows inside the preview (re-validates on the server) ──
  const applyRowsChange = (next) => {
    bulkRowsRef.current = next;
    setBulkRows(next);
    clearTimeout(bulkTimerRef.current);
    bulkTimerRef.current = setTimeout(() => runBulkPreview(next), 350);
  };
  const setRowField = (idx, field, value) =>
    applyRowsChange(bulkRowsRef.current.map((r, i) => (i === idx ? { ...r, [field]: String(value || "").trim() } : r)));
  const applyClassToAll = (name) => {
    const n = String(name || "").trim();
    if (!n) return;
    applyRowsChange(bulkRowsRef.current.map((r) => (String(r.class_name || "").trim() ? r : { ...r, class_name: n })));
  };

  // ── commit (server re-validates everything; one DB transaction per student) ──
  const handleBulkImport = async () => {
    if (!bulkPreview || bulkChecking) return;
    const rows = bulkRowsRef.current;
    const okIdx = bulkPreview.rows.filter((r) => r.status === "ok" || r.status === "warning").map((r) => r.idx);
    if (!okIdx.length) { alert("No rows are ready to import."); return; }
    const skipped = bulkPreview.rows
      .filter((r) => r.status === "error" || r.status === "needs_input")
      .map((r) => ({
        ...rows[r.idx],
        _err: r.status === "error" ? r.errors.join("; ") : "Needs input: " + r.needs.map((n) => NEEDS_LABEL[n]).join(", "),
      }));

    setBulkProgress({ done: 0, total: okIdx.length, failed: [] });
    setBulkDone(false);
    const failed = [];
    const classes = new Set();
    const sections = new Set();
    let imported = 0, invoices = 0, legacy = 0, extra = 0;

    for (let st = 0; st < okIdx.length; st += BULK_CHUNK) {
      const slice = okIdx.slice(st, st + BULK_CHUNK);
      let abort = false;
      try {
        const res = await apiRequest("/students/bulk-import", "POST", {
          dryRun: false,
          rows: slice.map((i) => rows[i]),
        });
        const d = res.data;
        imported += d.summary.imported;
        invoices += d.summary.invoices;
        legacy += d.summary.legacy_paise;
        extra += d.summary.extra_paise;
        d.summary.classes_created.forEach((n) => classes.add(n));
        d.summary.sections_created.forEach((n) => sections.add(n));
        d.results.forEach((r) => {
          if (!r.ok) failed.push({ ...rows[slice[r.idx]], _err: r.error });
        });
      } catch (e) {
        slice.forEach((i) => failed.push({ ...rows[i], _err: e.message }));
        if (String(e.message).includes("Session expired")) abort = true;
      }
      setBulkProgress({ done: Math.min(st + BULK_CHUNK, okIdx.length), total: okIdx.length, failed: [...failed] });
      if (abort) break;
    }

    setBulkResult({
      total: rows.length, imported, invoices, legacy, extra,
      classes: [...classes], sections: [...sections], skipped, failed,
    });
    setBulkDone(true);
    await loadAll(); // refresh students + newly created classes / sections
  };

  const downloadFailedCSV = (failedRows) => {
    if (!failedRows || failedRows.length === 0) return;
    const cols = failedRows.some((r) => r.full_name) ? [...STU_COLS, "full_name"] : STU_COLS;
    downloadCsv("failed_students_import.csv", [
      [...cols, "error_reason"].join(","),
      ...failedRows.map((r) => [...cols.map((c) => csvCell(r[c])), csvCell(r._err)].join(",")),
    ]);
  };

  const downloadSample = () => {
    const mk = (o) => STU_COLS.map((c) => csvCell(o[c])).join(",");
    downloadCsv("students_import_template.csv", [
      STU_COLS.join(","),
      mk({
        admission_no: "ADM-1001", first_name: "Rahul", middle_name: "Kumar", last_name: "Sharma", gender: "Male",
        date_of_birth: "2014-06-15", admission_date: "2021-04-01", class_name: "Class 5", section_name: "A",
        roll_no: "1", blood_group: "B+", nationality: "Indian", religion: "Hindu", caste: "General",
        is_ews: "no", aadhaar_no: "123412341234", previous_school: "Sunrise Public School",
        address_permanent: "12 Gandhi Nagar, Jaipur", city: "Jaipur", state: "Rajasthan", pincode: "302001",
        guardian_name: "Suresh Sharma", guardian_relation: "Father", guardian_phone: "9876543210",
        guardian_email: "suresh@email.com", guardian2_name: "Meena Sharma", guardian2_relation: "Mother",
        guardian2_phone: "9812345678", legacy_due: "4500", legacy_due_remark: "2024-25 pending",
        extra_fee_title: "Uniform", extra_fee_amount: "800",
      }),
      mk({
        first_name: "Priya", last_name: "Gupta", gender: "Female", date_of_birth: "15/03/2013",
        class_name: "Class 5", guardian_name: "Meena Gupta", guardian_relation: "Mother", guardian_phone: "9812345678",
      }),
      mk({
        first_name: "Aarav", last_name: "Verma", gender: "Male", date_of_birth: "2022-01-20",
        class_name: "Nursery", guardian_name: "Anil Verma", guardian_phone: "9700000001",
      }),
    ]);
  };

  const totalActive = students.filter((s) => s.is_active).length;
  const totalMale = students.filter((s) => s.gender === "BOY").length;
  const totalFemale = students.filter((s) => s.gender === "GIRL").length;

  // ── UI helpers ─────────────────────────────────────────────
  // 🔴 FIX: TabBtn is a plain function now — call it as TabBtn({...}),
  // never as <TabBtn .../>. This prevents remounting the tab bar (and
  // any input inside the active tab) on every keystroke.
  const TabBtn = ({ id, label, icon }) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 12.5,
        fontWeight: 600,
        background: activeTab === id ? `${C.primary}22` : "transparent",
        color: activeTab === id ? C.primary : C.textMuted,
        borderBottom:
          activeTab === id ? `2px solid ${C.primary}` : "2px solid transparent",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <Icon name={icon} size={13} />
      {label}
    </button>
  );

  // 🔴 FIX: FormBody is a plain function now — call it as {FormBody()},
  // never as <FormBody />. It still closes over `form`, `setF`,
  // `activeTab`, `grades`, `sections` etc. from StudentsModule's scope,
  // so no props need to be threaded through. This is what stops the
  // cursor from jumping out after one character.
  const FormBody = () => (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 18,
          borderBottom: `1px solid ${C.border}44`,
          flexWrap: "wrap",
        }}
      >
        {TabBtn({ id: "personal", label: "Personal", icon: "user" })}
        {TabBtn({ id: "academic", label: "Academic", icon: "academic" })}
        {TabBtn({ id: "guardian", label: "Guardian", icon: "teachers" })}
        {TabBtn({ id: "address", label: "Address", icon: "dashboard" })}
        {TabBtn({ id: "medical", label: "Medical", icon: "warning" })}
      </div>

      {activeTab === "personal" && (
        <div>
          <FormGrid cols={3}>
            <Field
              form={form}
              setF={setF}
              label="First Name *"
              name="first_name"
            />
            <Field
              form={form}
              setF={setF}
              label="Middle Name"
              name="middle_name"
            />
            <Field form={form} setF={setF} label="Last Name" name="last_name" />
          </FormGrid>
          <FormGrid cols={3}>
            <Field
              form={form}
              setF={setF}
              label="Gender *"
              name="gender"
              options={["BOY", "GIRL", "Other"]}
            />
            <Field
              form={form}
              setF={setF}
              label="Date of Birth *"
              name="date_of_birth"
              type="date"
            />
            <Field
              form={form}
              setF={setF}
              label="Blood Group"
              name="blood_group"
              options={["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
            />
          </FormGrid>
          <FormGrid cols={3}>
            <Field
              form={form}
              setF={setF}
              label="Nationality"
              name="nationality"
            />
            <Field form={form} setF={setF} label="Religion" name="religion" />
            <Field form={form} setF={setF} label="Caste" name="caste" />
          </FormGrid>
          <FormGrid cols={3}>
            <Field form={form} setF={setF} label="Sub-Caste" name="sub_caste" />
            <Field
              form={form}
              setF={setF}
              label="Aadhaar No."
              name="aadhaar_no"
            />
            <Field
              form={form}
              setF={setF}
              label="EWS Student"
              name="is_ews"
              type="checkbox"
            />
          </FormGrid>
          {/* 🔴 Direct Student Photo Upload UI */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, textTransform: "uppercase" }}>
              Student Photo
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: C.surfaceAlt, padding: 14, borderRadius: 12, border: `1px solid ${C.border}` }}>
              {form.photo_url ? (
                <img src={form.photo_url} alt="Student" style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.primary}` }} />
              ) : (
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: `${C.primary}22`, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                  {(form.first_name?.[0] || "?").toUpperCase()}
                </div>
              )}
              <div>
                <input 
                  type="file" 
                  id="student-photo-input" 
                  accept="image/*" 
                  style={{ display: "none" }} 
                  onChange={handleStudentPhotoUpload} 
                  disabled={uploadingStudentPhoto}
                />
                <label 
                  htmlFor="student-photo-input" 
                  className="btn btn-primary" 
                  style={{ cursor: uploadingStudentPhoto ? "wait" : "pointer", padding: "6px 14px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {uploadingStudentPhoto ? "Uploading..." : "📷 Select Photo"}
                </label>
                <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 4 }}>Square JPG/PNG image</div>
              </div>
            </div>
          </div>
          <FormGrid cols={2}>
            <Field
              form={form}
              setF={setF}
              label="Extra-curricular Activities"
              name="extra_curricular"
            />
            <Field
              form={form}
              setF={setF}
              label="Is Active"
              name="is_active"
              type="checkbox"
            />
          </FormGrid>
        </div>
      )}

      {activeTab === "academic" && (
        <div>
          <FormGrid cols={2}>
            <Field
              form={form}
              setF={setF}
              label="Admission No. *"
              name="admission_no"
            />
            <Field
              form={form}
              setF={setF}
              label="Admission Date *"
              name="admission_date"
              type="date"
            />
          </FormGrid>
          <FormGrid cols={2}>
            <Field
              form={form}
              setF={setF}
              label="Previous School"
              name="previous_school"
            />
            <Field form={form} setF={setF} label="TC No." name="tc_no" />
          </FormGrid>
          <div
            style={{
              padding: "14px 16px",
              background: `${C.primary}11`,
              borderRadius: 12,
              border: `1px solid ${C.primary}22`,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.primary,
                textTransform: "uppercase",
                marginBottom: 10,
                letterSpacing: "0.5px",
              }}
            >
              Class Enrolment
            </div>
            <FormGrid cols={2}>
              <FormRow label="Class / Grade">
                <select
                  className="select"
                  value={form.grade_id || ""}
                  onChange={(e) => {
                    setF("grade_id", e.target.value);
                    setF("section_id", "");
                  }}
                >
                  <option value="">-- Select Class --</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="Section">
                <select
                  className="select"
                  value={form.section_id || ""}
                  onChange={(e) => setF("section_id", e.target.value)}
                  disabled={!form.grade_id}
                >
                  <option value="">-- Select Section --</option>
                  {filteredSections(form.grade_id).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </FormRow>
            </FormGrid>
            <FormGrid cols={2}>
              <FormRow label="Academic Year">
                <select
                  className="select"
                  value={form.academic_year_id || ""}
                  onChange={(e) => setF("academic_year_id", e.target.value)}
                >
                  <option value="">-- Select Year --</option>
                  {academicYrs.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name}
                      {ay.is_current ? " (Current)" : ""}
                    </option>
                  ))}
                </select>
              </FormRow>
              <Field form={form} setF={setF} label="Roll No." name="roll_no" />
            </FormGrid>
          </div>
        </div>
      )}

      {activeTab === "guardian" && (
        <div>
          <div
            style={{
              padding: "14px 16px",
              background: `${C.green}11`,
              borderRadius: 12,
              border: `1px solid ${C.green}22`,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.green,
                textTransform: "uppercase",
                marginBottom: 10,
                letterSpacing: "0.5px",
              }}
            >
              Primary Guardian
            </div>
            <FormGrid cols={2}>
              <Field
                form={form}
                setF={setF}
                label="Relation"
                name="g_relation"
                options={[
                  "Father",
                  "Mother",
                  "Guardian",
                  "Uncle",
                  "Aunt",
                  "Grandparent",
                  "Other",
                ]}
              />
              <Field
                form={form}
                setF={setF}
                label="Full Name *"
                name="g_full_name"
              />
            </FormGrid>
            <FormGrid cols={2}>
              <Field
                form={form}
                setF={setF}
                label="Phone *"
                name="g_phone"
                type="tel"
              />
              <Field
                form={form}
                setF={setF}
                label="Email"
                name="g_email"
                type="email"
              />
            </FormGrid>
          </div>
          <div
            style={{
              padding: "14px 16px",
              background: `${C.blue}11`,
              borderRadius: 12,
              border: `1px solid ${C.blue}22`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.blue,
                textTransform: "uppercase",
                marginBottom: 10,
                letterSpacing: "0.5px",
              }}
            >
              Secondary Guardian (Optional)
            </div>
            <FormGrid cols={2}>
              <Field
                form={form}
                setF={setF}
                label="Relation"
                name="g2_relation"
                options={[
                  "Father",
                  "Mother",
                  "Guardian",
                  "Uncle",
                  "Aunt",
                  "Grandparent",
                  "Other",
                ]}
              />
              <Field
                form={form}
                setF={setF}
                label="Full Name"
                name="g2_full_name"
              />
            </FormGrid>
            <FormGrid cols={2}>
              <Field
                form={form}
                setF={setF}
                label="Phone"
                name="g2_phone"
                type="tel"
              />
              <Field
                form={form}
                setF={setF}
                label="Email"
                name="g2_email"
                type="email"
              />
            </FormGrid>
          </div>
        </div>
      )}

      {activeTab === "address" && (
        <div>
          <FormRow label="Permanent Address">
            <textarea
              className="input"
              rows={3}
              value={form.address_permanent || ""}
              onChange={(e) => setF("address_permanent", e.target.value)}
              style={{ resize: "vertical", minHeight: 70 }}
            />
          </FormRow>
          <FormRow label="Current Address (if different)">
            <textarea
              className="input"
              rows={3}
              value={form.address_current || ""}
              onChange={(e) => setF("address_current", e.target.value)}
              style={{ resize: "vertical", minHeight: 70 }}
            />
          </FormRow>
          <FormGrid cols={3}>
            <Field form={form} setF={setF} label="City" name="city" />
            <Field form={form} setF={setF} label="State" name="state" />
            <Field form={form} setF={setF} label="Pincode" name="pincode" />
          </FormGrid>
        </div>
      )}

      {activeTab === "medical" && (
        <div>
          <FormRow label="Medical Conditions (if any)">
            <textarea
              className="input"
              rows={3}
              value={form.medical_conditions || ""}
              onChange={(e) => setF("medical_conditions", e.target.value)}
              style={{ resize: "vertical", minHeight: 80 }}
            />
          </FormRow>
          <FormRow label="Disabilities (if any)">
            <textarea
              className="input"
              rows={3}
              value={form.disabilities || ""}
              onChange={(e) => setF("disabilities", e.target.value)}
              style={{ resize: "vertical", minHeight: 80 }}
            />
          </FormRow>
          <div
            style={{
              padding: 12,
              background: `${C.yellow}11`,
              border: `1px solid ${C.yellow}33`,
              borderRadius: 10,
              marginTop: 8,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: C.yellow,
                margin: 0,
                fontWeight: 600,
              }}
            >
              ℹ This information is confidential and used only for emergency
              medical response.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ── MAIN RENDER ────────────────────────────────────────────
  return (
    <div className="slide-in">
      <SectionHeader
        title="Student Management"
        sub={`${students.length} students enrolled`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <IdCardBulkButton kind="student" sectionId={filterSec} />
            <button
              className="btn btn-ghost"
              onClick={() => {
                resetBulk();
                setModal("bulk");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
              }}
            >
              <Icon name="download" size={14} /> Bulk Import
            </button>
            <button
              className="btn btn-primary"
              onClick={openAdd}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
              }}
            >
              <Icon name="plus" size={14} /> New Admission
            </button>
          </div>
        }
      />

      {/* Stats Row */}
      <div
        className="grid-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {[
          {
            label: "Total Enrolled",
            value: totalStudents,
            color: C.blue,
            icon: "students",
          },
          {
            label: "Active",
            value: totalActive,
            color: C.green,
            icon: "check",
          },
          { label: "Boys", value: totalMale, color: C.cyan, icon: "user" },
          { label: "Girls", value: totalFemale, color: C.purple, icon: "user" },
        ].map((k, i) => (
          <div key={i} className="kpi-card" style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    marginBottom: 4,
                  }}
                >
                  {k.label}
                </div>
                <div
                  className="syne"
                  style={{ fontSize: 26, fontWeight: 800, color: C.text }}
                >
                  {loading ? "—" : k.value}
                </div>
              </div>
              <div
                style={{
                  background: `${k.color}22`,
                  padding: 10,
                  borderRadius: 10,
                  color: k.color,
                }}
              >
                <Icon name={k.icon} size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 14, padding: "12px 16px" }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <div
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <Icon name="search" size={14} color={C.textMuted} />
            </div>
            <input
              className="input"
              placeholder="Search name or admission no…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: 32 }}
            />
          </div>
          <select
            className="select"
            style={{ width: 140 }}
            value={filterGrade}
            onChange={(e) => {
              setFilterGrade(e.target.value);
              setFilterSec("");
              setPage(1);
            }}
          >
            <option value="">All Classes</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 120 }}
            value={filterSec}
            onChange={(e) => {
              setFilterSec(e.target.value);
              setPage(1);
            }}
            disabled={!filterGrade}
          >
            <option value="">All Sections</option>
            {filteredSections(filterGrade).map((s) => (
              <option key={s.id} value={s.id}>
                Sec {s.name}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 110 }}
            value={filterGender}
            onChange={(e) => {
              setFilterGender(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Gender</option>
            <option value="Male">BOY</option>
            <option value="Female">GIRL</option>
          </select>
          <select
            className="select"
            style={{ width: 120 }}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || filterGrade || filterGender || filterStatus) && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: "7px 12px" }}
              onClick={() => {
                setSearch("");
                setFilterGrade("");
                setFilterSec("");
                setFilterGender("");
                setFilterStatus("");
                setPage(1);
              }}
            >
              Clear
            </button>
          )}

          {/* Grid / Table toggle — same pattern as TeachersModule */}
          <div
            style={{
              display: "flex",
              background: C.surfaceAlt,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
            }}
          >
            {[
              ["grid", "chart"],
              ["table", "result"],
            ].map(([m, icon]) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: "7px 11px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif",
                  background: viewMode === m ? `${C.primary}22` : "transparent",
                  color: viewMode === m ? C.primary : C.textMuted,
                }}
                title={m === "grid" ? "Grid view" : "Table view"}
              >
                <Icon name={icon} size={14} />
              </button>
            ))}
          </div>

          <div
            style={{
              marginLeft: 8,
              fontSize: 12,
              color: C.textMuted,
              fontWeight: 600,
            }}
          >
            {totalStudents} result{totalStudents !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
                <div className="card" style={{ padding: 30 }}>
                <LogoLoader size={44} label="Syncing student records…" />
              </div>
      ) : pageData.length === 0 ? (
        <div className="card" style={{ padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎓</div>
          <div
            className="syne"
            style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}
          >
            No students found
          </div>
          <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
            {students.length === 0
              ? "Start by adding new admissions or importing via CSV."
              : "Try adjusting filters."}
          </div>
          {students.length === 0 && (
            <button className="btn btn-primary" onClick={openAdd}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="plus" size={14} /> Add First Student
              </span>
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {pageData.map((s) =>
            StudentCard({
              s,
              gradeName,
              secName,
              onView: openView,
              onEdit: openEdit,
              onDelete: openDel,
              onIssueTC: setTcStudent,
            })
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Student</th>
                  <th>Adm. No.</th>
                  <th>Class</th>
                  <th>DOB</th>
                  <th>Guardian</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((s, idx) => {
                  const enr = s.enrolment;
                  const primary = s.guardians?.[0];
                  const gname = enr
                    ? `${gradeName(enr.grade_id)} ${secName(enr.section_id)}`
                    : "—";
                  const fullName = [s.first_name, s.middle_name, s.last_name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={s.id}>
                      <td style={{ color: C.textMuted, fontSize: 11 }}>
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background:
                                s.gender === "GIRL"
                                  ? `${C.purple}33`
                                  : `${C.blue}33`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 700,
                              color: s.gender === "GIRL" ? C.purple : C.blue,
                            }}
                          >
                            {(s.first_name?.[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {fullName}
                            </div>
                            {enr?.roll_no && (
                              <div
                                style={{ fontSize: 10.5, color: C.textMuted }}
                              >
                                Roll #{enr.roll_no}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: C.textMuted,
                        }}
                      >
                        {s.admission_no || "—"}
                      </td>
                      <td>
                        {enr ? (
                          <span className="badge badge-blue">{gname}</span>
                        ) : (
                          <span style={{ color: C.red, fontSize: 12 }}>
                            Not enrolled
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: C.textMuted }}>
                        {s.date_of_birth
                          ? new Date(s.date_of_birth).toLocaleDateString(
                              "en-IN"
                            )
                          : "—"}
                      </td>
                      <td>
                        {primary ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                              {primary.full_name}
                            </div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>
                              {primary.phone}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: C.textMuted, fontSize: 12 }}>
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            s.is_active ? "badge-green" : "badge-red"
                          }`}
                        >
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            justifyContent: "center",
                          }}
                        >
                          <button
                            className="btn btn-ghost"
                            title="View"
                            style={{ padding: "5px 8px" }}
                            onClick={() => openView(s)}
                          >
                            <Icon name="eye" size={13} />
                          </button>
                          <button
                            className="btn btn-ghost"
                            title="Edit"
                            style={{ padding: "5px 8px" }}
                            onClick={() => openEdit(s)}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          {s.is_active && (
                            <button
                              className="btn btn-ghost"
                              title="Issue TC / Mark as Left"
                              style={{ padding: "5px 8px", color: C.red }}
                              onClick={() => setTcStudent(s)}
                            >
                              <Icon name="file" size={13} />
                            </button>
                          )}
                          <button
                            className="btn btn-danger"
                            title="Delete"
                            style={{ padding: "5px 8px" }}
                            onClick={() => openDel(s)}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 16px",
                borderTop: `1px solid ${C.border}33`,
              }}
            >
              <div style={{ fontSize: 12, color: C.textMuted }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, totalStudents)} of {totalStudents}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "5px 12px", fontSize: 12 }}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = page <= 3 ? i + 1 : page + i - 2;
                  if (pg < 1 || pg > totalPages) return null;
                  return (
                    <button
                      key={pg}
                      className="btn btn-ghost"
                      style={{
                        padding: "5px 10px",
                        fontSize: 12,
                        background:
                          pg === page ? `${C.primary}22` : "transparent",
                        color: pg === page ? C.primary : C.textMuted,
                      }}
                      onClick={() => setPage(pg)}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  className="btn btn-ghost"
                  style={{ padding: "5px 12px", fontSize: 12 }}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid view pagination (simple, since grid uses same pageData) */}
      {viewMode === "grid" && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginBottom: 16,
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Prev
          </button>
          <span
            style={{ alignSelf: "center", fontSize: 12, color: C.textMuted }}
          >
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-ghost"
            style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* ════════ MODAL: ADD / EDIT ════════ */}
      <Modal
        open={modal === "add" || modal === "edit"}
        onClose={() => setModal(null)}
        title={modal === "edit" ? "Edit Student Profile" : "New Admission"}
        width={700}
      >
        {FormBody()}
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
            style={{ minWidth: 140, opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? "Saving…"
              : modal === "edit"
              ? "Update Student"
              : "Admit Student"}
          </button>
        </div>
      </Modal>

      {/* ════════ MODAL: VIEW ════════ */}
      <Modal
        open={modal === "view"}
        onClose={() => setModal(null)}
        title="Student Profile"
        width={680}
      >
        {selected &&
          (() => {
            const enr = selected.enrolment;
            const primary = selected.guardians?.[0];
            const sec2 = selected.guardians?.[1];
            const fullName = [
              selected.first_name,
              selected.middle_name,
              selected.last_name,
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div>
                <div
                  style={{
                    background: `linear-gradient(135deg,${C.surfaceAlt},${C.surface})`,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: 20,
                    marginBottom: 16,
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background:
                        selected.gender === "GIRL"
                          ? `${C.purple}33`
                          : `${C.blue}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      color: selected.gender === "GIRL" ? C.purple : C.blue,
                      border: `2px solid ${
                        selected.gender === "BOY" ? C.purple : C.blue
                      }55`,
                    }}
                  >
                    {(selected.first_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="syne"
                      style={{ fontSize: 18, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {fullName}
                    </div>
                    <div
                      style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}
                    >
                      {selected.admission_no && (
                        <span style={{ marginRight: 10 }}>
                          Adm# {selected.admission_no}
                        </span>
                      )}
                      {enr && (
                        <span style={{ color: C.primary, fontWeight: 600 }}>
                          {gradeName(enr.grade_id)} — Sec{" "}
                          {secName(enr.section_id)}
                          {enr.roll_no ? ` | Roll #${enr.roll_no}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      className={`badge ${
                        selected.is_active ? "badge-green" : "badge-red"
                      }`}
                    >
                      {selected.is_active ? "Active" : "Inactive"}
                    </span>
                    {selected.is_ews && (
                      <span className="badge badge-yellow">EWS</span>
                    )}
                  </div>
                </div>

                <div
                  className="grid-2"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  {[
                    ["Gender", selected.gender],
                    [
                      "Date of Birth",
                      selected.date_of_birth
                        ? new Date(selected.date_of_birth).toLocaleDateString(
                            "en-IN"
                          )
                        : "—",
                    ],
                    ["Blood Group", selected.blood_group || "—"],
                    ["Nationality", selected.nationality || "—"],
                    ["Religion", selected.religion || "—"],
                    ["Caste", selected.caste || "—"],
                    ["Aadhaar", selected.aadhaar_no || "—"],
                    [
                      "Adm. Date",
                      selected.admission_date
                        ? new Date(selected.admission_date).toLocaleDateString(
                            "en-IN"
                          )
                        : "—",
                    ],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        background: C.surfaceAlt,
                        borderRadius: 8,
                        padding: "8px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10.5,
                          color: C.textMuted,
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        {k}
                      </div>
                      <div
                        style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>

                {(primary || sec2) && (
                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.textMuted,
                        textTransform: "uppercase",
                        fontWeight: 700,
                        marginBottom: 8,
                        letterSpacing: "0.5px",
                      }}
                    >
                      Guardians
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {[primary, sec2].filter(Boolean).map((g, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            minWidth: 200,
                            background: C.surfaceAlt,
                            borderRadius: 10,
                            padding: "10px 12px",
                            border: `1px solid ${C.border}55`,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              color: i === 0 ? C.green : C.blue,
                              fontWeight: 700,
                              marginBottom: 4,
                            }}
                          >
                            {i === 0 ? "Primary" : "Secondary"} — {g.relation}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {g.full_name}
                          </div>
                          <div style={{ fontSize: 12, color: C.textMuted }}>
                            {g.phone}
                          </div>
                          {g.email && (
                            <div style={{ fontSize: 11, color: C.textMuted }}>
                              {g.email}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selected.address_permanent || selected.city) && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "10px 12px",
                      background: C.surfaceAlt,
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        color: C.textMuted,
                        textTransform: "uppercase",
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      Address
                    </div>
                    <div style={{ fontSize: 13 }}>
                      {[
                        selected.address_permanent,
                        selected.city,
                        selected.state,
                        selected.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 18,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn btn-ghost"
                    onClick={() => setModal(null)}
                  >
                    Close
                  </button>
                  <IdCardButton kind="student" id={selected.id} />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setModal(null);
                      openEdit(selected);
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Icon name="edit" size={13} /> Edit Profile
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* ════════ MODAL: DELETE CONFIRM ════════ */}
      <Modal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        title="Confirm Deletion"
        width={420}
      >
        {selected && (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div
              className="syne"
              style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}
            >
              Delete {selected.first_name} {selected.last_name}?
            </div>
            <div
              style={{
                color: C.textMuted,
                fontSize: 13,
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              This is a soft delete. Student record, enrolment, and guardian
              data will be archived and hidden from all views. This action can
              be reversed by a database admin.
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
                style={{ minWidth: 120, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ════════ MODAL: ISSUE TC ════════ */}
      <IssueTCModal
        student={tcStudent}
        onClose={() => setTcStudent(null)}
        onDone={() => {
          setTcStudent(null);
          loadAll();
        }}
      />

      {/* ════════ MODAL: BULK IMPORT (v2 — classes, sections, legacy dues) ════════ */}
      <Modal
        open={modal === "bulk"}
        onClose={() => { if (!(bulkProgress && !bulkDone)) setModal(null); }}
        title="Bulk Import — Students, Classes & Opening Dues"
        width={1180}
      >
        <div>
          {/* ── help ── */}
          <div style={{ padding: "10px 14px", background: `${C.blue}11`, border: `1px solid ${C.blue}22`, borderRadius: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, marginBottom: 6 }}>
              One file creates students + their class & section + guardians + opening dues
            </div>
            {[
              ["Required", ["first_name", "class_name", "date_of_birth"]],
              ["Class", ["class_name", "section_name", "roll_no"]],
              ["Profile", ["admission_no", "middle_name", "last_name", "gender", "admission_date", "blood_group", "nationality", "religion", "caste", "sub_caste", "is_ews", "aadhaar_no", "previous_school", "tc_no", "address_permanent", "address_current", "city", "state", "pincode", "medical_conditions", "disabilities"]],
              ["Guardians", ["guardian_name", "guardian_relation", "guardian_phone", "guardian_email", "guardian2_name", "guardian2_relation", "guardian2_phone", "guardian2_email"]],
              ["Dues (₹)", ["legacy_due", "legacy_due_remark", "extra_fee_title", "extra_fee_amount"]],
            ].map(([label, cols]) => (
              <div key={label} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, width: 70 }}>{label}</span>
                {cols.map((c) => (
                  <span key={c} style={{ fontSize: 10.5, fontFamily: "monospace", background: `${label === "Required" ? C.red : C.blue}22`, color: label === "Required" ? C.red : C.blue, padding: "1px 7px", borderRadius: 4 }}>{c}</span>
                ))}
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.6 }}>
              • Classes and sections that don't exist are <b>created automatically</b> in the current academic year (Nursery → LKG → UKG → 1–12, anything else last).<br />
              • <b>Section blank:</b> class has no section → "A" · class has exactly one section → that one · class has several → you choose in the preview.<br />
              • <b>Class</b> or <b>date of birth</b> missing → row is flagged and is <b>not imported</b> until you pick it in the preview.<br />
              • <b>legacy_due</b> becomes a “Previous Dues” amount that shows up in Fees → Collect and on the receipt. No late fee is added. Regular fee invoices are <b>not</b> created here.<br />
              • Everything else may be left blank. Blank admission_no / roll_no are generated automatically. Dates: YYYY-MM-DD or DD/MM/YYYY.
            </div>
          </div>

          {/* ── actions ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-ghost" onClick={downloadSample} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              <Icon name="download" size={13} /> Download Template CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileChange} style={{ display: "none" }} />
            <button
              className="btn btn-primary"
              disabled={!!bulkProgress && !bulkDone}
              onClick={() => fileRef.current?.click()}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
            >
              <Icon name="plus" size={13} /> {bulkFileName ? "Upload another file" : "Upload CSV File"}
            </button>
            {bulkFileName && <span style={{ fontSize: 12, color: C.textMuted }}>{bulkFileName}</span>}
            {bulkPreview && !bulkProgress && !bulkResult && (
              <button
                className="btn btn-primary"
                disabled={bulkChecking || bulkPreview.summary.ready === 0}
                onClick={handleBulkImport}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, background: C.green, marginLeft: "auto" }}
              >
                <Icon name="check" size={13} /> Import {bulkPreview.summary.ready} students
              </button>
            )}
          </div>

          {bulkParseError && (
            <div style={{ padding: "10px 14px", background: `${C.red}11`, border: `1px solid ${C.red}33`, borderRadius: 8, fontSize: 12.5, color: C.red, marginBottom: 12 }}>
              ⚠ {bulkParseError}
            </div>
          )}

          {bulkChecking && !bulkProgress && (
            <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 10 }}>⏳ Checking file against your classes, sections, admission numbers and fee setup…</div>
          )}

          {/* ── import progress ── */}
          {bulkProgress && !bulkDone && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Importing: {bulkProgress.done} / {bulkProgress.total}
                  {bulkProgress.failed.length > 0 && <span style={{ color: C.red }}> ({bulkProgress.failed.length} failed)</span>}
                </span>
                <span style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>
                  {Math.round((bulkProgress.done / bulkProgress.total) * 100)}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%`, background: C.primary }} />
              </div>
              <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>Please keep this window open until the import finishes.</div>
            </div>
          )}

          {/* ── final result ── */}
          {bulkResult && (
            <div>
              <div style={{ padding: "12px 14px", background: `${bulkResult.imported > 0 ? C.green : C.red}11`, border: `1px solid ${bulkResult.imported > 0 ? C.green : C.red}33`, borderRadius: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: bulkResult.imported > 0 ? C.green : C.red }}>
                  ✓ {bulkResult.imported} of {bulkResult.total} students imported
                </div>
                <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.7 }}>
                  {bulkResult.classes.length > 0 && <div>• New classes created: <b>{bulkResult.classes.join(", ")}</b></div>}
                  {bulkResult.sections.length > 0 && <div>• New sections created: <b>{bulkResult.sections.join(", ")}</b></div>}
                  {bulkResult.invoices > 0 && (
                    <div>
                      • Opening dues added for <b>{bulkResult.invoices}</b> students — Previous Dues <b>{inr(bulkResult.legacy)}</b>
                      {bulkResult.extra > 0 && <> · extra charges <b>{inr(bulkResult.extra)}</b></>} (visible in Fees → Collect)
                    </div>
                  )}
                  {bulkResult.skipped.length + bulkResult.failed.length > 0 && (
                    <div style={{ color: C.red }}>• {bulkResult.skipped.length + bulkResult.failed.length} rows were not imported (see below)</div>
                  )}
                </div>
              </div>
              {bulkResult.skipped.length + bulkResult.failed.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>⚠ Not imported</span>
                    <button className="btn btn-danger" onClick={() => downloadFailedCSV([...bulkResult.skipped, ...bulkResult.failed])} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon name="download" size={12} /> Download Failed CSV
                    </button>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${C.red}33`, borderRadius: 8 }}>
                    {[...bulkResult.skipped, ...bulkResult.failed].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 10px", borderBottom: `1px solid ${C.border}22`, fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>Row {r.line}: {r.first_name || r.full_name} {r.last_name || ""}</span>
                        <span style={{ color: C.red, fontSize: 11, textAlign: "right" }}>{r._err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn btn-ghost" onClick={resetBulk}>Import another file</button>
                <button className="btn btn-primary" onClick={() => setModal(null)}>Close</button>
              </div>
            </div>
          )}

          {/* ── preview ── */}
          {bulkPreview && !bulkProgress && !bulkResult && (() => {
            const S = bulkPreview.summary;
            const classes = bulkPreview.available_classes || [];
            const todayStr = new Date().toISOString().slice(0, 10);
            const shown = bulkPreview.rows.filter((r) =>
              bulkFilter === "errors" ? r.status === "error"
                : bulkFilter === "needs" ? r.status === "needs_input" || r.status === "error"
                  : true
            );
            const ORANGE = "#f97316";
            const stat = (label, value, color) => (
              <div style={{ flex: 1, minWidth: 90, padding: "8px 12px", border: `1px solid ${color}33`, background: `${color}0d`, borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 10.5, color: C.textMuted }}>{label}</div>
              </div>
            );
            const chip = (text, color) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: `${color}22`, color, padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>{text}</span>
            );
            const line = (label, children) => (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 5 }}>
                <span style={{ color: C.textMuted, width: 150 }}>{label}</span>
                {children}
              </div>
            );
            const addBtn = (apply) => (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: "2px 8px" }}
                onClick={(e) => { const inp = e.currentTarget.previousSibling; apply(inp.value); inp.value = ""; }}
              >
                Set
              </button>
            );
            const pickEditor = (options, placeholder, newPlaceholder, apply) => (
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  className="input"
                  value=""
                  onChange={(e) => { if (e.target.value) apply(e.target.value); }}
                  style={{ fontSize: 11, padding: "2px 4px", maxWidth: 130 }}
                >
                  <option value="">{placeholder}</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input
                  className="input"
                  placeholder={newPlaceholder}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(e.target.value); e.target.value = ""; } }}
                  style={{ fontSize: 11, padding: "2px 6px", width: 100 }}
                />
                {addBtn(apply)}
              </div>
            );
            const isoOrEmpty = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : "");
            return (
              <div style={{ opacity: bulkChecking ? 0.6 : 1, transition: "opacity .15s" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {stat("Total rows", S.total, C.blue)}
                  {stat("Ready to import", S.ready, C.green)}
                  {stat("Needs input", S.needs_input, ORANGE)}
                  {stat("Errors (skipped)", S.error, C.red)}
                </div>

                {/* plan */}
                <div style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Import plan · academic year {bulkPreview.academic_year}</div>
                  {line("Existing classes", S.classes_existing.length === 0 ? <span style={{ color: C.textMuted }}>—</span> : S.classes_existing.map((x) => <span key={x.name}>{chip(`${x.name} +${x.students}`, C.green)}</span>))}
                  {line("New classes (auto-created)", S.classes_new.length === 0 ? <span style={{ color: C.textMuted }}>—</span> : S.classes_new.map((x) => <span key={x.name}>{chip(`＋ ${x.name} +${x.students}`, C.blue)}</span>))}
                  {S.classes_restore.length > 0 && line("Deleted — restored", S.classes_restore.map((x) => <span key={x.name}>{chip(`${x.name} +${x.students}`, C.yellow)}</span>))}
                  {line("Sections", S.sections.length === 0 ? <span style={{ color: C.textMuted }}>—</span> : S.sections.map((x) => (
                    <span key={x.class_name + x.name}>
                      {chip(`${x.action === "existing" ? "" : "＋ "}${x.class_name} – ${x.name} +${x.students}`, x.action === "existing" ? C.green : C.blue)}
                    </span>
                  )))}
                  {S.over_capacity.length > 0 && (
                    <div style={{ color: C.yellow, marginBottom: 5 }}>
                      ⚑ Over capacity: {S.over_capacity.map((x) => `${x.class_name} – ${x.name} (${x.total}/${x.max})`).join(", ")}
                    </div>
                  )}
                  <div style={{ color: C.textMuted, marginTop: 6, lineHeight: 1.7 }}>
                    {S.legacy.students > 0 && <div>💰 Previous Dues for <b>{S.legacy.students}</b> students — total <b>{inr(S.legacy.total_paise)}</b>
                      {S.extra.students > 0 && <> · extra charges for {S.extra.students} students (<b>{inr(S.extra.total_paise)}</b>)</>}
                      {S.categories_new.length > 0 && <> · new fee categories: {S.categories_new.join(", ")}</>}
                    </div>}
                    {S.legacy.students === 0 && S.extra.students > 0 && <div>💰 Extra charges for {S.extra.students} students — <b>{inr(S.extra.total_paise)}</b></div>}
                    {S.admission_auto > 0 && <div>• {S.admission_auto} admission numbers and {S.roll_auto} roll numbers will be generated automatically</div>}
                    {S.no_guardian > 0 && <div>• {S.no_guardian} students have no guardian details</div>}
                  </div>
                  {S.needs_class > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}`, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ color: ORANGE, fontWeight: 700 }}>⚑ {S.needs_class} rows have no class — set for all:</span>
                      {pickEditor(classes.map((c) => c.name), "pick class…", "or new class", applyClassToAll)}
                    </div>
                  )}
                </div>

                {/* filter */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                  {[["all", "All"], ["needs", "Needs input / errors"], ["errors", "Errors only"]].map(([k, l]) => (
                    <button key={k} className={`btn ${bulkFilter === k ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 11.5, padding: "4px 10px" }} onClick={() => setBulkFilter(k)}>{l}</button>
                  ))}
                  <span style={{ fontSize: 11.5, color: C.textMuted, marginLeft: 6 }}>Showing {shown.length} of {bulkPreview.rows.length}</span>
                </div>

                <div style={{ overflowX: "auto", maxHeight: 380, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  <table className="table" style={{ fontSize: 11, minWidth: 980 }}>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Student</th>
                        <th style={{ minWidth: 190 }}>Class</th>
                        <th style={{ minWidth: 190 }}>Section</th>
                        <th>Roll</th>
                        <th style={{ minWidth: 120 }}>Date of birth</th>
                        <th>Guardian</th>
                        <th>Opening dues</th>
                        <th style={{ minWidth: 160 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => {
                        const raw = bulkRows[r.idx] || {};
                        const name = [raw.first_name, raw.middle_name, raw.last_name].filter(Boolean).join(" ") || raw.full_name || "—";
                        const isError = r.status === "error";
                        const needs = r.needs || [];
                        const needsInput = r.status === "needs_input";
                        const pl = r.plan;
                        return (
                          <tr key={r.idx} style={{ background: isError ? `${C.red}08` : needsInput ? `${ORANGE}0d` : "transparent", verticalAlign: "top" }}>
                            <td style={{ color: C.textMuted }}>{r.line}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{name}</div>
                              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>
                                {r.admission_no || raw.admission_no || "—"}{r.flags.includes("admission_auto") ? " (auto)" : ""}
                              </div>
                            </td>
                            <td>
                              {needs.includes("class") ? (
                                pickEditor(classes.map((c) => c.name), "pick class…", "or new class", (v) => setRowField(r.idx, "class_name", v))
                              ) : pl ? (
                                <span>{pl.grade.name} {pl.grade.action === "new" ? chip("new", C.blue) : pl.grade.action === "restore" ? chip("restored", C.yellow) : null}</span>
                              ) : (
                                <span style={{ color: C.textMuted }}>{raw.class_name || "—"}</span>
                              )}
                            </td>
                            <td>
                              {needs.includes("section") ? (
                                pickEditor(r.section_options || [], "pick section…", "or new section", (v) => setRowField(r.idx, "section_name", v))
                              ) : pl ? (
                                <span>
                                  {pl.section.name}{" "}
                                  {pl.section.action === "new" ? chip("new", C.blue) : pl.section.action === "restore" ? chip("restored", C.yellow) : null}
                                  {pl.section.how === "default" && <span style={{ color: C.textMuted, fontSize: 10 }}> (default)</span>}
                                  {pl.section.how === "only_section" && <span style={{ color: C.textMuted, fontSize: 10 }}> (only section)</span>}
                                </span>
                              ) : (
                                <span style={{ color: C.textMuted }}>{raw.section_name || "—"}</span>
                              )}
                            </td>
                            <td>{r.roll_no ? <span>{r.roll_no}{r.flags.includes("roll_auto") ? <span style={{ color: C.textMuted, fontSize: 10 }}> (auto)</span> : null}</span> : <span style={{ color: C.textMuted }}>—</span>}</td>
                            <td>
                              {needs.includes("dob") ? (
                                <input
                                  type="date"
                                  className="input"
                                  max={todayStr}
                                  value={isoOrEmpty(raw.date_of_birth)}
                                  onChange={(e) => setRowField(r.idx, "date_of_birth", e.target.value)}
                                  style={{ fontSize: 11, padding: "2px 6px" }}
                                />
                              ) : (
                                <span>{raw.date_of_birth || "—"}</span>
                              )}
                            </td>
                            <td style={{ fontSize: 10.5 }}>
                              <div>{raw.guardian_name || <span style={{ color: C.textMuted }}>—</span>}</div>
                              <div style={{ color: C.textMuted }}>{raw.guardian_phone || ""}</div>
                            </td>
                            <td style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>
                              {r.fee.legacy_paise > 0 && <div style={{ color: C.red, fontWeight: 600 }}>{inr(r.fee.legacy_paise)} <span style={{ color: C.textMuted, fontWeight: 400 }}>previous</span></div>}
                              {r.fee.extra_paise > 0 && <div>{inr(r.fee.extra_paise)} <span style={{ color: C.textMuted }}>{r.fee.extra_title}</span></div>}
                              {!r.fee.legacy_paise && !r.fee.extra_paise && <span style={{ color: C.textMuted }}>—</span>}
                            </td>
                            <td>
                              {isError ? (
                                <div>
                                  <span className="badge badge-red" style={{ fontSize: 10 }}>✕ Skipped</span>
                                  {r.errors.map((m, k) => <div key={k} style={{ color: C.red, fontSize: 10.5, marginTop: 2 }}>{m}</div>)}
                                </div>
                              ) : needsInput ? (
                                <div>
                                  <span style={{ fontSize: 10, background: `${ORANGE}22`, color: ORANGE, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>✎ Needs input</span>
                                  <div style={{ fontSize: 10.5, color: ORANGE, marginTop: 2 }}>{needs.map((n) => NEEDS_LABEL[n]).join(" · ")}</div>
                                </div>
                              ) : r.warnings.length ? (
                                <span className="badge badge-yellow" style={{ fontSize: 10, cursor: "help" }} title={r.warnings.join("\n")}>⚑ Review ({r.warnings.length})</span>
                              ) : (
                                <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Ready</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
                  Rows marked “Needs input” or “Skipped” are not imported. Fix the flagged fields above, or download them after the import, correct the CSV and upload again.
                </div>
              </div>
            );
          })()}

          {!bulkPreview && !bulkChecking && !bulkProgress && !bulkResult && !bulkParseError && (
            <div style={{ textAlign: "center", padding: "28px 0", color: C.textMuted, fontSize: 13 }}>
              Upload a CSV file to preview and validate before importing. Nothing is saved until you click Import.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
