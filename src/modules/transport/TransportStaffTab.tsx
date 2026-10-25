// FILE: teacher-app/src/modules/transport/TransportStaffTab.tsx
// @ts-nocheck
// Drivers & conductors = EXISTING school staff. Pick a person from the staff list and choose Driver or Conductor.
// No role is verified: whoever is assigned here (and then to a bus in Trips) is the person whose phone tracks that bus.
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { ROLE_META } from "../../utils/roles";

export const TransportStaffTab = () => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [modal, setModal] = useState(null);   // "new" | row being edited
  const [form, setForm] = useState({});
  const [find, setFind] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const res = await apiRequest("/transport/staff"); setRows(res?.data || []); }
    catch (e) { dialogAlert("Failed to load staff: " + e.message, "Error"); }
    finally { setLoading(false); }
  };
  const loadCandidates = async () => {
    try { const res = await apiRequest("/transport/staff-candidates"); setCandidates(res?.data || []); }
    catch (e) { dialogAlert("Could not load the staff list: " + e.message, "Error"); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ role: "driver", status: "active" }); setFind(""); setModal("new"); loadCandidates(); };
  const openEdit = (row) => { setForm({ ...row }); setFind(""); setModal(row); if (!row.user_id) loadCandidates(); };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const picked = useMemo(() => candidates.find((c) => c.user_id === form.user_id), [candidates, form.user_id]);
  const shown = useMemo(() => {
    const q = find.trim().toLowerCase();
    return candidates.filter((c) => !q || c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q));
  }, [candidates, find]);
  const isNew = modal === "new";
  const needsPick = isNew || (modal && !modal.user_id);   // new record, or an old record not yet linked to a staff member
  const person = needsPick ? picked : modal; // who is shown in the preview

  const handleSave = async () => {
    if (needsPick && !form.user_id) { dialogAlert("Select a staff member first.", "Missing Info"); return; }
    setSaving(true);
    try {
      const body = { user_id: form.user_id, role: form.role, license_no: form.license_no, license_expiry: form.license_expiry, is_verified: !!form.is_verified, status: form.status || "active" };
      if (isNew) await apiRequest("/transport/staff", "POST", body);
      else await apiRequest(`/transport/staff/${modal.id}`, "PUT", body);
      setModal(null); await load();
    } catch (e) { dialogAlert("Save failed: " + e.message, "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    const ok = await dialogConfirm(`Remove ${row.full_name} as ${row.role}? The staff account itself is not deleted.`, "Confirm Remove");
    if (!ok) return;
    try { await apiRequest(`/transport/staff/${row.id}`, "DELETE"); await load(); }
    catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: C.textMuted, maxWidth: 560 }}>Drivers and conductors are picked from your existing staff. The staff member assigned to a bus is the one whose phone tracks it.</div>
        <button className="btn btn-primary" onClick={openNew}><Icon name="plus" size={13} /> Add Driver/Conductor</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th>Staff</th><th>Role</th><th>Phone</th><th>License No</th><th>License Expiry</th><th>Verified</th><th>Status</th><th style={{ textAlign: "center" }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>No drivers/conductors added yet.</td></tr>
              ) : rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{s.user_id ? (s.email || "") : <span style={{ color: C.yellow }}>Not linked to a staff account — edit to link</span>}</div>
                  </td>
                  <td style={{ textTransform: "capitalize" }}><span className={`badge ${s.role === "driver" ? "badge-green" : "badge-yellow"}`}>{s.role}</span></td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{s.phone}</td>
                  <td style={{ fontSize: 12 }}>{s.license_no || "—"}</td>
                  <td style={{ fontSize: 12 }}>{s.license_expiry?.slice?.(0, 10) || "—"}</td>
                  <td>{s.is_verified ? <span className="badge badge-green">Verified</span> : <span className="badge badge-red">Unverified</span>}</td>
                  <td><span className={`badge ${s.status === "active" ? "badge-green" : "badge-yellow"}`}>{s.status}</span></td>
                  <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    <button className="btn btn-ghost" style={{ padding: "5px 9px" }} onClick={() => openEdit(s)}><Icon name="edit" size={13} /></button>
                    <button className="btn btn-ghost" style={{ padding: "5px 9px" }} onClick={() => handleDelete(s)}><Icon name="trash" size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={isNew ? "Add Driver/Conductor" : "Edit Driver/Conductor"} width={520}>
        {modal && (
          <div>
            {needsPick && (
              <>
                {!isNew && <div style={{ fontSize: 12.5, color: C.yellow, marginBottom: 10 }}>This record is not linked to a staff account. Select the staff member to link it.</div>}
                <FormRow label="Staff member">
                  <input className="input" placeholder="Search by name, email or phone…" value={find} onChange={(e) => setFind(e.target.value)} style={{ marginBottom: 8 }} />
                  <select className="select" size={6} value={form.user_id || ""} onChange={(e) => setF("user_id", e.target.value)} style={{ height: "auto" }}>
                    {shown.map((c) => (
                      <option key={c.user_id} value={c.user_id} disabled={!!c.transport_role && c.user_id !== modal.user_id}>
                        {c.full_name} — {(ROLE_META[c.staff_role] || { label: c.staff_role }).label}{c.email ? ` · ${c.email}` : ""}{c.transport_role ? `  (already ${c.transport_role})` : ""}
                      </option>
                    ))}
                  </select>
                  {candidates.length === 0 && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>No staff found. Add the person to Staff first (non-teaching staff), then come back.</div>}
                </FormRow>
              </>
            )}
            {person && (
              <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{person.full_name}</div>
                <div style={{ color: C.textMuted }}>{[person.email, person.phone].filter(Boolean).join("  ·  ") || "—"}</div>
                {needsPick && !person.phone && <div style={{ color: C.red, fontWeight: 600 }}>No phone number on this staff profile. Add one before assigning.</div>}
              </div>
            )}
            <FormGrid cols={2}>
              <FormRow label="Role">
                <select className="select" value={form.role || "driver"} onChange={(e) => setF("role", e.target.value)}>
                  <option value="driver">Driver</option><option value="conductor">Conductor</option>
                </select>
              </FormRow>
              <FormRow label="Status">
                <select className="select" value={form.status || "active"} onChange={(e) => setF("status", e.target.value)}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </FormRow>
              <FormRow label="License No"><input className="input" value={form.license_no || ""} onChange={(e) => setF("license_no", e.target.value)} /></FormRow>
              <FormRow label="License Expiry"><input className="input" type="date" value={form.license_expiry?.slice?.(0, 10) || ""} onChange={(e) => setF("license_expiry", e.target.value)} /></FormRow>
            </FormGrid>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 14 }}>
              <input type="checkbox" checked={!!form.is_verified} onChange={(e) => setF("is_verified", e.target.checked)} /> Documents Verified
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
