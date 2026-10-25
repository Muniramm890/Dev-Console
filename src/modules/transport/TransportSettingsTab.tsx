// FILE: teacher-app/src/modules/transport/TransportSettingsTab.tsx
// Source: admin App.tsx -> TransportSettingsTab [9977-10021]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

// ── GPS SETTINGS — each school connects its own self-hosted Traccar ─────
export const TransportSettingsTab = () => {
  const { dialogAlert } = useDialog();
  const [form, setForm] = useState({ traccar_base_url: "", traccar_username: "", traccar_password: "" });
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try { const res = await apiRequest("/transport/gps/settings"); if (res?.data) setSaved(res.data); }
      catch (e) { /* not configured yet */ }
    })();
  }, []);

  const handleSave = async () => {
    if (!form.traccar_base_url || !form.traccar_username || !form.traccar_password) {
      dialogAlert("All fields are required.", "Missing Info"); return;
    }
    setSaving(true);
    try {
      await apiRequest("/transport/gps/settings", "PUT", form);
      setSaved({ traccar_base_url: form.traccar_base_url, traccar_username: form.traccar_username });
      setForm((f) => ({ ...f, traccar_password: "" }));
      dialogAlert("Traccar connection saved.", "Done");
    } catch (e) { dialogAlert("Failed: " + e.message, "Error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ padding: 20, maxWidth: 520 }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Self-Hosted Traccar Connection</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
        Point this school at its own Traccar server — supports 200+ GPS protocols (Concox, Teltonika, Coban, Sinotrack) out of the box.
      </div>
      {saved && (
        <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
          Currently connected: <b>{saved.traccar_base_url}</b> ({saved.traccar_username})
        </div>
      )}
      <FormRow label="Traccar Server URL"><input className="input" value={form.traccar_base_url} onChange={(e) => setForm((f) => ({ ...f, traccar_base_url: e.target.value }))} placeholder="https://your-school-traccar.example.com" /></FormRow>
      <FormRow label="Username"><input className="input" value={form.traccar_username} onChange={(e) => setForm((f) => ({ ...f, traccar_username: e.target.value }))} /></FormRow>
      <FormRow label="Password"><input className="input" type="password" value={form.traccar_password} onChange={(e) => setForm((f) => ({ ...f, traccar_password: e.target.value }))} placeholder={saved ? "Enter to update" : ""} /></FormRow>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: 6 }}>{saving ? "Saving…" : "Save Connection"}</button>
    </div>
  );
};
