// @ts-nocheck
import { useMemo, useState } from "react";
import { PillTabs } from "../../components/ui/PillTabs";
import { Icon } from "../../components/ui/Icon";
import { TableRegister, useRegisterData, useRegisterPdf } from "../../components/ui/TableRegister";
import { useDialog } from "../../contexts/DialogContext";
import { openDocument } from "../../utils/openDocument";
import { addMonths, currentMonthYear } from "./helpers";

// Payroll registers: one table JSON from the server drives the screen, the PDF and the CSV, so all three always match.
const VIEWS = [
  { id: "salary", label: "Salary Register", file: "Salary Register", monthly: true },
  { id: "bank", label: "Bank Transfer", file: "Bank Transfer Sheet", monthly: true },
  { id: "payment", label: "Payment Status", file: "Payment Status Register", monthly: true },
  { id: "corrections", label: "Arrears & Recovery", file: "Arrears and Recovery Register" },
  { id: "yearly", label: "Staff Summary", file: "Staff Salary Summary", range: true },
];

const csvCell = (c) => { const t = c === null || c === undefined ? "" : typeof c === "object" ? c.t : c; const s = String(t ?? "").replace(/"/g, '""'); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${/^[=+\-@]/.test(s) ? "'" : ""}${s}"` : s; };
const toCsv = (table) => {
  const lines = [table.columns.map((c) => csvCell(c.sub ? `${c.label} (${c.sub})` : c.label).replace(/^'/, "")).join(",")];
  [...table.rows, ...(table.footers || [])].forEach((r) => lines.push(r.map(csvCell).join(",")));
  return "﻿" + lines.join("\r\n");
};

export const PayrollRegistersTab = ({ initialView = null }) => {
  const { dialogAlert } = useDialog();
  const [view, setView] = useState(() => (VIEWS.some((v) => v.id === initialView) ? initialView : "salary"));
  const [month, setMonth] = useState(addMonths(currentMonthYear(), -1)); // payroll is processed for the previous month
  const [from, setFrom] = useState(() => { const n = currentMonthYear(); return `${Number(n.slice(5)) >= 4 ? n.slice(0, 4) : Number(n.slice(0, 4)) - 1}-04`; });
  const [to, setTo] = useState(currentMonthYear());
  const [status, setStatus] = useState("");
  const [includePaid, setIncludePaid] = useState(false);
  const cur = VIEWS.find((v) => v.id === view);

  const base = useMemo(() => {
    if (view === "yearly") return from && to ? `/payroll/registers?type=yearly&from=${from}&to=${to}` : "";
    if (view === "corrections") return `/payroll/registers?type=corrections${status ? `&status=${status}` : ""}`;
    if (!month) return "";
    return `/payroll/registers?type=${view}&month_year=${month}${view === "bank" && includePaid ? "&include_paid=1" : ""}`;
  }, [view, month, from, to, status, includePaid]);

  const { table, loading, error } = useRegisterData(base);
  const pdf = useRegisterPdf();
  const tag = view === "yearly" ? `${from}_to_${to}` : cur.monthly ? month : "all";

  const downloadCsv = async () => {
    if (!table?.rows?.length) return;
    try {
      const bytes = new TextEncoder().encode(toCsv(table));
      await openDocument({ url: `generated://${Date.now()}`, name: `${cur.file.replace(/ /g, "_")}_${tag}.csv`, mime: "text/csv", bytes });
    } catch (e) { dialogAlert(e.message || "Could not create the CSV file", "CSV failed"); }
  };

  const filters = (
    <>
      {cur.monthly && <input className="input" type="month" style={{ width: 160 }} value={month} max={currentMonthYear()} onChange={(e) => e.target.value && setMonth(e.target.value)} />}
      {cur.range && (
        <>
          <input className="input" type="month" style={{ width: 150 }} value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          <span style={{ alignSelf: "center", opacity: 0.6 }}>to</span>
          <input className="input" type="month" style={{ width: 150 }} value={to} min={from} max={currentMonthYear()} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </>
      )}
      {view === "corrections" && (
        <select className="select" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All entries</option><option value="OPEN">Open (not applied)</option><option value="APPLIED">Applied</option><option value="CANCELLED">Cancelled</option>
        </select>
      )}
      {view === "bank" && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
          <input type="checkbox" checked={includePaid} onChange={(e) => setIncludePaid(e.target.checked)} /> Include already paid
        </label>
      )}
    </>
  );

  return (
    <div className="slide-in">
      <div style={{ marginBottom: 14 }}><PillTabs tabs={VIEWS} active={view} onChange={setView} /></div>
      <TableRegister
        table={table} loading={loading} error={error} filters={filters}
        actions={(
          <button className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5 }} disabled={!table?.rows?.length} onClick={downloadCsv} title="Download as CSV (opens in Excel / Sheets)">
            <Icon name="file" size={14} /> CSV
          </button>
        )}
        onPdf={() => pdf.open(`${base}&format=pdf`, `${cur.file} ${tag}.pdf`, cur.file)} pdfBusy={pdf.busy}
        emptyTitle="No data for this selection"
        emptySub={view === "corrections" ? "No arrears or recoveries have been added yet." : "Generate payroll for this month first, or pick another month."}
      />
    </div>
  );
};
