// FILE: teacher-app/src/modules/arrangement/helpers.ts
// Source: admin App.tsx -> DOW_NAMES [11733-11733], STATUS_LABEL_MAP [11734-11734], buildArrangementPlan [11737-11809], autoAssignSuggested [11815-11829]
// @ts-nocheck

// ═══════════════════════════════════════════════════════════════
// ARRANGEMENT / SUBSTITUTION MANAGEMENT MODULE
// Reuses global components (KpiCard, Modal, FormRow, Icon, useDialog,
// C palette, apiRequest, recharts). All gap-finding + suggestion
// ranking computed CLIENT-SIDE from raw backend data.
// ═══════════════════════════════════════════════════════════════

export const DOW_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export const STATUS_LABEL_MAP = { A: "Absent", L: "On Leave", OD: "On Duty" };

 // ── CORE ENGINE: build today's gaps + free-teacher suggestions from raw data ──
// Backend ka draft kabhi partial/malformed aaye to bhi render crash na ho:
// har array default [] ho jata hai, aur sirf valid object hi aage jata hai.
export function normalizeDraft(raw) {
  if (!raw || typeof raw !== "object") return null;
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    ...raw,
    period_slots: arr(raw.period_slots),
    teachers: arr(raw.teachers),
    attendance: arr(raw.attendance),
    timetable: arr(raw.timetable),
    subject_teachers: arr(raw.subject_teachers),
    existing_substitutions: arr(raw.existing_substitutions),
  };
}

export function buildArrangementPlan(rawDraft) {
  const draft = normalizeDraft(rawDraft);
  if (!draft) return { gaps: [], teacherMap: {}, unavailableCount: 0 };

  const teacherMap = {};
  draft.teachers.forEach((t) => { teacherMap[t.teacher_id] = t; });

  // Teachers unavailable today (anything other than Present)
  const unavailable = {};
  draft.attendance.forEach((a) => {
    if (a.status !== "P") unavailable[a.teacher_id] = a.status;
  });

  // subject_id -> Set(teacher_id) qualified to teach it
  const subjectQualified = {};
  draft.subject_teachers.forEach((st) => {
    if (!subjectQualified[st.subject_id]) subjectQualified[st.subject_id] = new Set();
    subjectQualified[st.subject_id].add(st.teacher_id);
  });

  // period_slot_id -> Set(teacher_id) already teaching somewhere that period
  const busyByPeriod = {};
  draft.timetable.forEach((te) => {
    if (!te.teacher_id) return;
    if (!busyByPeriod[te.period_slot_id]) busyByPeriod[te.period_slot_id] = new Set();
    busyByPeriod[te.period_slot_id].add(te.teacher_id);
  });

  // Already-confirmed substitutions today (so we don't double-book a substitute)
  const alreadyAssignedByPeriod = {};
  draft.existing_substitutions.forEach((s) => {
    if (!alreadyAssignedByPeriod[s.period_slot_id]) alreadyAssignedByPeriod[s.period_slot_id] = new Set();
    alreadyAssignedByPeriod[s.period_slot_id].add(s.substitute_teacher_id);
  });

  const existingMap = {};
  draft.existing_substitutions.forEach((s) => { existingMap[`${s.period_slot_id}_${s.section_id}`] = s; });

  // GAPS: every timetable entry whose teacher is unavailable today
  const gaps = draft.timetable
    .filter((te) => te.teacher_id && unavailable[te.teacher_id])
    .map((te) => {
      const busy = busyByPeriod[te.period_slot_id] || new Set();
      const takenBySubst = alreadyAssignedByPeriod[te.period_slot_id] || new Set();
      const existing = existingMap[`${te.period_slot_id}_${te.section_id}`]; // pehle nikal liya, taaki niche exempt kar sakein

      const freeTeachers = draft.teachers.filter((t) =>
        t.teacher_id !== te.teacher_id &&
        !unavailable[t.teacher_id] &&
        !busy.has(t.teacher_id) &&
        // is teacher ko "taken" tabhi maano jab wo KISI AUR gap ke liye confirm hua ho —
        // apne hi gap ke confirmed substitute ko list se mat hatao
        (!takenBySubst.has(t.teacher_id) || t.teacher_id === existing?.substitute_teacher_id)
      );

      const qualifiedSet = subjectQualified[te.subject_id] || new Set();
      const suggested = freeTeachers.filter((t) => qualifiedSet.has(t.teacher_id));
      const others = freeTeachers.filter((t) => !qualifiedSet.has(t.teacher_id));

      return {
        key: `${te.period_slot_id}_${te.section_id}`,
        period_slot_id: te.period_slot_id, section_id: te.section_id, subject_id: te.subject_id,
        section_name: te.section_name, class_name: te.class_name, subject_name: te.subject_name || "Free Period",
        room_no: te.room_no, original_teacher_id: te.teacher_id, original_teacher_name: teacherMap[te.teacher_id]?.full_name || "Unknown / inactive teacher",
        original_status: unavailable[te.teacher_id],
        suggested, others,
        confirmed_substitute_id: existing?.substitute_teacher_id || null,
        confirmed_id: existing?.id || null,
        notified: !!existing?.notified_at,
      };
    });

  return { gaps, teacherMap, unavailableCount: Object.keys(unavailable).length };
}

 // ═══════════════════════════════════════════════════════════════
 // AUTO-ASSIGN — seeds initial selections with top suggested match per gap,
 // respecting "one substitute can't cover two classes in the same period"
 // ═══════════════════════════════════════════════════════════════
export function autoAssignSuggested(gaps) {
  const takenPerPeriod = {};
  const seeded = {};
  gaps.forEach((g) => {
    if (g.confirmed_substitute_id) return; // already saved — leave as-is
    const taken = takenPerPeriod[g.period_slot_id] || new Set();
    const pick = g.suggested.find((t) => !taken.has(t.teacher_id));
    if (pick) {
      seeded[g.key] = pick.teacher_id;
      if (!takenPerPeriod[g.period_slot_id]) takenPerPeriod[g.period_slot_id] = new Set();
      takenPerPeriod[g.period_slot_id].add(pick.teacher_id);
    }
  });
  return seeded;
}
