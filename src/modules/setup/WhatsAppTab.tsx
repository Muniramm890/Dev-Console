// @ts-nocheck
// Setup -> WhatsApp: view / add the school's own WhatsApp Business number.
// Add-once: after saving, the school cannot edit or delete it (School Office updates it from the Dev Console).
import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

const SUPPORT = "support@schooloffice.tech";
const STATUS = {
  verified: { label: "Verified", cls: "badge-green" },
  pending: { label: "Verification pending", cls: "badge-yellow" },
  blocked: { label: "Blocked", cls: "badge-red" },
  not_set: { label: "Not added", cls: "badge-blue" },
};
const fmtNumber = (n) => {
  const d = String(n || "").replace(/\D/g, "");
  if (!d) return "-";
  return d.length === 12 && d.startsWith("91") ? `+91 ${d.slice(2, 7)} ${d.slice(7)}` : `+${d}`;
};

const Row = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${C.border}33` }}>
    <span style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 13.5, fontWeight: 700, textAlign: "right" }}>{children}</span>
  </div>
);

const Upcoming = ({ title, text }) => (
  <div className="card" style={{ border: `1px dashed ${C.border}`, background: "transparent", textAlign: "center", padding: 26 }}>
    <div className="syne" style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
      {title}
      <span style={{ fontSize: 9, fontWeight: 800, background: `${C.yellow}22`, color: C.yellow, padding: "1px 6px", borderRadius: 8 }}>UPCOMING</span>
    </div>
    <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6 }}>{text}</div>
  </div>
);

export const WhatsAppTab = () => {
  const { dialogAlert } = useDialog();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [number, setNumber] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await apiRequest("/whatsapp/number");
      setInfo(res?.data || null);
    } catch (e) { setError(e?.message || "Could not load WhatsApp settings."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const n = number.replace(/\D/g, "");
    const p = phoneId.trim();
    if (n.length < 10) { await dialogAlert("Please enter a valid WhatsApp number.", "Missing details"); return; }
    if (!/^\d{8,25}$/.test(p)) { await dialogAlert("Please enter a valid Phone ID (numbers only).", "Missing details"); return; }
    setSaving(true);
    try {
      const res = await apiRequest("/whatsapp/number", "POST", { number: n, phone_id: p });
      setShowAdd(false); setNumber(""); setPhoneId("");
      await dialogAlert(res?.message || "WhatsApp number saved.", "WhatsApp");
      await load();
    } catch (e) {
      await dialogAlert(e?.message || "Could not save the WhatsApp number.", "Could not save");
    } finally { setSaving(false); }
  };

  const st = STATUS[info?.status] || STATUS.not_set;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="syne" style={{ fontWeight: 700, fontSize: 16 }}>WhatsApp Messaging</div>
        <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4, lineHeight: 1.6 }}>
          OTPs, attendance alerts and fee receipts are sent to parents and staff on WhatsApp. Add your school's WhatsApp Business number to send them from your own number.
        </div>
      </div>

      {loading ? (
        <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading...</div>
      ) : error ? (
        <div className="card" style={{ color: C.red, fontSize: 13 }}>{error}</div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 10, flexWrap: "wrap" }}>
            <h3 className="syne" style={{ fontSize: 14, fontWeight: 700 }}>School WhatsApp Number</h3>
            {!info?.locked && (
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAdd(true)}>
                <Icon name="plus" size={13} /> Add WhatsApp Number
              </button>
            )}
          </div>

          <Row label="Number">{fmtNumber(info?.number)}</Row>
          <Row label="Status"><span className={`badge ${st.cls}`}>{st.label}</span></Row>
          {info?.locked && <Row label="Phone ID">{info.phone_id_masked}</Row>}
          {info?.verified_name && <Row label="Business name">{info.verified_name}</Row>}
          <Row label="Messages are sent from">{info?.sending_from === "own_number" ? "Your own number" : "School Office default number"}</Row>

          {info?.locked ? (
            <div style={{ marginTop: 14, fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, background: `${C.blue}11`, borderRadius: 10, padding: "10px 14px" }}>
              To change, delete or update the WhatsApp number, please contact School Office at{" "}
              <a href={`mailto:${SUPPORT}`} style={{ color: C.primary, fontWeight: 700 }}>{SUPPORT}</a>.
              {info.status === "pending" && " Until it is verified, messages are sent from the School Office default number."}
            </div>
          ) : (
            <div style={{ marginTop: 14, fontSize: 12.5, color: C.textMuted, lineHeight: 1.6 }}>
              No number added yet. Messages are currently sent from the School Office default number.
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
        <Upcoming title="Email" text="Send receipts and notices from your own email address." />
        <Upcoming title="Payment Gateways" text="Connect your own payment gateway account for fee collection." />
      </div>

      <Modal open={showAdd} onClose={() => !saving && setShowAdd(false)} title="Add WhatsApp Number" width={460}>
        <FormRow label="WhatsApp Number (with or without +91)">
          <input className="input" inputMode="numeric" placeholder="e.g. 9876543210" value={number} onChange={(e) => setNumber(e.target.value)} />
        </FormRow>
        <FormRow label="Phone ID (provided by School Office)">
          <input className="input" inputMode="numeric" placeholder="e.g. 123456789012345" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} />
        </FormRow>
        <div style={{ fontSize: 12, color: C.yellow, background: `${C.yellow}14`, borderRadius: 10, padding: "9px 12px", lineHeight: 1.6, marginBottom: 14 }}>
          Once saved, this number cannot be changed or deleted from here. To update it later, contact {SUPPORT}.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled={saving} onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Number"}</button>
        </div>
      </Modal>
    </div>
  );
};
