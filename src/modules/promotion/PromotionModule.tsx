// FILE: teacher-app/src/modules/promotion/PromotionModule.tsx
// @ts-nocheck
// Promotion & Session Transition: year-end promote / retain / TC / graduate, section transfer, full history and a TC register.
// Session-safe: students get a NEW enrolment in the target session, the old session keeps its record.
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { PillTabs } from "../../components/ui/PillTabs";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useSession } from "../../contexts/SessionContext";
import { C } from "../../theme/theme";
import { CopyStructureModal } from "../setup/AcademicSessionsTab";
import { ExitRegisterTab } from "./ExitRegisterTab";
import { PromoteStudentsTab } from "./PromoteStudentsTab";
import { PromotionHistoryTab } from "./PromotionHistoryTab";
import { PromotionOverviewTab } from "./PromotionOverviewTab";
import { SectionTransferTab } from "./SectionTransferTab";

const TABS = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "promote", label: "Promote Students", icon: "students" },
  { id: "transfer", label: "Section Transfer", icon: "refresh" },
  { id: "history", label: "History", icon: "clock" },
  { id: "exits", label: "TC Register", icon: "file" },
];

export const PromotionModule = () => {
  const { academicYears, currentYear } = useSession();
  const navigate = useNavigate();
  const years = useMemo(() => [...(academicYears || [])].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)), [academicYears]);
  const { search: locQs } = useLocation();
  const [tab, setTab] = useState(() => (new URLSearchParams(locQs).get("tab") === "exits" ? "exits" : "overview"));
  const [fromYearId, setFromYearId] = useState("");
  const [toYearId, setToYearId] = useState("");
  const [focusSection, setFocusSection] = useState("");
  const [showCopy, setShowCopy] = useState(false);

  // From session follows the session chosen in the top bar
  useEffect(() => { if (currentYear) { setFromYearId(currentYear.id); setToYearId(""); } }, [currentYear?.id]); // eslint-disable-line
  const fromYear = years.find((y) => y.id === fromYearId) || null;
  // To session: default to the next session after From
  useEffect(() => {
    if (fromYear && !toYearId) { const nxt = years.find((y) => new Date(y.start_date) > new Date(fromYear.start_date)); if (nxt) setToYearId(nxt.id); }
  }, [fromYear?.id, years.length]); // eslint-disable-line

  // ── overview (also feeds the Promote tab) ──
  const [overview, setOverview] = useState(null);
  const [ovLoading, setOvLoading] = useState(false);
  const [ovError, setOvError] = useState("");
  const loadOverview = async () => {
    if (!fromYearId) return;
    setOvLoading(true); setOvError("");
    try {
      const qs = new URLSearchParams({ from_academic_year_id: fromYearId }); if (toYearId) qs.set("to_academic_year_id", toYearId);
      setOverview((await apiRequest(`/promotion/overview?${qs.toString()}`))?.data || null);
    } catch (e) { setOverview(null); setOvError(e?.message || "Could not load the class list."); } finally { setOvLoading(false); }
  };
  useEffect(() => { loadOverview(); }, [fromYearId, toYearId]); // eslint-disable-line

  // ── history ──
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState("");
  const loadHistory = async () => {
    setHistLoading(true); setHistError("");
    try { const r = await apiRequest("/promotion/history"); setHistory(Array.isArray(r?.data) ? r.data : []); } catch (e) { setHistory([]); setHistError(e?.message || "Could not load history."); } finally { setHistLoading(false); }
  };
  useEffect(() => { if (tab === "history") loadHistory(); }, [tab]); // eslint-disable-line

  const toYear = years.find((y) => y.id === toYearId) || null;
  const toYearEx = toYear ? { ...toYear, noSections: overview?.to_year?.id === toYear.id && overview.to_year.sections === 0 } : null;
  const totals = overview?.totals || { total: 0, processed: 0, pending: 0, promoted: 0, retained: 0, tc: 0, graduated: 0 };

  const warn = [];
  if (fromYear && toYear && new Date(toYear.start_date) <= new Date(fromYear.start_date)) warn.push("The To session must start after the From session.");
  if (toYear?.is_locked) warn.push(`${toYear.name} is locked. Unlock it in School Setup before promoting into it.`);
  const needYears = tab === "overview" || tab === "promote";

  // class-sections of the From session, grouped by class (for the Class selector)
  const classGroups = [];
  (overview?.by_grade_section || []).forEach((r) => { let g = classGroups.find((x) => x.id === r.grade_id); if (!g) { g = { id: r.grade_id, name: r.grade_name, items: [] }; classGroups.push(g); } g.items.push(r); });
  useEffect(() => { // keep a valid class selected: first class that still has students to process
    if (tab !== "promote" || !classGroups.length) return;
    const all = classGroups.flatMap((g) => g.items);
    if (!all.some((r) => r.section_id === focusSection)) setFocusSection((all.find((r) => r.pending > 0) || all[0]).section_id);
  }, [tab, overview]); // eslint-disable-line

  return (
    <div className="slide-in">
      <SectionHeader title="Promotion & TC" sub="Year-end promote / retain students, issue TC and keep a full record. Session-safe: nothing is overwritten." />
      <PillTabs tabs={TABS} active={tab} onChange={setTab} />

      {(needYears || tab === "transfer") && (
        <div className="card" style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16, padding: "14px 18px" }}>
          <FormRow label={needYears ? "From session (current class list)" : "Session"}>
            <select className="select" style={{ minWidth: 210 }} value={fromYearId} onChange={(e) => { setFromYearId(e.target.value); setToYearId(""); }}>
              {years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.is_current ? " (Current)" : ""}</option>)}
            </select>
          </FormRow>
          {needYears && (<>
            <div style={{ paddingBottom: 12, color: C.textMuted }}><Icon name="arrow_right" size={20} /></div>
            <FormRow label="To session (promote into)">
              <select className="select" style={{ minWidth: 210 }} value={toYearId} onChange={(e) => setToYearId(e.target.value)}>
                <option value="">Select session</option>
                {years.filter((y) => y.id !== fromYearId).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </FormRow>
            {tab === "promote" && (
              <FormRow label="Class & section">
                <select className="select" style={{ minWidth: 190 }} value={focusSection} disabled={!classGroups.length} onChange={(e) => setFocusSection(e.target.value)}>
                  {!classGroups.length && <option value="">{ovLoading ? "Loading..." : "No classes"}</option>}
                  {classGroups.map((g) => (
                    <optgroup key={g.id} label={g.name}>
                      {g.items.map((r) => <option key={r.section_id} value={r.section_id}>{g.name} - {r.section_name}{r.pending > 0 ? ` (${r.pending} left)` : " (done)"}</option>)}
                    </optgroup>
                  ))}
                </select>
              </FormRow>
            )}
            {toYearEx?.noSections && (
              <div style={{ flex: 1, minWidth: 240, paddingBottom: 6, fontSize: 12.5, color: C.yellow, fontWeight: 600 }}>
                No classes created for {toYearEx.name} yet. <button onClick={() => navigate("/setup")} style={{ background: "none", border: "none", color: C.primary, fontWeight: 800, cursor: "pointer", padding: 0 }}>Open School Setup</button>
                {" "}or{" "}
                <button onClick={() => setShowCopy(true)} style={{ background: "none", border: "none", color: C.primary, fontWeight: 800, cursor: "pointer", padding: 0 }}>Copy structure from another session</button>
              </div>
            )}
          </>)}
        </div>
      )}
      {needYears && fromYear && !years.some((y) => new Date(y.start_date) > new Date(fromYear.start_date)) && (
        <div className="card" style={{ marginBottom: 16, padding: "12px 18px", fontSize: 13, color: C.yellow, fontWeight: 600 }}>
          There is no session after {fromYear.name}. Create the new session first in School Setup &gt; Academic Sessions, then come back to promote students.
          {" "}<button onClick={() => navigate("/setup")} style={{ background: "none", border: "none", color: C.primary, fontWeight: 800, cursor: "pointer", padding: 0 }}>Open School Setup</button>
        </div>
      )}
      {needYears && ovError && (
        <div className="card" style={{ marginBottom: 16, padding: "12px 18px", borderColor: `${C.red}55`, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: C.red, fontWeight: 600 }}>Could not load the class list: {ovError}</div>
          <button className="btn btn-ghost" style={{ fontSize: 12.5 }} onClick={loadOverview}>Retry</button>
        </div>
      )}
      {needYears && warn.length > 0 && <div style={{ marginBottom: 16, color: C.red, fontSize: 13, fontWeight: 600 }}>{warn.map((w) => <div key={w}>⚠ {w}</div>)}</div>}

      {tab === "overview" && <PromotionOverviewTab overview={overview} loading={ovLoading} totals={totals} onPromoteSection={(id) => { setFocusSection(id); setTab("promote"); }} />}
      {tab === "promote" && (
        <PromoteStudentsTab fromYear={fromYear} toYear={warn.length ? null : toYearEx} overview={overview} sectionId={focusSection} onSectionChange={setFocusSection}
          onChanged={loadOverview} onOpenSetup={() => navigate("/setup")} onCopyStructure={() => setShowCopy(true)} />
      )}
      {tab === "transfer" && <SectionTransferTab year={fromYear} />}
      {tab === "history" && <PromotionHistoryTab history={history} loading={histLoading} error={histError} />}
      {tab === "exits" && <ExitRegisterTab years={years} />}

      <CopyStructureModal open={showCopy} onClose={() => setShowCopy(false)} target={toYear} years={[...years].reverse()} onDone={loadOverview} />
    </div>
  );
};
