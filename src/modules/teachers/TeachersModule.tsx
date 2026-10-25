// FILE: teacher-app/src/modules/teachers/TeachersModule.tsx
// Source: admin App.tsx -> TeachersModule [6776-8646]
// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { uploadToCloudinary } from "../../api/uploads";
import { Avatar } from "../../components/ui/Avatar";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useSession } from "../../contexts/SessionContext";
import { TeacherCard } from "./TeacherCard";
import { FF } from "../../shared/subjects/FF";
import { TeacherSubjectsAndTimetable } from "../../shared/subjects/TeacherSubjectsAndTimetable";
import { C } from "../../theme/theme";

export const TeachersModule = () => {
  // ── Core data ────────────────────────────────────────────────
  const [teachers, setTeachers] = useState([]);
  const { academicYears: academicYrs, currentYear } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Filters / view ───────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // ── Modals ───────────────────────────────────────────────────
  const [modal, setModal] = useState(null); // 'add'|'edit'|'view'|'terminate'|'bulk'
  const [activeTab, setActiveTab] = useState("personal");
  const [selected, setSelected] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // ── Bulk import ──────────────────────────────────────────────
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkDone, setBulkDone] = useState(false);
  const fileRef = useRef(null);
  const [bulkPreview, setBulkPreview] = useState(null); // server dry-run: { summary, rows, available_subjects }
  const [bulkChecking, setBulkChecking] = useState(false);
  const [bulkParseError, setBulkParseError] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkFilter, setBulkFilter] = useState("all"); // all | attention | errors
  const [bulkFileName, setBulkFileName] = useState("");
  const bulkRowsRef = useRef([]);
  const bulkTimerRef = useRef(null);
  const bulkReqRef = useRef(0);

  // ── Blank form ───────────────────────────────────────────────
  const blankForm = () => ({
    full_name: "",
    email: "",
    phone: "",
    gender: "",
    password: "",
    employee_code: "",
    join_date: new Date().toISOString().split("T")[0],
    department: "",
    designation: "",
    qualification: "",
    experience_years: 0,
    is_active: true,
    date_of_birth: "",
    avatar_url: "",
  });
  const [form, setForm] = useState(blankForm());
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // 🔴 Photo Upload State & Handler
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      // Direct cloud pe jayega aur URL laayega
      const secureUrl = await uploadToCloudinary(file);
      setF("avatar_url", secureUrl); // Form me URL save kar diya
    } catch (err) {
      alert("Failed to upload photo. Check Cloudinary details.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Load ─────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const tRes = await apiRequest("/teachers");
      setTeachers(Array.isArray(tRes?.data) ? tRes.data : []);
    } catch (e) {
      console.error("Failed to load teachers", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────
  const departments = Array.from(
    new Set(teachers.map((t) => t.department).filter(Boolean))
  ).sort();
  

  const filtered = teachers.filter((t) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      t.full_name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.employee_code?.toLowerCase().includes(q);
    const matchDept = !filterDept || t.department === filterDept;
    const matchStatus =
      filterStatus === "active"
        ? t.is_active
        : filterStatus === "inactive"
        ? !t.is_active
        : true;
    return matchSearch && matchDept && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 0;
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterDept, filterStatus]);

  const statTotal = teachers.length;
  const statActive = teachers.filter((t) => t.is_active).length;
  const statDepts = departments.length;

  // ── Open modals ──────────────────────────────────────────────
  const openAdd = () => {
    setForm(blankForm());
    setActiveTab("personal");
    setModal("add");
  };

  const openEdit = (t) => {
    setForm({
      ...blankForm(),
      full_name: t.full_name || "",
      email: t.email || "",
      phone: t.phone || "",
      gender: t.gender || "",
      employee_code: t.employee_code || "",
      join_date: t.join_date?.split("T")[0] || "",
      department: t.department || "",
      designation: t.designation || "",
      qualification: t.qualification || "",
      experience_years: t.experience_years || 0,
      is_active: t.is_active !== undefined ? Boolean(t.is_active) : true,
      date_of_birth: t.date_of_birth?.split("T")[0] || "",
      avatar_url: t.avatar_url || "", // 🔴 Purani photo form mein set hogi
    });
    setSelected(t);
    setActiveTab("personal");
    setModal("edit");
  };

  const openView = async (t) => {
    setSelected(t);
    setViewDetail(null);
    setModal("view");
    setViewLoading(true);
    try {
      const res = await apiRequest(`/teachers/${t.user_id}`);
      setViewDetail(res?.data || t);
    } catch (e) {
      setViewDetail(t);
    } finally {
      setViewLoading(false);
    }
  };

  const openTerminate = (t) => {
    setSelected(t);
    setModal("terminate");
  };

  // ── Save (create / edit) ────────────────────────────────────
  const handleSave = async () => {
    if (!form.full_name?.trim() || !form.email?.trim()) {
      alert("Full name and email are required.");
      return;
    }
    setSaving(true);
    try {
      if (modal === "edit" && selected?.user_id) {
        await apiRequest(`/teachers/${selected.user_id}`, "PUT", {
          full_name: form.full_name.trim(),
          phone: form.phone ? String(form.phone).trim() : null,
          gender: form.gender || null,
          employee_code: form.employee_code ? String(form.employee_code).trim() : null,
          department: form.department || null,
          designation: form.designation || null,
          is_active: Boolean(form.is_active),
          date_of_birth: form.date_of_birth || null,
          avatar_url: form.avatar_url || null,
          qualification: form.qualification || null,
          experience_years: Number(form.experience_years) || 0,
        });
      } else {
        await apiRequest("/teachers", "POST", {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone ? String(form.phone).trim() : null,
          gender: form.gender || null,
          password: form.password?.trim() || undefined,
          employee_code: form.employee_code ? String(form.employee_code).trim() : null,
          join_date: form.join_date || null,
          department: form.department || null,
          designation: form.designation || null,
          qualification: form.qualification || null,
          experience_years: Number(form.experience_years) || 0,
          date_of_birth: form.date_of_birth || null,
          avatar_url: form.avatar_url || null, // 🔴 Naye teacher ke liye avatar_url add kiya
        });
      }
      setModal(null);
      await loadAll();
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Terminate / reactivate ──────────────────────────────────
  const handleTerminate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiRequest(`/teachers/${selected.user_id}`, "DELETE");
      setModal(null);
      await loadAll();
    } catch (e) {
      alert("Termination failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (t) => {
    try {
      await apiRequest(`/teachers/${t.user_id}`, "PUT", {
        full_name: t.full_name,
        phone: t.phone,
        gender: t.gender,
        employee_code: t.employee_code,
        department: t.department,
        designation: t.designation,
        is_active: true,
      });
      await loadAll();
    } catch (e) {
      alert("Reactivation failed: " + e.message);
    }
  };

  // ── Bulk CSV import v2: subjects + payroll, server-side preview ─────────
  // Flow: upload CSV → POST /teachers/bulk-import {dryRun:true} (nothing is saved)
  //       → admin reviews / fixes subjects → POST {dryRun:false} in chunks.
  const BULK_COLS = [
    "full_name", "email", "phone", "gender", "password", "employee_code",
    "join_date", "date_of_birth", "department", "designation", "qualification",
    "experience_years", "role", "subjects",
    "basic", "hra", "da", "special_allowance", "other_allowance",
    "pf_deduction", "pt_deduction", "other_deduction", "effective_from",
    "account_holder", "account_number", "ifsc_code", "bank_name",
    "branch_name", "upi_id", "pan_number",
  ];
  const BULK_ALIASES = {
    name: "full_name", fullname: "full_name", mobile: "phone", mobile_no: "phone",
    phone_number: "phone", contact: "phone", employee_id: "employee_code",
    emp_code: "employee_code", subject: "subjects", dob: "date_of_birth",
    joining_date: "join_date", experience: "experience_years", ifsc: "ifsc_code",
    pan: "pan_number", account_no: "account_number", acc_no: "account_number",
    special: "special_allowance", pf: "pf_deduction", pt: "pt_deduction",
  };
  const BULK_CHUNK = 25;
  const BULK_MAX_ROWS = 1000;

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
      return BULK_ALIASES[k] || k;
    });
    if (!header.includes("full_name") || !header.includes("email")) {
      return { error: "Header row must contain at least: full_name, email (download the template to see all columns)." };
    }
    if (table.length - 1 > BULK_MAX_ROWS) {
      return { error: `Too many rows (max ${BULK_MAX_ROWS} per file). Split the file and import in parts.` };
    }
    const rows = table.slice(1).map((vals, i) => {
      const r = { line: i + 2 };
      header.forEach((h, ci) => {
        if (BULK_COLS.includes(h)) r[h] = (vals[ci] ?? "").trim();
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
      const res = await apiRequest("/teachers/bulk-import", "POST", { dryRun: true, rows });
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

  // ── subject editing inside the preview ──
  const splitSubj = (v) => String(v || "").split(/[|;]/).map((x) => x.trim()).filter(Boolean);
  const applyRowsChange = (next) => {
    bulkRowsRef.current = next;
    setBulkRows(next);
    clearTimeout(bulkTimerRef.current);
    bulkTimerRef.current = setTimeout(() => runBulkPreview(next), 350);
  };
  const setRowSubjects = (idx, names) => {
    const seen = new Set();
    const clean = names.filter((n) => {
      const k = n.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    applyRowsChange(bulkRowsRef.current.map((r, i) => (i === idx ? { ...r, subjects: clean.join("|") } : r)));
  };
  const rowSubjectNames = (idx) => splitSubj(bulkRowsRef.current[idx]?.subjects);
  const addRowSubject = (idx, name) => {
    const n = String(name || "").trim().replace(/\s+/g, " ");
    if (!n) return;
    setRowSubjects(idx, [...rowSubjectNames(idx), n]);
  };
  const removeRowSubject = (idx, name) =>
    setRowSubjects(idx, rowSubjectNames(idx).filter((c) => c.toLowerCase() !== name.toLowerCase()));
  const replaceRowSubject = (idx, from, to) =>
    setRowSubjects(idx, rowSubjectNames(idx).map((c) => (c.toLowerCase() === from.toLowerCase() ? to : c)));
  const replaceSubjectEverywhere = (from, to) => {
    applyRowsChange(
      bulkRowsRef.current.map((r) => {
        const names = splitSubj(r.subjects);
        if (!names.some((c) => c.toLowerCase() === from.toLowerCase())) return r;
        const seen = new Set();
        const out = names
          .map((c) => (c.toLowerCase() === from.toLowerCase() ? to : c))
          .filter((c) => (seen.has(c.toLowerCase()) ? false : (seen.add(c.toLowerCase()), true)));
        return { ...r, subjects: out.join("|") };
      })
    );
  };

  // ── commit (server re-validates everything; one DB transaction per teacher) ──
  const handleBulkImport = async () => {
    if (!bulkPreview || bulkChecking) return;
    const rows = bulkRowsRef.current;
    const okIdx = bulkPreview.rows.filter((r) => r.status !== "error").map((r) => r.idx);
    if (!okIdx.length) { alert("No valid rows to import."); return; }
    const skipped = bulkPreview.rows
      .filter((r) => r.status === "error")
      .map((r) => ({ ...rows[r.idx], _err: r.errors.join("; ") }));

    setBulkProgress({ done: 0, total: okIdx.length, failed: [] });
    setBulkDone(false);
    const failed = [];
    const created = new Set();
    const restored = new Set();
    let imported = 0;
    let links = 0;

    for (let st = 0; st < okIdx.length; st += BULK_CHUNK) {
      const slice = okIdx.slice(st, st + BULK_CHUNK);
      let abort = false;
      try {
        const res = await apiRequest("/teachers/bulk-import", "POST", {
          dryRun: false,
          rows: slice.map((i) => rows[i]),
        });
        const d = res.data;
        imported += d.summary.imported;
        links += d.summary.links_added;
        d.summary.subjects_created.forEach((n) => created.add(n));
        d.summary.subjects_restored.forEach((n) => restored.add(n));
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
      total: rows.length,
      imported,
      links,
      created: [...created],
      restored: [...restored],
      skipped,
      failed,
    });
    setBulkDone(true);
    await loadAll();
  };

  const downloadFailedCsv = (failed) => {
    downloadCsv("failed_staff_import.csv", [
      [...BULK_COLS, "error_reason"].join(","),
      ...failed.map((r) => [...BULK_COLS.map((c) => csvCell(r[c])), csvCell(r._err)].join(",")),
    ]);
  };

  const downloadTemplate = () => {
    const mk = (o) => BULK_COLS.map((c) => csvCell(o[c])).join(",");
    downloadCsv("staff_import_template.csv", [
      BULK_COLS.join(","),
      mk({
        full_name: "Ramesh Kumar Sharma", email: "ramesh@school.edu", phone: "9876543210", gender: "Male",
        employee_code: "EMP001", join_date: "2023-04-01", date_of_birth: "1985-06-15", department: "Mathematics",
        designation: "PGT Mathematics", qualification: "M.Sc B.Ed", experience_years: "8", role: "teacher",
        subjects: "Mathematics|Physics", basic: "35000", hra: "14000", da: "7000", special_allowance: "3000",
        other_allowance: "0", pf_deduction: "1800", pt_deduction: "200", other_deduction: "0",
        effective_from: "2023-04-01", account_holder: "Ramesh Kumar Sharma", account_number: "123456789012",
        ifsc_code: "SBIN0001234", bank_name: "State Bank of India", branch_name: "Jaipur Main",
        upi_id: "ramesh@upi", pan_number: "ABCDE1234F",
      }),
      mk({
        full_name: "Sunita Devi", email: "sunita@school.edu", phone: "9812345678", gender: "Female",
        employee_code: "EMP002", join_date: "2023-04-01", department: "Languages", designation: "TGT Hindi",
        qualification: "M.A B.Ed", experience_years: "5", role: "teacher", subjects: "Hindi|Sanskrit",
        basic: "28000", hra: "11200", da: "5600", pf_deduction: "1440", pt_deduction: "200",
        account_number: "998877665544", ifsc_code: "HDFC0001234", bank_name: "HDFC Bank",
      }),
      mk({
        full_name: "Mahesh Gupta", email: "mahesh@school.edu", phone: "9898989898", gender: "Male",
        employee_code: "EMP003", join_date: "2022-07-01", department: "Accounts", designation: "Accountant",
        experience_years: "10", role: "accountant", subjects: "", basic: "22000", hra: "8800",
      }),
      mk({
        full_name: "Anita Verma", email: "anita@school.edu", phone: "9700000001", gender: "Female",
        employee_code: "EMP004", join_date: "2024-04-01", department: "Science", designation: "TGT Science",
        role: "teacher", subjects: "",
      }),
    ]);
  };

  // ── UI helpers ─────────────────────────────────────────────
  // 🔴 FIX: TabBtn is a plain function — always call as TabBtn({...}),
  // never as <TabBtn/>. Prevents input remount on every keystroke.
  const TabBtn = ({ id, label, icon }) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      style={{
        padding: "7px 13px",
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

  // 🔴 FIX: FormBody is a plain function — always call as {FormBody()},
  // never as <FormBody/>. This is what stops the cursor from jumping
  // out of the "Add Teacher" / "Edit Teacher" inputs after one letter.
  const FormBody = () => (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          borderBottom: `1px solid ${C.border}44`,
          flexWrap: "wrap",
        }}
      >
        {TabBtn({ id: "personal", label: "Personal", icon: "user" })}
        {TabBtn({ id: "employment", label: "Employment", icon: "academic" })}
        {TabBtn({ id: "profile", label: "Photo", icon: "dashboard" })}
        {modal === "add" &&
          TabBtn({ id: "security", label: "Password", icon: "setup" })}
      </div>

      {activeTab === "personal" && (
        <div>
          <FormGrid cols={2}>
            <FormRow label="Full Name *">
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => setF("full_name", e.target.value)}
              />
            </FormRow>
            <FormRow label="Official Email *">
              <input
                className="input"
                type="email"
                value={form.email}
                disabled={modal === "edit"}
                style={modal === "edit" ? { opacity: 0.6 } : {}}
                onChange={(e) => setF("email", e.target.value)}
              />
            </FormRow>
          </FormGrid>
          <FormGrid cols={3}>
            <FF
              form={form}
              setF={setF}
              label="Phone / WhatsApp"
              name="phone"
              type="tel"
            />
            <FF
              form={form}
              setF={setF}
              label="Gender"
              name="gender"
              options={["", "Male", "Female", "Other"]}
            />
            <FF
              form={form}
              setF={setF}
              label="Date of Birth"
              name="date_of_birth"
              type="date"
              hint="Saved once backend adds this to update()"
            />
          </FormGrid>
        </div>
      )}

      {activeTab === "employment" && (
        <div>
          <FormGrid cols={2}>
            <FF
              form={form}
              setF={setF}
              label="Employee Code"
              name="employee_code"
              placeholder="EMP-001"
            />
            <FF
              form={form}
              setF={setF}
              label="Date of Joining"
              name="join_date"
              type="date"
            />
          </FormGrid>
          <FormGrid cols={2}>
            <FF
              form={form}
              setF={setF}
              label="Department"
              name="department"
              placeholder="Mathematics"
            />
            <FF
              form={form}
              setF={setF}
              label="Designation"
              name="designation"
              placeholder="PGT Mathematics"
            />
          </FormGrid>
          <FormGrid cols={2}>
            <FF
              form={form}
              setF={setF}
              label="Qualification"
              name="qualification"
              placeholder="M.Sc, B.Ed"
            />
            <FF
              form={form}
              setF={setF}
              label="Experience (Years)"
              name="experience_years"
              type="number"
            />
          </FormGrid>
          {modal === "edit" && (
            <FF
              form={form}
              setF={setF}
              label="Active Staff Member"
              name="is_active"
              type="checkbox"
            />
          )}
        </div>
      )}

    {activeTab === "profile" && (
        <div style={{ padding: "10px 0" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 24, 
            background: C.surfaceAlt, 
            padding: 24, 
            borderRadius: 16, 
            border: `1px solid ${C.border}` 
          }}>
            {/* Live Preview Avatar */}
            <Avatar
              teacher={{
                avatar_url: form.avatar_url,
                full_name: form.full_name,
                gender: form.gender,
              }}
              size={80}
            />
            
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                Profile Photo
              </div>
              
              {/* Hidden File Input */}
              <input 
                type="file" 
                id="photo-upload" 
                accept="image/*" 
                style={{ display: "none" }} 
                onChange={handlePhotoUpload} 
                disabled={uploadingPhoto}
              />
              
              {/* Styled Upload Button */}
              <label 
                htmlFor="photo-upload" 
                className="btn btn-primary" 
                style={{ 
                  cursor: uploadingPhoto ? "wait" : "pointer", 
                  opacity: uploadingPhoto ? 0.7 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {uploadingPhoto ? (
                  <><span className="pulse" style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%" }}/> Uploading...</>
                ) : (
                  <><Icon name="plus" size={14} /> Select Photo</>
                )}
              </label>
              
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
                Recommended: Square JPG or PNG, max 2MB.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "security" && modal === "add" && (
        <div>
          <div
            style={{
              padding: "12px 14px",
              background: `${C.blue}11`,
              border: `1px solid ${C.blue}22`,
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 12,
              color: C.textMuted,
              lineHeight: 1.7,
            }}
          >
            Leave blank to use the default password (<b>teacher123</b>). Teacher
            can change it after first login.
          </div>
          <FormRow label="Initial Password">
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setF("password", e.target.value)}
              placeholder="auto: teacher123"
            />
          </FormRow>
        </div>
      )}
    </div>
  );

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="slide-in">
      <SectionHeader
        title="Teacher & Staff Directory"
        sub={`${statTotal} staff on record`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
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
              <Icon name="plus" size={14} /> Add Teacher
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div
        className="grid-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {[
          {
            label: "Total Staff",
            value: loading ? "—" : statTotal,
            color: C.blue,
            icon: "teachers",
          },
          {
            label: "Active",
            value: loading ? "—" : statActive,
            color: C.green,
            icon: "check",
          },
          {
            label: "Departments",
            value: loading ? "—" : statDepts,
            color: C.purple,
            icon: "academic",
          },
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
                  {k.value}
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

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: 14, padding: "12px 16px" }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
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
              placeholder="Search by name, email, employee code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
          <select
            className="select"
            style={{ width: 160 }}
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 130 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Terminated</option>
            <option value="">All</option>
          </select>
          <div
            style={{
              display: "flex",
              background: C.surfaceAlt,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
              marginLeft: "auto",
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
              >
                <Icon name={icon} size={14} />
              </button>
            ))}
          </div>
          <div
            style={{
              fontSize: 12,
              color: C.textMuted,
              fontWeight: 600,
              minWidth: 70,
            }}
          >
            {filtered.length} found
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: C.primary,
            fontWeight: 600,
          }}
        >
          <div className="pulse">Loading staff records…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>👨‍🏫</div>
          <div
            className="syne"
            style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}
          >
            No staff found
          </div>
          <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 18 }}>
            {teachers.length === 0
              ? "Add your first teacher to get started."
              : "Adjust filters to see results."}
          </div>
          {teachers.length === 0 && (
            <button className="btn btn-primary" onClick={openAdd}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="plus" size={14} /> Add Teacher
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
          {pageData.map((t) =>
            TeacherCard({
              t,
              onView: openView,
              onEdit: openEdit,
              onTerminate: openTerminate,
              onReactivate: handleReactivate,
            })
          )}
        </div>
      ) : (
        <div
          className="card"
          style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Qualification</th>
                  <th>Exp</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((t) => (
                  <tr key={t.user_id}>
                    <td>
                      <Avatar teacher={t} size={32} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {t.full_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        {t.email}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{t.department || "—"}</td>
                    <td style={{ fontSize: 12 }}>{t.designation || "—"}</td>
                    <td
                      style={{
                        fontSize: 12,
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.qualification || "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {t.experience_years != null
                        ? `${t.experience_years}y`
                        : "—"}
                    </td>
                    <td style={{ fontSize: 12, fontFamily: "monospace" }}>
                      {t.phone || "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          t.is_active ? "badge-green" : "badge-red"
                        }`}
                      >
                        {t.is_active ? "Active" : "Terminated"}
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
                          style={{ padding: "4px 7px" }}
                          onClick={() => openView(t)}
                        >
                          <Icon name="eye" size={12} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "4px 7px" }}
                          onClick={() => openEdit(t)}
                        >
                          <Icon name="edit" size={12} />
                        </button>
                        {t.is_active ? (
                          <button
                            className="btn btn-danger"
                            style={{ padding: "4px 7px" }}
                            onClick={() => openTerminate(t)}
                          >
                            <Icon name="trash" size={12} />
                          </button>
                        ) : (
                          <button
                            className="btn btn-success"
                            style={{ padding: "4px 7px" }}
                            onClick={() => handleReactivate(t)}
                          >
                            <Icon name="check" size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 4px",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 12, color: C.textMuted }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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
                  onClick={() => setPage(pg)}
                  style={{
                    padding: "5px 10px",
                    fontSize: 12,
                    background: pg === page ? `${C.primary}22` : "transparent",
                    color: pg === page ? C.primary : C.textMuted,
                  }}
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

      {/* ════ MODAL: ADD / EDIT ════ */}
      <Modal
        open={modal === "add" || modal === "edit"}
        onClose={() => setModal(null)}
        title={
          modal === "edit" ? `Edit: ${selected?.full_name}` : "Add New Teacher"
        }
        width={680}
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
            style={{ minWidth: 150, opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? "Saving…"
              : modal === "edit"
              ? "Update Profile"
              : "Create Staff Account"}
          </button>
        </div>
      </Modal>

      {/* ════ MODAL: VIEW ════ */}
      <Modal
        open={modal === "view"}
        onClose={() => setModal(null)}
        title="Staff Profile"
        width={700}
      >
        {viewLoading ? (
          <div
            style={{ padding: 40, textAlign: "center", color: C.primary }}
            className="pulse"
          >
            Loading profile…
          </div>
        ) : (
          viewDetail &&
          (() => {
            const t = viewDetail;
            return (
              <div>
                <div
                  style={{
                    background: `linear-gradient(135deg,${C.surfaceAlt},${C.surface})`,
                    border: `1px solid ${C.border}`,
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <Avatar teacher={t} size={72} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="syne"
                        style={{ fontSize: 20, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {t.full_name}
                      </div>
                      <div
                        style={{
                          color: C.primary,
                          fontWeight: 600,
                          fontSize: 14,
                          marginTop: 2,
                        }}
                      >
                        {t.designation || "Teacher"}
                        {t.department && (
                          <span style={{ color: C.textMuted, fontWeight: 400 }}>
                            {" "}
                            · {t.department}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: 12,
                          marginTop: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.email}
                        {t.phone && <span> · {t.phone}</span>}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          marginTop: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {t.is_active ? (
                          <span className="badge badge-green">Active</span>
                        ) : (
                          <span className="badge badge-red">Terminated</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  {[
                    ["Employee Code", t.employee_code || "—"],
                    [
                      "Experience",
                      t.experience_years != null
                        ? `${t.experience_years} years`
                        : "—",
                    ],
                    ["Qualification", t.qualification || "—"],
                    ["Gender", t.gender || "—"],
                    [
                      "Joined",
                      t.join_date
                        ? new Date(t.join_date).toLocaleDateString("en-IN")
                        : "—",
                    ],
                    [
                      "Date of Birth",
                      t.date_of_birth
                        ? new Date(t.date_of_birth).toLocaleDateString("en-IN")
                        : "Not set",
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
                          fontSize: 10,
                          color: C.textMuted,
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        {k}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Read-only viewer — subjects/timetable already assigned elsewhere.
                    This is informational only, NOT part of the assignment system,
                    so it stays. */}
                <TeacherSubjectsAndTimetable
                  teacher={t}
                  academicYearId={currentYear?.id}
                />

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                    marginTop: 8,
                  }}
                >
                  <button
                    className="btn btn-ghost"
                    onClick={() => setModal(null)}
                  >
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setModal(null);
                      openEdit(t);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Icon name="edit" size={13} /> Edit Profile
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </Modal>

      {/* ════ MODAL: TERMINATE ════ */}
      <Modal
        open={modal === "terminate"}
        onClose={() => setModal(null)}
        title="Terminate Staff Member"
        width={460}
      >
        {selected && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ marginBottom: 16 }}>
              <Avatar teacher={selected} size={60} />
            </div>
            <div
              className="syne"
              style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}
            >
              {selected.full_name}
            </div>
            <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 6 }}>
              {selected.designation || "Teacher"} · {selected.department || ""}
            </div>
            <div
              style={{
                padding: "12px 16px",
                background: `${C.red}11`,
                border: `1px solid ${C.red}22`,
                borderRadius: 10,
                marginBottom: 20,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: C.red,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                ⚠ This will:
              </div>
              <div
                style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}
              >
                • Mark the staff member inactive (soft delete — record is kept)
                <br />
                • Block their login to the ERP
                <br />• They can be reactivated later from this same screen
              </div>
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
                onClick={handleTerminate}
                disabled={saving}
                style={{ minWidth: 160, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Processing…" : "Confirm Termination"}
              </button>
            </div>
          </div>
        )}
      </Modal>

            {/* ════ MODAL: BULK IMPORT (v2 — subjects + payroll) ════ */}
      <Modal
        open={modal === "bulk"}
        onClose={() => { if (!(bulkProgress && !bulkDone)) setModal(null); }}
        title="Bulk Import — Staff, Subjects & Payroll"
        width={1120}
      >
        <div>
          {/* ── help ── */}
          <div style={{ padding: "10px 14px", background: `${C.blue}11`, border: `1px solid ${C.blue}22`, borderRadius: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.blue, marginBottom: 6 }}>
              One file onboards teachers + their subjects + salary + bank details
            </div>
            {[
              ["Required", ["full_name", "email", "phone"]],
              ["Profile", ["gender", "password", "employee_code", "join_date", "date_of_birth", "department", "designation", "qualification", "experience_years", "role"]],
              ["Subjects", ["subjects"]],
              ["Payroll", ["basic", "hra", "da", "special_allowance", "other_allowance", "pf_deduction", "pt_deduction", "other_deduction", "effective_from"]],
              ["Bank", ["account_holder", "account_number", "ifsc_code", "bank_name", "branch_name", "upi_id", "pan_number"]],
            ].map(([label, cols]) => (
              <div key={label} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, width: 62 }}>{label}</span>
                {cols.map((c) => (
                  <span key={c} style={{ fontSize: 10.5, fontFamily: "monospace", background: `${label === "Required" ? C.red : C.blue}22`, color: label === "Required" ? C.red : C.blue, padding: "1px 7px", borderRadius: 4 }}>{c}</span>
                ))}
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.6 }}>
              • <b>subjects</b>: separate several with <code>|</code> (e.g. <code>Mathematics|Physics</code>). Existing school subjects are reused — the teacher is simply added to them; only brand-new names are created.<br />
              • Blank subject → teacher is imported <b>unassigned</b> (not failed). You can pick a subject for them in the preview.<br />
              • <b>role</b>: teacher (default), librarian, accountant, management. Subjects apply to teachers only.<br />
              • Salary / bank columns are optional — leave blank to set them later in Payroll. Blank <code>password</code> = <b>teacher123</b>.<br />
              • <b>Email and phone must be unique across the whole system.</b>
            </div>
          </div>

          {/* ── actions ── */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-ghost" onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
              <Icon name="download" size={13} /> Download Template
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
                disabled={bulkChecking || bulkPreview.rows.filter((r) => r.status !== "error").length === 0}
                onClick={handleBulkImport}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, background: C.green, marginLeft: "auto" }}
              >
                <Icon name="check" size={13} /> Import {bulkPreview.rows.filter((r) => r.status !== "error").length} staff
              </button>
            )}
          </div>

          {bulkParseError && (
            <div style={{ padding: "10px 14px", background: `${C.red}11`, border: `1px solid ${C.red}33`, borderRadius: 8, fontSize: 12.5, color: C.red, marginBottom: 12 }}>
              ⚠ {bulkParseError}
            </div>
          )}

          {bulkChecking && !bulkProgress && (
            <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 10 }}>⏳ Checking file against your school's subjects, staff and payroll data…</div>
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
                  ✓ {bulkResult.imported} of {bulkResult.total} staff imported
                </div>
                <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.7 }}>
                  {bulkResult.links > 0 && <div>• {bulkResult.links} teacher–subject assignments added</div>}
                  {bulkResult.created.length > 0 && <div>• New subjects created: <b>{bulkResult.created.join(", ")}</b></div>}
                  {bulkResult.restored.length > 0 && <div>• Previously deleted subjects restored: <b>{bulkResult.restored.join(", ")}</b></div>}
                  {bulkResult.skipped.length + bulkResult.failed.length > 0 && (
                    <div style={{ color: C.red }}>• {bulkResult.skipped.length + bulkResult.failed.length} rows were not imported (see below)</div>
                  )}
                </div>
              </div>
              {bulkResult.skipped.length + bulkResult.failed.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: C.red, fontWeight: 700 }}>⚠ Not imported</span>
                    <button className="btn btn-danger" onClick={() => downloadFailedCsv([...bulkResult.skipped, ...bulkResult.failed])} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon name="download" size={12} /> Download Failed CSV
                    </button>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${C.red}33`, borderRadius: 8 }}>
                    {[...bulkResult.skipped, ...bulkResult.failed].map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 10px", borderBottom: `1px solid ${C.border}22`, fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>Row {r.line}: {r.full_name} ({r.email})</span>
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
            const subjectOptions = bulkPreview.available_subjects || [];
            const shown = bulkPreview.rows.filter((r) =>
              bulkFilter === "errors" ? r.status === "error"
                : bulkFilter === "attention" ? r.status === "error" || r.flags.includes("no_subject")
                  : true
            );
            const stat = (label, value, color) => (
              <div style={{ flex: 1, minWidth: 90, padding: "8px 12px", border: `1px solid ${color}33`, background: `${color}0d`, borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 10.5, color: C.textMuted }}>{label}</div>
              </div>
            );
            const chip = (text, color, extra) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: `${color}22`, color, padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>{text}{extra}</span>
            );
            return (
              <div style={{ opacity: bulkChecking ? 0.6 : 1, transition: "opacity .15s" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {stat("Total rows", S.total, C.blue)}
                  {stat("Ready", S.ok, C.green)}
                  {stat("Needs review", S.warning, C.yellow)}
                  {stat("Errors (skipped)", S.error, C.red)}
                </div>

                {/* subject plan */}
                <div style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Subjects plan</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ color: C.textMuted, width: 150 }}>Existing — teachers added</span>
                    {S.subjects_existing.length === 0 && <span style={{ color: C.textMuted }}>—</span>}
                    {S.subjects_existing.map((x) => <React.Fragment key={x.subject_id}>{chip(`${x.name} +${x.teachers_to_add}`, C.green)}</React.Fragment>)}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ color: C.textMuted, width: 150 }}>New — will be created</span>
                    {S.subjects_new.length === 0 && <span style={{ color: C.textMuted }}>—</span>}
                    {S.subjects_new.map((x) => (
                      <React.Fragment key={x.name}>
                        {chip(`${x.name} +${x.teachers_to_add}`, C.blue,
                          x.suggestion ? (
                            <button
                              onClick={() => replaceSubjectEverywhere(x.name, x.suggestion.name)}
                              title={`Replace "${x.name}" with the existing subject "${x.suggestion.name}" in all rows`}
                              style={{ border: "none", background: "transparent", color: C.yellow, cursor: "pointer", fontSize: 10.5, fontWeight: 700, padding: 0 }}
                            >
                              ≈ use “{x.suggestion.name}”?
                            </button>
                          ) : null
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {S.subjects_restore.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ color: C.textMuted, width: 150 }}>Deleted — will be restored</span>
                      {S.subjects_restore.map((x) => <React.Fragment key={x.subject_id}>{chip(`${x.name} +${x.teachers_to_add}`, C.yellow)}</React.Fragment>)}
                    </div>
                  )}
                  <div style={{ color: C.textMuted, marginTop: 6, lineHeight: 1.6 }}>
                    {S.unassigned > 0 && <div style={{ color: C.yellow }}>⚑ {S.unassigned} teacher(s) have no subject — pick one below, or leave them unassigned.</div>}
                    {S.no_salary > 0 && <div>• {S.no_salary} without salary structure · {S.no_bank} without bank details (can be added later in Payroll)</div>}
                  </div>
                </div>

                {/* filter */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                  {[["all", "All"], ["attention", "Needs attention"], ["errors", "Errors only"]].map(([k, l]) => (
                    <button key={k} className={`btn ${bulkFilter === k ? "btn-primary" : "btn-ghost"}`} style={{ fontSize: 11.5, padding: "4px 10px" }} onClick={() => setBulkFilter(k)}>{l}</button>
                  ))}
                  <span style={{ fontSize: 11.5, color: C.textMuted, marginLeft: 6 }}>Showing {shown.length} of {bulkPreview.rows.length}</span>
                </div>

                <div style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                  <table className="table" style={{ fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Name</th>
                        <th>Email / Phone</th>
                        <th>Role</th>
                        <th style={{ minWidth: 300 }}>Subjects</th>
                        <th>Pay</th>
                        <th style={{ minWidth: 170 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => {
                        const raw = bulkRows[r.idx] || {};
                        const role = String(raw.role || "teacher").toLowerCase();
                        const isError = r.status === "error";
                        const editable = !isError && role === "teacher";
                        const noSub = !isError && r.flags.includes("no_subject");
                        const have = new Set(r.subjects.map((x) => x.name.toLowerCase()));
                        return (
                          <tr key={r.idx} style={{ background: isError ? `${C.red}08` : noSub ? `${C.yellow}0d` : "transparent", verticalAlign: "top" }}>
                            <td style={{ color: C.textMuted }}>{r.line}</td>
                            <td style={{ fontWeight: 600 }}>{raw.full_name}</td>
                            <td style={{ fontSize: 10.5 }}>
                              <div style={{ fontFamily: "monospace" }}>{raw.email}</div>
                              <div style={{ color: C.textMuted }}>{raw.phone || "—"}</div>
                            </td>
                            <td>{role}</td>
                            <td>
                              {role !== "teacher" ? (
                                <span style={{ color: C.textMuted }}>— (non-teaching)</span>
                              ) : (
                                <div>
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: editable ? 4 : 0 }}>
                                    {r.subjects.length === 0 && <span style={{ color: noSub ? C.yellow : C.textMuted, fontWeight: noSub ? 700 : 400 }}>{noSub ? "Unassigned" : "—"}</span>}
                                    {r.subjects.map((x) => (
                                      <span key={x.name}>
                                        {chip(
                                          `${x.action === "new" ? "＋ " : ""}${x.name}`,
                                          x.action === "existing" ? C.green : x.action === "restore" ? C.yellow : C.blue,
                                          editable ? (
                                            <button onClick={() => removeRowSubject(r.idx, x.name)} title="Remove" style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                                          ) : null
                                        )}
                                        {editable && x.action === "new" && x.suggestion && (
                                          <button
                                            onClick={() => replaceRowSubject(r.idx, x.name, x.suggestion.name)}
                                            title={`Use existing subject "${x.suggestion.name}" instead`}
                                            style={{ border: "none", background: "transparent", color: C.yellow, cursor: "pointer", fontSize: 10, fontWeight: 700 }}
                                          >
                                            ≈ {x.suggestion.name}?
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                  {editable && (
                                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                      <select
                                        className="input"
                                        value=""
                                        onChange={(e) => { if (e.target.value) addRowSubject(r.idx, e.target.value); }}
                                        style={{ fontSize: 11, padding: "2px 4px", maxWidth: 140 }}
                                      >
                                        <option value="">+ existing subject…</option>
                                        {subjectOptions.filter((o) => !have.has(o.name.toLowerCase())).map((o) => (
                                          <option key={o.id} value={o.name}>{o.name}</option>
                                        ))}
                                      </select>
                                      <input
                                        className="input"
                                        placeholder="or new subject"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") { e.preventDefault(); addRowSubject(r.idx, e.target.value); e.target.value = ""; }
                                        }}
                                        style={{ fontSize: 11, padding: "2px 6px", width: 110 }}
                                      />
                                      <button
                                        className="btn btn-ghost"
                                        style={{ fontSize: 11, padding: "2px 8px" }}
                                        onClick={(e) => { const inp = e.currentTarget.previousSibling; addRowSubject(r.idx, inp.value); inp.value = ""; }}
                                      >
                                        Add
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: 10.5, whiteSpace: "nowrap" }}>
                              <div style={{ color: r.flags.includes("no_salary") ? C.textMuted : C.green }}>Salary {r.flags.includes("no_salary") ? "—" : "✓"}</div>
                              <div style={{ color: r.flags.includes("no_bank") ? C.textMuted : C.green }}>Bank {r.flags.includes("no_bank") ? "—" : "✓"}</div>
                            </td>
                            <td>
                              {isError ? (
                                <div>
                                  <span className="badge badge-red" style={{ fontSize: 10 }}>✕ Skipped</span>
                                  {r.errors.map((m, k) => <div key={k} style={{ color: C.red, fontSize: 10.5, marginTop: 2 }}>{m}</div>)}
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
                  Rows marked “Skipped” will not be imported; you can download them as a CSV after the import, fix them and upload again.
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
