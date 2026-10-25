// FILE: teacher-app/src/modules/transport/TransportTripsTab.tsx
// Source: admin App.tsx -> TransportTripsTab [9655-9769]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useSession } from "../../contexts/SessionContext";
import { FormRow } from "../../components/ui/FormRow";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

// ── TRIP / ROUTE ALLOCATION (Level 2) — the "1-click replace" screen ────
export const TransportTripsTab = () => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [assignments, setAssignments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // route row being (re)assigned
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const { currentYear } = useSession();
  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, r, v, s] = await Promise.all([
        apiRequest("/transport/trip-assignments"),
        apiRequest(`/transport/routes${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`),
        apiRequest("/transport/vehicles"),
        apiRequest("/transport/staff"),
      ]);
      setAssignments(a?.data || []); setRoutes(r?.data || []); setVehicles(v?.data || []); setStaff(s?.data || []);
    } catch (e) { dialogAlert("Failed to load: " + e.message, "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, [currentYear?.id]); // eslint-disable-line

  const assignmentFor = (routeId) => assignments.find((a) => a.route_id === routeId);
  const drivers = staff.filter((s) => s.role === "driver" && s.status === "active");
  const conductors = staff.filter((s) => s.role === "conductor" && s.status === "active");
  const activeVehicles = vehicles.filter((v) => v.status === "active");

  const openAssign = (route) => {
    const existing = assignmentFor(route.id);
    setForm({ route_id: route.id, vehicle_id: existing?.vehicle_id || "", driver_id: existing?.driver_id || "", conductor_id: existing?.conductor_id || "" });
    setModal(route);
  };

  const handleSave = async () => {
    if (!form.vehicle_id || !form.driver_id) { dialogAlert("Vehicle and Driver are required.", "Missing Info"); return; }
    const isReplace = !!assignmentFor(form.route_id);
    if (isReplace) {
      const ok = await dialogConfirm("This will replace the currently assigned bus/driver for this route. Student allocations stay untouched. Continue?", "Confirm Replace");
      if (!ok) return;
    }
    setSaving(true);
    try {
      await apiRequest("/transport/trip-assignments", "POST", form);
      setModal(null); await loadAll();
    } catch (e) { dialogAlert("Save failed: " + e.message, "Error"); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>Route</th><th>Shift</th><th>Vehicle</th><th>Driver</th><th>Conductor</th><th style={{ textAlign: "center" }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>Loading…</td></tr>
              ) : routes.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>Create a route first (Routes & Stops tab).</td></tr>
              ) : routes.map((r) => {
                const a = assignmentFor(r.id);
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700 }}>{r.name}</td>
                    <td style={{ textTransform: "capitalize", fontSize: 12 }}>{r.shift}</td>
                    <td style={{ fontSize: 12 }}>{a?.registration_no || <span style={{ color: C.textFaint }}>Not assigned</span>}</td>
                    <td style={{ fontSize: 12 }}>{a?.driver_name || "—"}</td>
                    <td style={{ fontSize: 12 }}>{a?.conductor_name || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <button className="btn btn-primary" style={{ fontSize: 11.5, padding: "6px 12px" }} onClick={() => openAssign(r)}>{a ? "Replace" : "Assign"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal ? `Trip Assignment — ${modal.name}` : ""} width={460}>
        {modal && (
          <div>
            <FormRow label="Vehicle">
              <select className="select" value={form.vehicle_id || ""} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
                <option value="">-- Select Vehicle --</option>
                {activeVehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_no} ({v.seating_capacity} seats)</option>)}
              </select>
            </FormRow>
            <FormRow label="Driver">
              <select className="select" value={form.driver_id || ""} onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))}>
                <option value="">-- Select Driver --</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </FormRow>
            <FormRow label="Conductor (optional)">
              <select className="select" value={form.conductor_id || ""} onChange={(e) => setForm((f) => ({ ...f, conductor_id: e.target.value }))}>
                <option value="">-- None --</option>
                {conductors.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </FormRow>
            <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 12 }}>Student transport allocations are linked to the route, not the bus — swapping here never disturbs them.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Assignment"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
