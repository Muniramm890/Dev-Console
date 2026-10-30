// @ts-nocheck
// Setup -> Academic Sessions: list sessions, create a new one and (optionally) copy the structure of an older session.
// Old sessions are never modified: copy only creates NEW rows for the new session on the server.
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useSession } from "../../contexts/SessionContext";
import { C } from "../../theme/theme";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ymd = (v) => String(v || "").slice(0, 10);
const fmtDate = (v) => {
  const p = ymd(v).split("-");
  return p.length === 3 ? `${p[2]} ${MONTHS[Number(p[1]) - 1]} ${p[0]}` : "-";
};
const pad2 = (n) => String(n).padStart(2, "0");
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m = 1..12

export const COPY_ITEMS = [
  { key: "sections", label: "Classes & sections", hint: "Same sections for every class" },
  { key: "class_teachers", label: "Class teachers", hint: "Only teachers who are still active" },
  { key: "section_subjects", label: "Subjects of each section" },
  { key: "teacher_assignments", label: "Subject teachers", hint: "Teacher for each section and subject" },
  { key: "timetable", label: "Weekly timetable", hint: "Needs the subjects of each section" },
  { key: "fee_structures", label: "Fee structures", hint: "Same amounts - edit them later if fees change" },
];
export const DEFAULT_COPY = {
  sections: true, class_teachers: true, section_subjects: true, teacher_assignments: true, timetable: false, fee_structures: true,
};
const LABELS = {
  sections: "sections", class_teachers: "class teachers", section_subjects: "subject links",
  teacher_assignments: "subject teachers", timetable: "timetable periods", fee_structures: "fee structures",
};
export const copySummary = (copied) => {
  const parts = Object.entries(copied || {}).map(([k, n]) => `${n} ${LABELS[k] || k}`);
  return parts.length ? parts.join(", ") : "nothing";
};

// Source session picker + what to copy (reused by the Add Session form and the Copy Structure modal)
export const SessionCopyOptions = ({ years, fromId, onFromChange, copy, onCopyChange, counts, allowNone }) => (
  <div>
    <FormRow label="Copy structure from">
      <select className="select" value={fromId} onChange={(e) => onFromChange(e.target.value)}>
        {allowNone && <option value="">Do not copy - start empty</option>}
        {years.map((y) => (
          <option key={y.id} value={y.id}>{y.name}</option>
        ))}
      </select>
    </FormRow>
    {fromId && (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {COPY_ITEMS.map((it) => (
          <label key={it.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              style={{ marginTop: 3 }}
              checked={!!copy[it.key]}
              onChange={(e) => onCopyChange({ ...copy, [it.key]: e.target.checked })}
            />
            <span>
              <span style={{ fontWeight: 600 }}>{it.label}</span>
              {counts && counts[it.key] !== undefined && <span style={{ color: C.textMuted }}> ({counts[it.key]})</span>}
              {it.hint && <div style={{ fontSize: 11.5, color: C.textMuted }}>{it.hint}</div>}
            </span>
          </label>
        ))}
        <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>
          Students, attendance, exams, results and fee payments are never copied - they stay with the old session.
          Items that already exist in the new session are skipped, so this is safe to repeat.
        </div>
      </div>
    )}
  </div>
);

// Copy structure into an EXISTING session (also used from the Promotion page when the target has no sections)
export const CopyStructureModal = ({ open, onClose, target, years, onDone }) => {
  const candidates = (years || []).filter((y) => y.id !== target?.id);
  const [fromId, setFromId] = useState("");
  const [copy, setCopy] = useState(DEFAULT_COPY);
  const [counts, setCounts] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    const before = candidates.find((y) => ymd(y.start_date) < ymd(target.start_date)) || candidates[0];
    setFromId(before?.id || "");
    setCopy(DEFAULT_COPY);
    setPreview(null);
  }, [open, target?.id]);

  useEffect(() => {
    setCounts(null);
    setPreview(null);
    if (!open || !fromId) return;
    apiRequest(`/setup/academic-years/copy-preview?from=${fromId}`, "GET")
      .then((r) => setCounts(r?.data || null))
      .catch(() => setCounts(null));
  }, [open, fromId]);

  const run = async (dry) => {
    if (!fromId) return alert("Select the session to copy from.");
    setBusy(true);
    try {
      const res = await apiRequest(`/setup/academic-years/${target.id}/copy-structure`, "POST", {
        from_year_id: fromId, copy, dry_run: dry,
      });
      if (dry) setPreview(res?.data?.copied || {});
      else {
        alert(`Copied into "${target.name}": ${copySummary(res?.data?.copied)}.`);
        onClose();
        onDone && onDone();
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Copy structure into ${target?.name || ""}`}>
      {candidates.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textMuted }}>There is no other session to copy from.</div>
      ) : (
        <>
          <SessionCopyOptions
            years={candidates} fromId={fromId} onFromChange={setFromId}
            copy={copy} onCopyChange={(c) => { setCopy(c); setPreview(null); }} counts={counts}
          />
          {preview && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: `${C.green}11`, border: `1px solid ${C.green}33`, fontSize: 12.5 }}>
              Will add: {copySummary(preview)}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={() => run(true)}>Preview</button>
            <button className="btn btn-primary" style={{ flex: 1, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={() => run(false)}>
              {busy ? "Working..." : "Copy now"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

export const AcademicSessionsTab = () => {
  const { academicYears, reloadAcademicYears, setAcademicYearId } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", is_current: false });
  const [fromId, setFromId] = useState("");
  const [copy, setCopy] = useState(DEFAULT_COPY);
  const [counts, setCounts] = useState(null);
  const [copyTarget, setCopyTarget] = useState(null);

  // Next session starts the day after the latest one ends and runs for the same length
  const suggestNext = () => {
    const latest = academicYears.reduce((m, y) => (!m || ymd(y.end_date) > ymd(m.end_date) ? y : m), null);
    if (!latest) {
      const y = new Date().getFullYear();
      return { name: `${y}-${String(y + 1).slice(2)}`, start_date: `${y}-04-01`, end_date: `${y + 1}-03-31`, is_current: true };
    }
    const [ey, em, ed] = ymd(latest.end_date).split("-").map(Number);
    const start = new Date(Date.UTC(ey, em - 1, ed + 1));
    const sy = start.getUTCFullYear();
    const endY = ey + 1;
    const endD = Math.min(ed, lastDay(endY, em));
    const nameEndYear = endY;
    return {
      name: nameEndYear === sy ? `${sy}` : `${sy}-${String(nameEndYear).slice(2)}`,
      start_date: `${sy}-${pad2(start.getUTCMonth() + 1)}-${pad2(start.getUTCDate())}`,
      end_date: `${endY}-${pad2(em)}-${pad2(endD)}`,
      is_current: false,
    };
  };

  const openAdd = () => {
    setForm(suggestNext());
    const src = academicYears.find((y) => y.is_current) || academicYears[0];
    setFromId(src?.id || "");
    setCopy(DEFAULT_COPY);
    setShowAdd(true);
  };

  useEffect(() => {
    setCounts(null);
    if (!showAdd || !fromId) return;
    apiRequest(`/setup/academic-years/copy-preview?from=${fromId}`, "GET")
      .then((r) => setCounts(r?.data || null))
      .catch(() => setCounts(null));
  }, [showAdd, fromId]);

  const handleCreate = async () => {
    const name = String(form.name || "").trim();
    const sd = ymd(form.start_date);
    const ed = ymd(form.end_date);
    if (!name) return alert("Session name is required.");
    if (!sd || !ed) return alert("Start date and end date are required.");
    if (ed <= sd) return alert("End date must be after the start date.");
    if (academicYears.some((y) => String(y.name).trim().toLowerCase() === name.toLowerCase())) {
      return alert(`A session named "${name}" already exists.`);
    }
    const clash = academicYears.find((y) => sd <= ymd(y.end_date) && ed >= ymd(y.start_date));
    if (clash) {
      return alert(`These dates overlap with the existing session "${clash.name}" (${fmtDate(clash.start_date)} - ${fmtDate(clash.end_date)}).`);
    }
    if (form.is_current) {
      const cur = academicYears.find((y) => y.is_current);
      const ok = window.confirm(
        `Make "${name}" the current session?${cur ? ` "${cur.name}" will no longer be current.` : ""}\nThis changes the active session for the whole school.`
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const body = { name, start_date: sd, end_date: ed, is_current: !!form.is_current };
      if (fromId) { body.copy_from_year_id = fromId; body.copy = copy; }
      const res = await apiRequest("/setup/academic-years", "POST", body);
      setShowAdd(false);
      await reloadAcademicYears();
      if (form.is_current && res?.data?.id) setAcademicYearId(res.data.id);
      alert(`Session "${name}" created.` + (res?.data?.copied ? ` Copied: ${copySummary(res.data.copied)}.` : ""));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <h3 className="syne" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
          <Icon name="academic" size={16} /> Academic Sessions
        </h3>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={openAdd}>
          <Icon name="plus" size={13} /> Add Session
        </button>
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginBottom: 14 }}>
        Every session keeps its own classes, students, results, attendance and fees. Creating a new session never changes an old one.
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
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
                padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${y.is_current ? `${C.green}55` : C.border}`,
                background: y.is_current ? `${C.green}0d` : "transparent",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{y.name}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted }}>{fmtDate(y.start_date)} - {fmtDate(y.end_date)}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {y.is_current && <span className="badge badge-green">Current</span>}
                {y.is_locked && <span className="badge badge-yellow">Locked</span>}
                {!y.is_locked && academicYears.length > 1 && (
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setCopyTarget(y)}>
                    Copy structure
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 12, lineHeight: 1.5 }}>
        Students are not copied. After the new session has its classes and sections, use Promotion to move students into it.
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Academic Session">
        <FormRow label="Session Name (e.g. 2026-27)">
          <input className="input" placeholder="e.g. 2026-27" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormRow>
        <FormGrid>
          <FormRow label="Start Date">
            <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </FormRow>
          <FormRow label="End Date">
            <input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </FormRow>
        </FormGrid>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={!!form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} />
          Make this the current session
        </label>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>
          Sessions cannot overlap or repeat a name.
        </div>

        {academicYears.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <SessionCopyOptions
              years={academicYears} fromId={fromId} onFromChange={setFromId}
              copy={copy} onCopyChange={setCopy} counts={counts} allowNone
            />
          </div>
        )}

        <button className="btn btn-primary" style={{ width: "100%", marginTop: 16, opacity: saving ? 0.7 : 1 }} onClick={handleCreate} disabled={saving}>
          {saving ? "Creating..." : "Create Session"}
        </button>
      </Modal>

      <CopyStructureModal
        open={!!copyTarget} onClose={() => setCopyTarget(null)} target={copyTarget} years={academicYears}
        onDone={reloadAcademicYears}
      />
    </div>
  );
};
