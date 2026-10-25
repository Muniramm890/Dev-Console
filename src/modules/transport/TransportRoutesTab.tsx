// FILE: teacher-app/src/modules/transport/TransportRoutesTab.tsx
// Source: admin App.tsx -> TransportRoutesTab [9483-9652]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { useSession } from "../../contexts/SessionContext";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { paiseToRupee } from "./helpers";
import { C } from "../../theme/theme";

// ── ROUTES & STOPS (Level 1) ────────────────────────────────────────────
export const TransportRoutesTab = () => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeModal, setRouteModal] = useState(null);
  const [routeForm, setRouteForm] = useState({});
  const [stopsModal, setStopsModal] = useState(null); // route row whose stops are being managed
  const [stops, setStops] = useState([]);
  const [stopForm, setStopForm] = useState(null); // null | 'new' | stop-row
  const [saving, setSaving] = useState(false);

  const { currentYear } = useSession();
  const loadRoutes = async () => {
    setLoading(true);
    try { const res = await apiRequest(`/transport/routes${currentYear?.id ? `?academic_year_id=${currentYear.id}` : ""}`); setRoutes(res?.data || []); }
    catch (e) { dialogAlert("Failed to load routes: " + e.message, "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadRoutes(); }, [currentYear?.id]); // eslint-disable-line

  const openNewRoute = () => { setRouteForm({ shift: "morning" }); setRouteModal("new"); };
  const handleSaveRoute = async () => {
    if (!routeForm.name) { dialogAlert("Route name is required.", "Missing Info"); return; }
    setSaving(true);
    try {
      if (routeModal === "new") await apiRequest("/transport/routes", "POST", routeForm);
      else await apiRequest(`/transport/routes/${routeModal.id}`, "PUT", routeForm);
      setRouteModal(null); await loadRoutes();
    } catch (e) { dialogAlert("Save failed: " + e.message, "Error"); }
    finally { setSaving(false); }
  };
  const handleDeleteRoute = async (row) => {
    const ok = await dialogConfirm(`Remove route "${row.name}"?`, "Confirm Remove");
    if (!ok) return;
    try { await apiRequest(`/transport/routes/${row.id}`, "DELETE"); await loadRoutes(); }
    catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
  };

  const openStops = async (route) => {
    setStopsModal(route);
    try { const res = await apiRequest(`/transport/routes/${route.id}/stops`); setStops(res?.data || []); }
    catch (e) { dialogAlert("Failed to load stops: " + e.message, "Error"); }
  };
  const reloadStops = async () => {
    const res = await apiRequest(`/transport/routes/${stopsModal.id}/stops`); setStops(res?.data || []);
  };

  const openNewStop = () => { setStopForm({}); };
  const handleSaveStop = async () => {
    if (!stopForm.stop_name || stopForm.monthly_fare == null) { dialogAlert("Stop name and monthly fare are required.", "Missing Info"); return; }
    setSaving(true);
    try {
      if (stopForm.id) await apiRequest(`/transport/stops/${stopForm.id}`, "PUT", stopForm);
      else await apiRequest(`/transport/routes/${stopsModal.id}/stops`, "POST", stopForm);
      setStopForm(null); await reloadStops();
    } catch (e) { dialogAlert("Save failed: " + e.message, "Error"); }
    finally { setSaving(false); }
  };
  const handleDeleteStop = async (stop) => {
    const ok = await dialogConfirm(`Remove stop "${stop.stop_name}"?`, "Confirm Remove");
    if (!ok) return;
    try { await apiRequest(`/transport/stops/${stop.id}`, "DELETE"); await reloadStops(); }
    catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={openNewRoute}><Icon name="plus" size={13} /> Add Route</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {loading ? (
          <div style={{ color: C.textMuted, fontSize: 13 }}>Loading…</div>
        ) : routes.length === 0 ? (
          <div style={{ color: C.textMuted, fontSize: 13 }}>No routes created yet.</div>
        ) : routes.map((r) => (
          <div key={r.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, textTransform: "capitalize", marginTop: 2 }}>{r.shift} shift · {r.stop_count} stops</div>
              </div>
              <span className={`badge ${r.status === "active" ? "badge-green" : "badge-yellow"}`}>{r.status}</span>
            </div>
            <div style={{ fontSize: 12, marginTop: 10, color: C.textMuted }}>
              Current Bus: <b style={{ color: C.text }}>{r.current_vehicle || "Not assigned"}</b>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12 }} onClick={() => openStops(r)}>Manage Stops</button>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => { setRouteForm({ ...r }); setRouteModal(r); }}><Icon name="edit" size={13} /></button>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => handleDeleteRoute(r)}><Icon name="trash" size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!routeModal} onClose={() => setRouteModal(null)} title={routeModal === "new" ? "Add Route" : "Edit Route"} width={420}>
        {routeModal && (
          <div>
            <FormRow label="Route Name"><input className="input" value={routeForm.name || ""} onChange={(e) => setRouteForm((f) => ({ ...f, name: e.target.value }))} placeholder="Route 4 - Civil Lines" /></FormRow>
            <FormRow label="Shift">
              <select className="select" value={routeForm.shift || "morning"} onChange={(e) => setRouteForm((f) => ({ ...f, shift: e.target.value }))}>
                <option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option>
              </select>
            </FormRow>
            {routeModal !== "new" && (
              <FormRow label="Status">
                <select className="select" value={routeForm.status || "active"} onChange={(e) => setRouteForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </FormRow>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setRouteModal(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveRoute} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!stopsModal} onClose={() => setStopsModal(null)} title={stopsModal ? `Stops — ${stopsModal.name}` : ""} width={640}>
        {stopsModal && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={openNewStop}><Icon name="plus" size={12} /> Add Stop</button>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table className="table">
                <thead><tr><th>#</th><th>Stop</th><th>Pickup</th><th>Drop</th><th>Fare/mo</th><th style={{ textAlign: "center" }}>Actions</th></tr></thead>
                <tbody>
                  {stops.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: C.textMuted }}>No stops added yet.</td></tr>
                  ) : stops.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontSize: 12 }}>{s.sequence_no}</td>
                      <td style={{ fontWeight: 600, fontSize: 12.5 }}>{s.stop_name}</td>
                      <td style={{ fontSize: 12 }}>{s.pickup_time || "—"}</td>
                      <td style={{ fontSize: 12 }}>{s.drop_time || "—"}</td>
                      <td style={{ fontSize: 12, fontWeight: 700 }}>₹{paiseToRupee(s.monthly_fare_paise)}</td>
                      <td style={{ textAlign: "center" }}>
                        <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setStopForm({ ...s, monthly_fare: paiseToRupee(s.monthly_fare_paise) })}><Icon name="edit" size={12} /></button>
                        <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => handleDeleteStop(s)}><Icon name="trash" size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!stopForm} onClose={() => setStopForm(null)} title={stopForm?.id ? "Edit Stop" : "Add Stop"} width={420} zIndex={1100}>
        {stopForm && (
          <div>
            <FormRow label="Stop Name"><input className="input" value={stopForm.stop_name || ""} onChange={(e) => setStopForm((f) => ({ ...f, stop_name: e.target.value }))} placeholder="Stop A - Market Chowk" /></FormRow>
            <FormGrid cols={2}>
              <FormRow label="Pickup Time"><input className="input" type="time" value={stopForm.pickup_time || ""} onChange={(e) => setStopForm((f) => ({ ...f, pickup_time: e.target.value }))} /></FormRow>
              <FormRow label="Drop Time"><input className="input" type="time" value={stopForm.drop_time || ""} onChange={(e) => setStopForm((f) => ({ ...f, drop_time: e.target.value }))} /></FormRow>
              <FormRow label="Monthly Fare (₹)"><input className="input" type="number" value={stopForm.monthly_fare || ""} onChange={(e) => setStopForm((f) => ({ ...f, monthly_fare: e.target.value }))} placeholder="800" /></FormRow>
            </FormGrid>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStopForm(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveStop} disabled={saving}>{saving ? "Saving…" : "Save Stop"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
