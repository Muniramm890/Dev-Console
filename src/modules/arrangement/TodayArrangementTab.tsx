// FILE: teacher-app/src/modules/arrangement/TodayArrangementTab.tsx
// Source: admin App.tsx -> TodayArrangementTab [11901-12095]
// @ts-nocheck

import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { KpiCard } from "../../components/ui/KpiCard";
import { useDialog } from "../../contexts/DialogContext";
import { TeacherArrangementCard } from "./TeacherArrangementCard";
import { DOW_NAMES, autoAssignSuggested, buildArrangementPlan, normalizeDraft } from "./helpers";
import { C } from "../../theme/theme";
import { todayISO } from "../../utils/date";

// ═══════════════════════════════════════════════════════════════
// TODAY'S ARRANGEMENT TAB — grouped by absent teacher
// ═══════════════════════════════════════════════════════════════

export const TodayArrangementTab = ({ onSaved }) => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [date, setDate] = useState(todayISO());
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true); // pehle fetch se pehle "No arrangement needed" ka galat flash na dikhe
  const [selections, setSelections] = useState({}); // { [gapKey]: substitute_teacher_id }
  const [saving, setSaving] = useState(false);
  

  const reqId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const loadDraft = React.useCallback(async () => {
    if (!date) return; // khali date par API call mat karo
    const my = ++reqId.current; // sirf sabse naye request ka response apply hoga
    setLoading(true);
    setSelections({});
    try {
      const res = await apiRequest(`/arrangement/draft?date=${date}`);
      if (!mounted.current || my !== reqId.current) return; // stale / unmounted
      const safe = normalizeDraft(res?.data);
      if (!safe) throw new Error("Invalid arrangement data received from server.");
      setDraft(safe);
      // Seed default selections with top suggested match, right away
      const rawPlan = buildArrangementPlan(safe);
      setSelections(autoAssignSuggested(rawPlan.gaps));
    } catch (e) {
      if (mounted.current && my === reqId.current) dialogAlert("Failed to load arrangement draft: " + e.message, "Error");
    } finally {
      if (mounted.current && my === reqId.current) setLoading(false);
    }
  }, [date, dialogAlert]);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  const plan = useMemo(() => buildArrangementPlan(draft), [draft]);

  // Re-rank live: once a selection is made for one gap, remove that teacher from other gaps' dropdowns in the SAME period
  const gapsWithLiveSelections = useMemo(() => {
    const takenPerPeriod = {};
    plan.gaps.forEach((g) => {
      const chosen = selections[g.key] || g.confirmed_substitute_id;
      if (chosen) {
        if (!takenPerPeriod[g.period_slot_id]) takenPerPeriod[g.period_slot_id] = new Set();
        takenPerPeriod[g.period_slot_id].add(chosen);
      }
    });
    return plan.gaps.map((g) => {
      const taken = takenPerPeriod[g.period_slot_id] || new Set();
      const currentChoice = selections[g.key] || g.confirmed_substitute_id;
      return {
        ...g,
        suggested: g.suggested.filter((t) => !taken.has(t.teacher_id) || t.teacher_id === currentChoice),
        others: g.others.filter((t) => !taken.has(t.teacher_id) || t.teacher_id === currentChoice),
      };
    });
  }, [plan, selections]);

  // Group periods by original (absent) teacher — this is the core structural change
  const groupedByTeacher = useMemo(() => {
    const groups = {};
    gapsWithLiveSelections.forEach((g) => {
      if (!groups[g.original_teacher_id]) {
        groups[g.original_teacher_id] = { teacher_id: g.original_teacher_id, teacher_name: g.original_teacher_name, status: g.original_status, periods: [] };
      }
      groups[g.original_teacher_id].periods.push(g);
    });
    return Object.values(groups).sort((a, b) => String(a.teacher_name || "").localeCompare(String(b.teacher_name || "")));
  }, [gapsWithLiveSelections]);

  const filledCount = gapsWithLiveSelections.filter((g) => selections[g.key] || g.confirmed_substitute_id).length;
  const pendingCount = gapsWithLiveSelections.length - filledCount;

  const handleSelect = (gapKey, teacherId) => {
    setSelections((prev) => ({ ...prev, [gapKey]: teacherId }));
  };

  const handleResetToSuggested = () => {
    setSelections(autoAssignSuggested(plan.gaps));
  };

  const handleConfirm = async () => {
    const entries = gapsWithLiveSelections
      .filter((g) => selections[g.key])
      .map((g) => ({
        period_slot_id: g.period_slot_id, section_id: g.section_id, subject_id: g.subject_id,
        original_teacher_id: g.original_teacher_id, substitute_teacher_id: selections[g.key],
        original_status: g.original_status,
        is_suggested_match: g.suggested.some((t) => t.teacher_id === selections[g.key]),
      }));
    if (entries.length === 0) return dialogAlert("Select at least one substitute before confirming.", "Nothing to Save");

    const ok = await dialogConfirm(`Confirm and notify ${entries.length} teacher(s) for ${date}? This will save the arrangement and send app + email + WhatsApp alerts.`, "Confirm & Notify");
    if (!ok) return;
    setSaving(true);
    try {
      await apiRequest("/arrangement/confirm", "POST", { date, entries });
      let notifiedCount = 0;
      try {
        const notifyRes = await apiRequest("/arrangement/notify", "POST", { date });
        notifiedCount = notifyRes?.data?.notified ?? 0;
        const status = notifyRes?.data?.status;
        const results = notifyRes?.data?.results ?? [];
        if (status === "failed" || status === "partial") {
          const failLines = results
            .filter((r) => r.overall !== "sent")
            .map((r) => {
              const failedChannels = ["app", "email", "whatsapp"]
                .filter((ch) => r[ch]?.status === "failed")
                .map((ch) => `${ch}: ${r[ch].error || "failed"}`)
                .join(" | ");
              return `${r.teacher_name} — ${failedChannels}`;
            })
            .join("\n");
          await dialogAlert(
            `Saved. Notify ${status === "failed" ? "failed for all" : "partially failed for some"} teacher(s):\n\n${failLines}`,
            status === "failed" ? "Notify Failed" : "Partially Notified"
          );
          await loadDraft();
          onSaved();
          setSaving(false);
          return;
        }
      } catch (notifyErr) {
        await dialogAlert("Arrangement saved, but sending email/WhatsApp failed: " + notifyErr.message, "Partial Success");
        await loadDraft();
        onSaved();
        setSaving(false);
        return;
      }
      await dialogAlert(`Saved and notified ${notifiedCount} teacher(s) via app, email and WhatsApp.`, "Done");
      await loadDraft();
      onSaved();
      setSaving(false);
    } catch (e) {
      dialogAlert("Save failed: " + e.message, "Error");
    } finally {
      setSaving(false);
    }
  };

 

  const periodLabel = (id) => {
    const p = draft?.period_slots?.find((x) => x.id === id);
    return p ? `${p.label} • ${p.start_time?.slice(0, 5)}–${p.end_time?.slice(0, 5)}` : "Period";
  };

  return (
    <div className="slide-in">
      <style>{`.arr-bar > div:first-child{margin-bottom:0!important;}`}</style>
      <div className="arr-bar" style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <FormRow label="Arrangement Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormRow>
        <button className="btn btn-ghost" onClick={loadDraft} disabled={loading} style={{ height: 42, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
        {plan.gaps.length > 0 && (
          <button className="btn btn-ghost" onClick={handleResetToSuggested} style={{ height: 42, display: "flex", alignItems: "center", gap: 8, color: C.primary }}>
            <Icon name="check" size={14} /> Reset to Suggested
          </button>
        )}
      </div>

      {loading ? (
        <div className="card pulse" style={{ padding: 40, textAlign: "center" }}>Scanning timetable for {DOW_NAMES[new Date(`${date}T00:00:00`).getDay()] || ""}...</div>
      ) : plan.gaps.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.green }}>
          <Icon name="check" size={28} color={C.green} />
          <p style={{ marginTop: 10, fontWeight: 700 }}>No arrangement needed — all teachers present, or no periods affected.</p>
        </div>
      ) : (
        <>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
            <KpiCard label="Teachers Unavailable" value={plan.unavailableCount} icon="alert" color={C.red} />
            <KpiCard label="Periods Needing Cover" value={plan.gaps.length} icon="calendar" color={C.yellow} />
            <KpiCard label="Filled" value={`${filledCount} / ${plan.gaps.length}`} sub={pendingCount > 0 ? `${pendingCount} pending` : "All covered"} icon="check" color={pendingCount === 0 ? C.green : C.blue} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {groupedByTeacher.map((grp) => (
              <TeacherArrangementCard
                key={grp.teacher_id}
                teacherName={grp.teacher_name}
                status={grp.status}
                periods={grp.periods}
                periodLabelOf={periodLabel}
                selections={selections}
                onSelect={handleSelect}
              />
            ))}
          </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={saving} style={{ padding: "12px 28px", fontSize: 14 }}>
              {saving ? "Saving & Notifying..." : `Confirm & Notify (${filledCount})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
