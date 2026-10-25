// FILE: teacher-app/src/modules/transport/TransportVehiclesTab.tsx
// Source: admin App.tsx -> TransportVehiclesTab [9238-9374]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

// ── VEHICLES (Level 1) ──────────────────────────────────────────────────
export const TransportVehiclesTab = () => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | row-object
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await apiRequest("/transport/vehicles"); setRows(res?.data || []); }
    catch (e) { dialogAlert("Failed to load vehicles: " + e.message, "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ vehicle_type: "bus", seating_capacity: 40, gps_provider: "generic_webhook" }); setModal("new"); };
  const openEdit = (row) => { setForm({ ...row }); setModal(row); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.registration_no || !form.vehicle_type || !form.seating_capacity) {
      dialogAlert("Registration No, Vehicle Type and Seating Capacity are required.", "Missing Info"); return;
    }
    setSaving(true);
    try {
      if (modal === "new") await apiRequest("/transport/vehicles", "POST", form);
      else await apiRequest(`/transport/vehicles/${modal.id}`, "PUT", form);
      setModal(null); await load();
    } catch (e) { dialogAlert("Save failed: " + e.message, "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    const ok = await dialogConfirm(`Remove vehicle ${row.registration_no}?`, "Confirm Remove");
    if (!ok) return;
    try { await apiRequest(`/transport/vehicles/${row.id}`, "DELETE"); await load(); }
    catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
  };

  const expiryBadge = (date) => {
    if (!date) return <span style={{ color: C.textFaint, fontSize: 11 }}>—</span>;
    const days = Math.ceil((new Date(date) - new Date()) / 86400000);
    const cls = days < 0 ? "badge-red" : days <= 30 ? "badge-yellow" : "badge-green";
    return <span className={`badge ${cls}`} style={{ fontSize: 10.5 }}>{date} {days < 0 ? "(expired)" : days <= 30 ? `(${days}d left)` : ""}</span>;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={openNew}><Icon name="plus" size={13} /> Add Vehicle</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr>
              <th>Reg. No</th><th>Type</th><th>Capacity</th><th>Fitness Cert.</th><th>Insurance</th><th>GPS Device</th><th>Status</th><th style={{ textAlign: "center" }}>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>No vehicles added yet.</td></tr>
              ) : rows.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700 }}>{v.registration_no}</td>
                  <td style={{ textTransform: "capitalize", fontSize: 12 }}>{v.vehicle_type}</td>
                  <td style={{ fontSize: 12 }}>{v.seating_capacity} seats</td>
                  <td>{expiryBadge(v.fitness_expiry?.slice?.(0, 10))}</td>
                  <td>{expiryBadge(v.insurance_expiry?.slice?.(0, 10))}</td>
                  <td style={{ fontSize: 11, fontFamily: "monospace" }}>{v.device_imei || "—"}</td>
                  <td><span className={`badge ${v.status === "active" ? "badge-green" : "badge-yellow"}`}>{v.status}</span></td>
                  <td style={{ textAlign: "center" }}>
                    <button className="btn btn-ghost" style={{ padding: "5px 9px" }} onClick={() => openEdit(v)}><Icon name="edit" size={13} /></button>
                    <button className="btn btn-ghost" style={{ padding: "5px 9px" }} onClick={() => handleDelete(v)}><Icon name="trash" size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "new" ? "Add Vehicle" : "Edit Vehicle"} width={640}>
        {modal && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", marginBottom: 10 }}>Basic Info</div>
            <FormGrid cols={2}>
              <FormRow label="Registration No"><input className="input" value={form.registration_no || ""} disabled={modal !== "new"} onChange={(e) => setF("registration_no", e.target.value)} placeholder="RJ-14-PA-1234" /></FormRow>
              <FormRow label="Vehicle Type">
                <select className="select" value={form.vehicle_type || "bus"} onChange={(e) => setF("vehicle_type", e.target.value)}>
                  <option value="bus">Bus</option><option value="van">Van</option>
                </select>
              </FormRow>
              <FormRow label="Seating Capacity"><input className="input" type="number" value={form.seating_capacity || ""} onChange={(e) => setF("seating_capacity", Number(e.target.value))} /></FormRow>
              <FormRow label="Status">
                <select className="select" value={form.status || "active"} onChange={(e) => setF("status", e.target.value)}>
                  <option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option>
                </select>
              </FormRow>
            </FormGrid>

            <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", margin: "16px 0 10px" }}>Documents & Compliance</div>
            <FormGrid cols={2}>
              <FormRow label="Fitness Cert. No"><input className="input" value={form.fitness_cert_no || ""} onChange={(e) => setF("fitness_cert_no", e.target.value)} /></FormRow>
              <FormRow label="Fitness Expiry"><input className="input" type="date" value={form.fitness_expiry?.slice?.(0, 10) || ""} onChange={(e) => setF("fitness_expiry", e.target.value)} /></FormRow>
              <FormRow label="Insurance No"><input className="input" value={form.insurance_no || ""} onChange={(e) => setF("insurance_no", e.target.value)} /></FormRow>
              <FormRow label="Insurance Expiry"><input className="input" type="date" value={form.insurance_expiry?.slice?.(0, 10) || ""} onChange={(e) => setF("insurance_expiry", e.target.value)} /></FormRow>
              <FormRow label="PUC No"><input className="input" value={form.puc_no || ""} onChange={(e) => setF("puc_no", e.target.value)} /></FormRow>
              <FormRow label="PUC Expiry"><input className="input" type="date" value={form.puc_expiry?.slice?.(0, 10) || ""} onChange={(e) => setF("puc_expiry", e.target.value)} /></FormRow>
              <FormRow label="Permit No"><input className="input" value={form.permit_no || ""} onChange={(e) => setF("permit_no", e.target.value)} /></FormRow>
              <FormRow label="Permit Expiry"><input className="input" type="date" value={form.permit_expiry?.slice?.(0, 10) || ""} onChange={(e) => setF("permit_expiry", e.target.value)} /></FormRow>
            </FormGrid>

            <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", margin: "16px 0 10px" }}>IoT / GPS Setup</div>
            <FormGrid cols={2}>
              <FormRow label="GPS Provider / Protocol">
                <select className="select" value={form.gps_provider || "generic_webhook"} onChange={(e) => setF("gps_provider", e.target.value)}>
                  <option value="teltonika">Teltonika</option><option value="concox">Concox</option>
                  <option value="gt06">GT06</option><option value="generic_webhook">Generic / Webhook</option>
                </select>
              </FormRow>
              <FormRow label="Device IMEI / Tracking ID"><input className="input" value={form.device_imei || ""} onChange={(e) => setF("device_imei", e.target.value)} placeholder="15-digit IMEI" /></FormRow>
              <FormRow label="SIM Number"><input className="input" value={form.sim_number || ""} onChange={(e) => setF("sim_number", e.target.value)} /></FormRow>
              <FormRow label="Traccar Device ID (uniqueId)"><input className="input" value={form.traccar_device_id || ""} onChange={(e) => setF("traccar_device_id", e.target.value)} placeholder="matches Traccar's device uniqueId" /></FormRow>
            </FormGrid>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Vehicle"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
