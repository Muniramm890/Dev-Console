// FILE: teacher-app/src/modules/fees/FeeStructuresTab.tsx
// Source: admin App.tsx -> FeeStructuresTab [14856-15080]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useDialog } from "../../contexts/DialogContext";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useSession } from "../../contexts/SessionContext";
import { toPaise } from "./helpers";
import { C } from "../../theme/theme";

// ── STRUCTURES TAB ──
export const FeeStructuresTab = () => {
  const { dialogConfirm } = useDialog();
  const [grades, setGrades] = useState([]);
  const [categories, setCategories] = useState([]);
  const { academicYears: academicYrs, currentYear } = useSession();
  const [gradeId, setGradeId] = useState("");
  // automation (recurring invoices + late fee): everything is OFF until an admin switches it on
  const [auto, setAuto] = useState({ auto_invoices: false, invoice_day: 1, late_fee_enabled: false, late_fee_from: null });
  const [autoSaving, setAutoSaving] = useState(false);
  const [uncovered, setUncovered] = useState([]);
  const [rows, setRows] = useState({}); // category_id -> {amount, frequency, due_day_of_month, late_fee, grace_days}
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", is_recurring: true });
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ scope: "all", title: "", due_date: "", month_index: "" });
  const [generating, setGenerating] = useState(false);

  
  const selectedGrade = grades.find((g) => g.id === gradeId);

  const loadBase = async () => {
    setLoading(true);
    try {
      const [gRes, cRes] = await Promise.all([
        apiRequest("/setup/grades"),
        apiRequest("/fees/categories"),
      ]);
      setGrades(gRes?.data || []);
      setCategories(cRes?.data || []);
      if (gRes?.data?.length) setGradeId((p) => p || gRes.data[0].id);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { loadBase(); }, []);

  const loadStructures = async () => {
    if (!currentYear) return;
    try {
      const res = await apiRequest(`/fees/structures?academic_year_id=${currentYear.id}`);
      const list = res?.data || [];
      const byGrade = {};
      list.forEach((s) => {
        if (!byGrade[s.grade_id]) byGrade[s.grade_id] = {};
        byGrade[s.grade_id][s.fee_category_id] = s;
      });
      window.__feeStructAll = byGrade; // cache across grade switches
      applyGradeRows(gradeId, byGrade);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (currentYear) loadStructures(); }, [currentYear?.id]); // eslint-disable-line

  const applyGradeRows = (gid, byGradeOverride) => {
    const byGrade = byGradeOverride || window.__feeStructAll || {};
    const existing = byGrade[gid] || {};
    const next = {};
    categories.forEach((c) => {
      const ex = existing[c.id];
      next[c.id] = {
        amount: ex ? (ex.amount_paise / 100).toFixed(0) : "",
        frequency: ex?.frequency || "monthly",
        due_day_of_month: ex?.due_day_of_month || 10,
        late_fee: ex ? (ex.late_fee_paise / 100).toFixed(0) : "0",
        grace_days: ex?.grace_days || 0,
      };
    });
    setRows(next);
  };
  useEffect(() => { if (gradeId && categories.length) applyGradeRows(gradeId); }, [gradeId, categories.length]); // eslint-disable-line

  const updateRow = (catId, field, value) => setRows((prev) => ({ ...prev, [catId]: { ...prev[catId], [field]: value } }));

  const handleAddCategory = async () => {
    if (!newCat.name.trim()) return;
    try {
      await apiRequest("/fees/categories", "POST", newCat);
      setNewCat({ name: "", is_recurring: true });
      setShowAddCat(false);
      const cRes = await apiRequest("/fees/categories");
      setCategories(cRes?.data || []);
    } catch (e) { alert("Failed: " + e.message); }
  };

  const buildEntries = (gid) => categories
    .filter((c) => rows[c.id]?.amount && parseFloat(rows[c.id].amount) > 0)
    .map((c) => ({
      grade_id: gid,
      fee_category_id: c.id,
      amount_paise: toPaise(rows[c.id].amount),
      frequency: rows[c.id].frequency,
      due_day_of_month: Number(rows[c.id].due_day_of_month) || 10,
      late_fee_paise: toPaise(rows[c.id].late_fee || 0),
      grace_days: Number(rows[c.id].grace_days) || 0,
    }));

  const handleSave = async (copyToAll = false) => {
    if (!currentYear) return alert("No active academic year found.");
    setSaving(true);
    try {
      let entries = buildEntries(gradeId);
      if (copyToAll) {
        entries = grades.flatMap((g) => buildEntries(g.id).map((e) => ({ ...e, grade_id: g.id })));
      }
      if (!entries.length) { alert("Enter at least one amount before saving."); setSaving(false); return; }
      await apiRequest("/fees/structures/bulk", "PUT", { academic_year_id: currentYear.id, entries });
      alert(copyToAll ? "✅ Applied to all classes!" : `✅ Fee structure saved for ${selectedGrade?.name}`);
      await loadStructures();
    } catch (e) { alert("Save failed: " + e.message); } finally { setSaving(false); }
  };

  const loadAuto = async () => {
    try { setAuto((await apiRequest("/fees/settings"))?.data || auto); } catch (_) { /* viewer without rights */ }
    try { if (currentYear?.id) setUncovered((await apiRequest(`/fees/structures/coverage?academic_year_id=${currentYear.id}`))?.data || []); } catch (_) { setUncovered([]); }
  };
  useEffect(() => { loadAuto(); }, [currentYear?.id, saving]); // eslint-disable-line

  const saveAuto = async (next) => {
    if (next.late_fee_enabled && !auto.late_fee_enabled) {
      const ok = await dialogConfirm(
        "A late fee will be added automatically to every invoice that is still unpaid after its due date + grace days, using the Late Fee and Grace Days set for each fee head below.\n\nIt applies only to invoices due from today onwards (nothing old is charged), is added once per invoice, and shows as a separate 'Late Fee' head at collection and on the receipt. You can waive it by giving a discount on that head.\n\nEnable late fee?",
        "Enable late fee"
      );
      if (!ok) return;
    }
    setAutoSaving(true);
    try { setAuto((await apiRequest("/fees/settings", "PUT", next))?.data || next); }
    catch (e) { alert("Could not save: " + e.message); }
    finally { setAutoSaving(false); }
  };
  const runAutoNow = async () => {
    setAutoSaving(true);
    try {
      const d = (await apiRequest("/fees/automation/run", "POST", {}))?.data || {};
      alert(`Done.\nInvoices generated: ${d.auto_invoices ? d.auto_invoices.generated : "-"}${d.auto_invoices && d.auto_invoices.skipped_duplicate ? ` (already billed: ${d.auto_invoices.skipped_duplicate})` : ""}\nLate fees added: ${d.late_fee ? d.late_fee.applied : "-"}`);
    } catch (e) { alert("Failed: " + e.message); } finally { setAutoSaving(false); }
  };

  const handleGenerate = async () => {
    if (!genForm.title || !genForm.due_date) return alert("Title and due date are required.");
    setGenerating(true);
    try {
      const body = {
        grade_id: genForm.scope === "grade" ? gradeId : null,
        academic_year_id: currentYear.id,
        month_index: genForm.month_index || null,
        title: genForm.title,
        due_date: genForm.due_date,
      };
      // 1) dry run: show exactly what will be billed before any money record is created
      const prev = (await apiRequest("/fees/generate-invoices", "POST", { ...body, dry_run: true }))?.data || {};
      if (!prev.generated) {
        setGenerating(false);
        return alert(`Nothing to generate.\nAlready billed with this title: ${prev.skipped_duplicate || 0}\nNo fee set for the class: ${prev.skipped_no_fee || 0}`);
      }
      const ok = await dialogConfirm(
        `${prev.generated} invoices, total ₹${((prev.total_paise || 0) / 100).toLocaleString("en-IN")}, will be created.` +
          (prev.skipped_duplicate ? `\n${prev.skipped_duplicate} students already have "${genForm.title}" and are skipped.` : "") +
          (prev.skipped_no_fee ? `\n${prev.skipped_no_fee} students have no fee due this time (yearly / one-time fees are not repeated).` : "") +
          (prev.no_structure && prev.no_structure.length ? `\nNo fee structure is set for: ${prev.no_structure.map((n) => `${n.name} (${n.students})`).join(", ")}.` : "") +
          "\n\nGenerate now?",
        "Generate invoices"
      );
      if (!ok) { setGenerating(false); return; }
      const res = await apiRequest("/fees/generate-invoices", "POST", body);
      alert(`✅ ${res?.data?.generated || 0} invoices generated successfully!`);
      setGenModal(false);
      setGenForm({ scope: "all", title: "", due_date: "", month_index: "" });
    } catch (e) { alert("Failed: " + e.message); } finally { setGenerating(false); }
  };

  if (loading) return <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 40 }}>Loading fee structures…</div>;

  return (
    <div>
      {uncovered.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderLeft: `4px solid ${C.yellow}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Icon name="warning" size={16} />
          <div style={{ fontSize: 12.5, color: C.text }}>
            <b>No fee structure for {uncovered.length} class{uncovered.length > 1 ? "es" : ""}</b> in this session, so these students will NOT be billed:{" "}
            {uncovered.map((u) => `${u.name} (${u.students})`).join(", ")}. Select the class below and save its fees.
          </div>
        </div>
      )}
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Automation <span style={{ color: C.textMuted, fontWeight: 500, fontSize: 12 }}>· off until you switch it on</span></h3>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 280px" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700, fontSize: 13 }}>
              <input type="checkbox" checked={!!auto.auto_invoices} disabled={autoSaving} onChange={(e) => saveAuto({ ...auto, auto_invoices: e.target.checked })} />
              Generate recurring invoices automatically
            </label>
            <div style={{ fontSize: 11.5, color: C.textMuted, margin: "5px 0 8px" }}>
              Each month the invoice is created by the fee frequency (monthly every month, quarterly / half-yearly after the gap, annual once a year, one-time once). Due date = the smallest Due Day set below. Safe to run again: nothing is billed twice.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              Create invoices from day
              <input className="input" type="number" min={1} max={28} style={{ width: 70 }} value={auto.invoice_day} disabled={autoSaving}
                onChange={(e) => setAuto({ ...auto, invoice_day: e.target.value })} onBlur={() => saveAuto({ ...auto, invoice_day: Number(auto.invoice_day) || 1 })} />
              of every month
            </div>
          </div>
          <div style={{ flex: "1 1 280px" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700, fontSize: 13 }}>
              <input type="checkbox" checked={!!auto.late_fee_enabled} disabled={autoSaving} onChange={(e) => saveAuto({ ...auto, late_fee_enabled: e.target.checked })} />
              Charge late fee automatically
            </label>
            <div style={{ fontSize: 11.5, color: C.textMuted, margin: "5px 0 8px" }}>
              After due date + grace days, a separate <b>Late Fee</b> head is added once to the unpaid invoice (amount = Late Fee set per head below). It never touches old invoices{auto.late_fee_from ? ` (active for invoices due from ${auto.late_fee_from})` : ""}. Waive it at collection with a discount.
            </div>
          </div>
        </div>
        {(auto.auto_invoices || auto.late_fee_enabled) && (
          <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 12 }} disabled={autoSaving} onClick={runAutoNow}>{autoSaving ? "Working…" : "Run now"}</button>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          {grades.map((g) => (
            <button key={g.id} onClick={() => setGradeId(g.id)} style={{
              padding: "8px 16px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${gradeId === g.id ? C.primary : C.border}`,
              background: gradeId === g.id ? `${C.primary}22` : C.surfaceAlt,
              color: gradeId === g.id ? C.primary : C.text, fontWeight: 700, fontSize: 12.5,
            }}>
              {g.name}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setGenModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="fee" size={14} /> Generate Invoices
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="syne" style={{ fontSize: 15, fontWeight: 700 }}>{selectedGrade?.name} — Fee Breakdown</h3>
          <button className="btn btn-ghost" onClick={() => setShowAddCat(true)} style={{ fontSize: 12 }}><Icon name="plus" size={12} /> New Category</button>
        </div>

        {categories.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No fee categories yet — add Tuition, Transport, Exam Fee, etc.</div>
        ) : (
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Category</th><th>Amount (₹)</th><th>Frequency</th><th>Due Day</th><th>Late Fee (₹)</th><th>Grace Days</th></tr></thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td><input className="input" type="number" style={{ width: 110 }} value={rows[c.id]?.amount || ""} onChange={(e) => updateRow(c.id, "amount", e.target.value)} placeholder="0" /></td>
                    <td>
                      <select className="select" style={{ width: 110 }} value={rows[c.id]?.frequency || "monthly"} onChange={(e) => updateRow(c.id, "frequency", e.target.value)}>
                        <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
                        <option value="half_yearly">Half-Yearly</option><option value="annual">Annual</option><option value="one_time">One-Time</option>
                      </select>
                    </td>
                    <td><input className="input" type="number" style={{ width: 70 }} min={1} max={28} value={rows[c.id]?.due_day_of_month || 10} onChange={(e) => updateRow(c.id, "due_day_of_month", e.target.value)} /></td>
                    <td><input className="input" type="number" style={{ width: 90 }} value={rows[c.id]?.late_fee || "0"} onChange={(e) => updateRow(c.id, "late_fee", e.target.value)} /></td>
                    <td><input className="input" type="number" style={{ width: 70 }} value={rows[c.id]?.grace_days || 0} onChange={(e) => updateRow(c.id, "grace_days", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18, borderTop: `1px solid ${C.border}33`, paddingTop: 16 }}>
          <button className="btn btn-ghost" onClick={() => handleSave(true)} disabled={saving}>Apply to All Classes</button>
          <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={saving} style={{ minWidth: 160, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : `Save for ${selectedGrade?.name || "..."}`}
          </button>
        </div>
      </div>

      <Modal open={showAddCat} onClose={() => setShowAddCat(false)} title="New Fee Category" width={380}>
        <FormRow label="Category Name">
          <input className="input" placeholder="e.g. Tuition Fee, Transport" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
        </FormRow>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 16 }}>
          <input type="checkbox" checked={newCat.is_recurring} onChange={(e) => setNewCat({ ...newCat, is_recurring: e.target.checked })} />
          Recurring charge (vs one-time)
        </label>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleAddCategory}>Add Category</button>
      </Modal>

      <Modal open={genModal} onClose={() => setGenModal(false)} title="Generate Invoices" width={440}>
        <FormRow label="Scope">
          <select className="select" value={genForm.scope} onChange={(e) => setGenForm({ ...genForm, scope: e.target.value })}>
            <option value="all">All Classes</option>
            <option value="grade">Only {selectedGrade?.name}</option>
          </select>
        </FormRow>
        <FormRow label="Invoice Title">
          <input className="input" placeholder="e.g. November Fee 2024" value={genForm.title} onChange={(e) => setGenForm({ ...genForm, title: e.target.value })} />
        </FormRow>
        <FormGrid cols={2}>
          <FormRow label="Due Date"><input className="input" type="date" value={genForm.due_date} onChange={(e) => setGenForm({ ...genForm, due_date: e.target.value })} /></FormRow>
          <FormRow label="Month (Optional)">
            <select className="select" value={genForm.month_index} onChange={(e) => setGenForm({ ...genForm, month_index: e.target.value })}>
              <option value="">—</option>
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </FormRow>
        </FormGrid>
        <div style={{ padding: 12, background: `${C.yellow}11`, border: `1px solid ${C.yellow}33`, borderRadius: 10, fontSize: 12, color: C.yellow, marginBottom: 16 }}>
          This creates one invoice per student, summing all category amounts set in the fee structure above.
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating…" : "Generate Now"}
        </button>
      </Modal>
    </div>
  );
};
