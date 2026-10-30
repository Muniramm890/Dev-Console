// @ts-nocheck
import { useEffect, useState } from "react";
import { TableRegister, useRegisterData, useRegisterPdf } from "../../components/ui/TableRegister";
import { PillTabs } from "../../components/ui/PillTabs";
import { useSession } from "../../contexts/SessionContext";
import { useGradesAndSections } from "../attendance/useGradesAndSections";
import { apiRequest } from "../../api/client";
import { useDialog } from "../../contexts/DialogContext";
import { Icon } from "../../components/ui/Icon";
import { todayISO } from "../../utils/date";

const VIEWS = [
  { id: "collection", label: "Collection Register" },
  { id: "monthly", label: "Monthly Fee Register" },
  { id: "sessions", label: "Session Statement" },
  { id: "defaulters", label: "Defaulters" },
];

// Ledger health check: compares every student's invoices, payments and account totals; repairs only after the admin confirms.
const useLedgerCheck = () => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [busy, setBusy] = useState(false);
  const run = async (apply) => {
    const total = { checked: 0, drifted: 0, fixed: 0, failed: 0, gateway: [] };
    let offset = 0;
    for (let guard = 0; guard < 200; guard++) {
      const res = (await apiRequest("/fees/reconcile", "POST", { apply, offset, limit: 100 }))?.data || {};
      if (res.gateway_issues && res.gateway_issues.length) total.gateway = res.gateway_issues;
      total.checked += res.checked || 0; total.drifted += res.drifted || 0; total.fixed += res.fixed || 0; total.failed += res.failed || 0;
      if (res.next_offset === null || res.next_offset === undefined) break;
      offset = res.next_offset;
    }
    return total;
  };
  const start = async () => {
    setBusy(true);
    try {
      const t = await run(false);
      const gw = t.gateway.length ? `\n\nOnline payments needing attention: ${t.gateway.map((g) => `${g.count} ${g.status === "mismatch" ? "with an amount mismatch" : "started but never completed (48h+)"}`).join(", ")}. Check them in the Razorpay / Cashfree dashboard.` : "";
      if (!t.drifted) { await dialogAlert(`All ${t.checked} student fee accounts match their invoices and payments.${gw}`, "Ledger is clean"); return; }
      const ok = await dialogConfirm(`${t.drifted} of ${t.checked} accounts do not match their invoices / payments (usually old payments recorded before the new ledger).\n\nRepair them now? Totals are re-derived from invoices and non-void payments; nothing is deleted.`, "Repair ledger");
      if (!ok) return;
      const f = await run(true);
      await dialogAlert(`Repaired ${f.fixed} accounts.` + (f.failed ? `\n${f.failed} could not be repaired; check the server log.` : ""), "Done");
    } catch (e) { await dialogAlert(e.message || "Ledger check failed", "Ledger check"); }
    finally { setBusy(false); }
  };
  return { busy, start };
};

// Fee registers (all reuse existing routes: /fees/payments and /fees/accounts with view=register|defaulters)
export const FeeRegistersTab = ({ initialView }) => {
  const ledgerCheck = useLedgerCheck();
  const { currentYear, academicYears } = useSession();
  const { grades, sections } = useGradesAndSections();
  const [sessionId, setSessionId] = useState("");
  const [view, setView] = useState(() => (VIEWS.some((v) => v.id === initialView) ? initialView : "collection"));
  const [from, setFrom] = useState(`${todayISO().slice(0, 8)}01`);
  const [to, setTo] = useState(todayISO());
  const [gradeId, setGradeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const ay = currentYear?.id ? `&academic_year_id=${currentYear.id}` : "";
  const filteredSections = sections.filter((s) => s.grade_id === gradeId);

  useEffect(() => { if ((view === "monthly" || view === "sessions") && grades.length && !gradeId) setGradeId(grades[0].id); }, [view, grades]); // eslint-disable-line
  useEffect(() => { if (!sessionId && currentYear?.id) setSessionId(currentYear.id); }, [currentYear]); // eslint-disable-line
  useEffect(() => { setSectionId(""); }, [gradeId]);

  let base = "";
  if (view === "collection") base = from && to ? `/fees/payments?view=register&from=${from}&to=${to}${ay}` : "";
  if (view === "monthly") base = gradeId ? `/fees/accounts?view=register&grade_id=${gradeId}${sectionId ? `&section_id=${sectionId}` : ""}${ay}` : "";
  if (view === "sessions") base = gradeId && sessionId ? `/fees/accounts?view=sessions&grade_id=${gradeId}&academic_year_id=${sessionId}` : "";
  if (view === "defaulters") base = `/fees/accounts?view=defaulters${gradeId ? `&grade_id=${gradeId}` : ""}${ay}`;
  const { table, loading, error } = useRegisterData(base);
  const pdf = useRegisterPdf();

  const classFilters = (allLabel, withSection) => (
    <>
      <select className="select" style={{ width: 160 }} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
        {allLabel && <option value="">{allLabel}</option>}
        {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      {withSection && (
        <select className="select" style={{ width: 130 }} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
          <option value="">All sections</option>
          {filteredSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </>
  );
  const filters = view === "collection" ? (
    <>
      <input className="input" type="date" style={{ width: 150 }} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
      <span style={{ alignSelf: "center", opacity: 0.6 }}>to</span>
      <input className="input" type="date" style={{ width: 150 }} value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value > todayISO() ? todayISO() : e.target.value)} />
    </>
  ) : view === "monthly" ? classFilters(null, true) : view === "sessions" ? (
    <>
      <select className="select" style={{ width: 160 }} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
        {(academicYears || []).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
      </select>
      {classFilters(null, false)}
    </>
  ) : classFilters("All classes", false);

  const names = { collection: "Fee Collection Register", monthly: "Monthly Fee Register", sessions: "Session Fee Statement", defaulters: "Fee Defaulters" };
  return (
    <div>
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <PillTabs tabs={VIEWS} active={view} onChange={setView} />
        <button className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }} disabled={ledgerCheck.busy} onClick={ledgerCheck.start} title="Compare invoices, payments and account totals">
          <Icon name="refresh" size={14} /> {ledgerCheck.busy ? "Checking…" : "Ledger check"}
        </button>
      </div>
      <TableRegister
        table={table} loading={loading} error={error} filters={filters}
        onPdf={() => pdf.open(`${base}&format=pdf`, `${names[view]}.pdf`, names[view])} pdfBusy={pdf.busy}
        emptyTitle={view === "defaulters" ? "No pending fees" : "No data for this selection"}
        emptySub={view === "collection" ? "No receipts were issued in this date range." : view === "defaulters" ? "Nobody has pending fees right now." : "Pick another class."}
      />
    </div>
  );
};
