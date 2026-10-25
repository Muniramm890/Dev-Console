// FILE: teacher-app/src/modules/transport/TransportAllocationsTab.tsx
// Source: admin App.tsx -> TransportAllocationsTab [9772-9913]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useSession } from "../../contexts/SessionContext";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { paiseToRupee } from "./helpers";
import { C } from "../../theme/theme";

// ── STUDENT ALLOCATION (Level 3) — stop select → auto bus + auto fee ────
export const TransportAllocationsTab = () => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [form, setForm] = useState({});
  const [studentQuery, setStudentQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const { currentYear } = useSession();
  const load = async () => {
    setLoading(true);
    try { const res = await apiRequest("/transport/allocations"); setRows(res?.data || []); }
    catch (e) { dialogAlert("Failed to load allocations: " + e.message, "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = async () => {
    setForm({}); setPreview(null); setStudentQuery(""); setModal(true);
    try {
      const [s, r] = await Promise.all([apiRequest(`/students${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`), apiRequest(`/transport/routes${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`)]);
      setStudents(s?.data || s || []); setRoutes(r?.data || []);
    } catch (e) { dialogAlert("Failed to load: " + e.message, "Error"); }
  };

  const onRouteChange = async (routeId) => {
    setForm((f) => ({ ...f, route_id: routeId, stop_id: "" })); setStops([]);
    if (!routeId) return;
    const res = await apiRequest(`/transport/routes/${routeId}/stops`);
    setStops(res?.data || []);
  };

  const onStopChange = (stopId) => {
    setForm((f) => ({ ...f, stop_id: stopId }));
    const stop = stops.find((s) => s.id === stopId);
    if (stop) setPreview({ fare: paiseToRupee(stop.monthly_fare_paise) });
  };

  const filteredStudents = students.filter((s) => {
    const name = `${s.first_name || ""} ${s.last_name || ""} ${s.admission_no || ""}`.toLowerCase();
    return !studentQuery || name.includes(studentQuery.toLowerCase());
  }).slice(0, 30);

  const handleAllocate = async () => {
    if (!form.student_id || !form.route_id || !form.stop_id) { dialogAlert("Select student, route and stop.", "Missing Info"); return; }
    setSaving(true);
    try {
      const res = await apiRequest("/transport/allocations", "POST", form);
      await dialogAlert(`Allocated. Bus: ${res?.data?.assigned_vehicle || "not yet assigned"} · Fee: ₹${res?.data?.monthly_fee}/mo (applies from next invoice generation).`, "Done");
      setModal(false); await load();
    } catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
    finally { setSaving(false); }
  };

  const handleRemove = async (row) => {
    const ok = await dialogConfirm(`Remove ${row.student_name} from transport?`, "Confirm Remove");
    if (!ok) return;
    try { await apiRequest(`/transport/allocations/${row.student_id}`, "DELETE"); await load(); }
    catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={openNew}><Icon name="plus" size={13} /> Allocate Student</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>Student</th><th>Admission No</th><th>Route</th><th>Stop</th><th>Bus</th><th>Fee/mo</th><th style={{ textAlign: "center" }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>No students allocated yet.</td></tr>
              ) : rows.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, fontSize: 12.5 }}>{a.student_name}</td>
                  <td style={{ fontSize: 12 }}>{a.admission_no}</td>
                  <td style={{ fontSize: 12 }}>{a.route_name}</td>
                  <td style={{ fontSize: 12 }}>{a.stop_name}</td>
                  <td style={{ fontSize: 12 }}>{a.assigned_vehicle || <span style={{ color: C.textFaint }}>—</span>}</td>
                  <td style={{ fontSize: 12, fontWeight: 700 }}>₹{paiseToRupee(a.monthly_fee_paise)}</td>
                  <td style={{ textAlign: "center" }}>
                    <button className="btn btn-ghost" style={{ padding: "5px 9px" }} onClick={() => handleRemove(a)}><Icon name="trash" size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Allocate Student to Transport" width={480}>
        <div>
          <FormRow label="Search Student">
            <input className="input" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Name or admission no." />
          </FormRow>
          {studentQuery && (
            <div style={{ maxHeight: 140, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 14 }}>
              {filteredStudents.map((s) => (
                <div key={s.id} onClick={() => { setForm((f) => ({ ...f, student_id: s.id })); setStudentQuery(`${s.first_name} ${s.last_name || ""} (${s.admission_no || ""})`); }}
                  style={{ padding: "8px 12px", fontSize: 12.5, cursor: "pointer", background: form.student_id === s.id ? C.surfaceAlt : "transparent", borderBottom: `1px solid ${C.border}` }}>
                  {s.first_name} {s.last_name || ""} <span style={{ color: C.textMuted }}>· {s.admission_no || "—"}</span>
                </div>
              ))}
              {filteredStudents.length === 0 && <div style={{ padding: 12, fontSize: 12, color: C.textMuted }}>No matches</div>}
            </div>
          )}

          <FormRow label="Route">
            <select className="select" value={form.route_id || ""} onChange={(e) => onRouteChange(e.target.value)}>
              <option value="">-- Select Route --</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.shift})</option>)}
            </select>
          </FormRow>
          <FormRow label="Pickup/Drop Stop">
            <select className="select" value={form.stop_id || ""} onChange={(e) => onStopChange(e.target.value)} disabled={!stops.length}>
              <option value="">-- Select Stop --</option>
              {stops.map((s) => <option key={s.id} value={s.id}>{s.stop_name} ({s.pickup_time || "—"}) · ₹{paiseToRupee(s.monthly_fare_paise)}/mo</option>)}
            </select>
          </FormRow>

          {preview && (
            <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12.5 }}>
              Monthly Transport Fee: <b>₹{preview.fare}</b> — will auto-apply from the next invoice generation run.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setModal(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAllocate} disabled={saving}>{saving ? "Saving…" : "Allocate"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
