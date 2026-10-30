// @ts-nocheck
// Hidden page (opened from the dashboard "Fee Collected" card): /fees?tab=collection
// Uses only existing routes: GET /fees/overview and GET /fees/payments.
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { useDialog } from "../../contexts/DialogContext";
import { KpiCard } from "../../components/ui/KpiCard";
import { rupees } from "./helpers";
import { C } from "../../theme/theme";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// SQL BIGINT columns arrive as strings ("100000"); always convert before adding.
const num = (v) => Number(v) || 0;
const day = (v) => String(v || "").slice(0, 10);
const fmtDate = (v) => { const [y, m, d] = day(v).split("-"); return y ? `${d}/${m}/${y}` : "-"; };

const BarList = ({ items, empty }) => {
  const max = Math.max(1, ...items.map((i) => i[1]));
  if (!items.length) return <div style={{ color: C.textMuted, fontSize: 13 }}>{empty}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(([label, paise]) => (
        <div key={label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span>{label}</span><span style={{ fontWeight: 600 }}>{rupees(paise)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: C.surfaceAlt }}>
            <div style={{ height: 6, borderRadius: 3, width: `${Math.round((paise / max) * 100)}%`, background: C.primary }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const FeeCollectionPage = ({ onBack, onOpenReceipts }) => {
  const { dialogAlert } = useDialog();
  const [ov, setOv] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const today = iso(now);
  const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));

  useEffect(() => {
    (async () => {
      try {
        const [o, p] = await Promise.all([
          apiRequest("/fees/overview"),
          apiRequest(`/fees/payments?from=${monthStart}&to=${today}&limit=500`),
        ]);
        setOv(o?.data || null);
        setRows((Array.isArray(p?.data) ? p.data : []).filter((r) => !r.is_void));
      } catch (e) {
        await dialogAlert(e?.message || "Could not load the fee collection summary.", "Fee Collection");
      } finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line

  const sum = (a) => a.reduce((t, r) => t + num(r.amount_paise), 0);
  const group = (key) => {
    const m = {};
    rows.forEach((r) => { const k = r[key] || "Unknown"; m[k] = (m[k] || 0) + num(r.amount_paise); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const todayRows = rows.filter((r) => day(r.payment_date) === today);
  const s0 = ov?.summary || {};
  const sm = { total_paid_paise: num(s0.total_paid_paise), total_pending_paise: num(s0.total_pending_paise), total_fee_paise: num(s0.total_fee_paise) };
  const pct = sm.total_fee_paise ? Math.round((sm.total_paid_paise / sm.total_fee_paise) * 100) : 0;
  const classes = (ov?.byClass || []).map((c) => [c.class_name, num(c.paid_paise)]).filter((c) => c[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const openReceipt = async (id) => {
    try { await openGeneratedPdf(`/fees/payments/${id}/receipt`, { name: "Fee Receipt.pdf", title: "Fee Receipt" }); }
    catch (e) { await dialogAlert(e?.message || "Could not open the receipt.", "Receipt"); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <div className="syne" style={{ fontSize: 17, fontWeight: 700, marginRight: "auto" }}>Fee Collection</div>
        <button className="btn btn-ghost" onClick={onBack}>Back to Overview</button>
        <button className="btn btn-ghost" onClick={onOpenReceipts}>All Transactions &amp; Receipts</button>
      </div>
      {loading ? (
        <div className="pulse" style={{ padding: 60, textAlign: "center", color: C.primary }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 20 }}>
            <KpiCard label="Collected Today" value={rupees(sum(todayRows))} sub={`${todayRows.length} payment${todayRows.length === 1 ? "" : "s"}`} icon="fee" color={C.primary} />
            <KpiCard label="Collected This Month" value={rupees(sum(rows))} sub={`${rows.length} payment${rows.length === 1 ? "" : "s"}`} icon="chart" color={C.green} />
            <KpiCard label="Total Collected" value={rupees(sm.total_paid_paise)} sub={`of ${rupees(sm.total_fee_paise)} total fee`} icon="fee" color={C.blue} />
            <KpiCard label="Collection Rate" value={`${pct}%`} sub={`${rupees(sm.total_pending_paise)} pending`} icon="warning" color={C.red} />
          </div>
          {rows.length >= 500 && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Monthly figures are based on the latest 500 payments.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
            <div className="card"><div style={{ fontWeight: 700, marginBottom: 12 }}>By payment method (this month)</div><BarList items={group("payment_method")} empty="No payments this month." /></div>
            <div className="card"><div style={{ fontWeight: 700, marginBottom: 12 }}>By collector (this month)</div><BarList items={group("collected_by_name")} empty="No payments this month." /></div>
            <div className="card"><div style={{ fontWeight: 700, marginBottom: 12 }}>Class-wise collected</div><BarList items={classes} empty="No collection yet." /></div>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", fontWeight: 700 }}>Latest transactions</div>
            <div className="scroll-x">
              <table className="table">
                <thead><tr><th>Receipt</th><th>Student</th><th>Date</th><th>Method</th><th style={{ textAlign: "right" }}>Amount</th><th /></tr></thead>
                <tbody>
                  {rows.slice(0, 10).map((r) => (
                    <tr key={r.id}>
                      <td>{r.receipt_no || "-"}</td><td>{r.student_name}</td><td>{fmtDate(r.payment_date)}</td><td>{r.payment_method || "-"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{rupees(num(r.amount_paise))}</td>
                      <td style={{ textAlign: "right" }}><button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openReceipt(r.id)}>Receipt</button></td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={6} style={{ textAlign: "center", color: C.textMuted, padding: 24 }}>No payments this month.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
