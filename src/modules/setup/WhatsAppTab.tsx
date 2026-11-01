// @ts-nocheck
// Setup -> Integrations: school's own WhatsApp Business number + the school's email sender (SendGrid).
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


const EMAIL_STATUS = {
  verified: { label: "Verified", cls: "badge-green" },
  pending: { label: "Verification pending", cls: "badge-yellow" },
  not_set: { label: "Not added", cls: "badge-blue" },
};

// Email sender: school adds its address -> verification link goes to that inbox -> "Check status" -> all school emails go from it.
// Until verified (or if it ever fails) emails are sent from the School Office default address.
const EmailSenderCard = () => {
  const { dialogAlert, dialogConfirm } = useDialog();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setInfo((await apiRequest("/whatsapp/email"))?.data || null); }
    catch (e) { setError(e?.message || "Could not load email settings."); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const run = async (key, fn, okTitle = "Email") => {
    setBusy(key);
    try { const res = await fn(); if (res?.data) setInfo(res.data); if (res?.message) await dialogAlert(res.message, okTitle); return true; }
    catch (e) { await dialogAlert(e?.message || "Something went wrong.", "Email"); return false; }
    finally { setBusy(""); }
  };

  const add = async () => {
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { await dialogAlert("Please enter a valid email address.", "Missing details"); return; }
    const ok = await run("add", () => apiRequest("/whatsapp/email", "POST", { email: em, name: name.trim() }));
    if (ok) { setShowAdd(false); setEmail(""); setName(""); }
  };
  const remove = async () => {
    const yes = await dialogConfirm("Remove this sender? Emails will go from the School Office default address.", "Remove email");
    if (yes) await run("remove", () => apiRequest("/whatsapp/email", "DELETE"));
  };

  const st = EMAIL_STATUS[info?.status] || EMAIL_STATUS.not_set;
  const has = info && info.status !== "not_set";

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 10, flexWrap: "wrap" }}>
        <h3 className="syne" style={{ fontSize: 14, fontWeight: 700 }}>School Email (Sender)</h3>
        {!loading && !error && (
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => { setEmail(has ? info.email : ""); setName(has ? info.name || "" : ""); setShowAdd(true); }}>
            <Icon name={has ? "edit" : "plus"} size={13} /> {has ? "Change Email" : "Add Email"}
          </button>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, marginBottom: 6 }}>
        Fee receipts, notices and alerts are emailed to parents and staff. Add your school's email address to send them from your own address.
      </div>

      {loading ? (
        <div className="pulse" style={{ padding: 24, textAlign: "center", color: C.primary, fontWeight: 600 }}>Loading...</div>
      ) : error ? (
        <div style={{ color: C.red, fontSize: 13 }}>{error}</div>
      ) : (
        <>
          <Row label="Email">{info?.email || "-"}</Row>
          {has && info.name && <Row label="Sender name">{info.name}</Row>}
          <Row label="Status"><span className={`badge ${st.cls}`}>{st.label}</span></Row>
          <Row label="Emails are sent from">{info?.sending_from === "own_email" ? "Your own email" : `School Office default${info?.default_from ? ` (${info.default_from})` : ""}`}</Row>

          {info?.status === "pending" && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, background: `${C.yellow}14`, borderRadius: 10, padding: "10px 14px" }}>
              {info.note || "A verification link has been sent to this address. Open it, then press Check status."}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn btn-primary" style={{ fontSize: 12 }} disabled={!!busy} onClick={() => run("refresh", () => apiRequest("/whatsapp/email/refresh", "POST"))}>{busy === "refresh" ? "Checking..." : "Check status"}</button>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={!!busy} onClick={() => run("resend", () => apiRequest("/whatsapp/email/resend", "POST"))}>{busy === "resend" ? "Sending..." : "Resend link"}</button>
              </div>
            </div>
          )}
          {info?.status === "verified" && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, background: `${C.green}14`, borderRadius: 10, padding: "10px 14px" }}>
              All school emails are sent from this address. If it ever fails, the School Office default address is used automatically.
            </div>
          )}
          {!has && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: C.textMuted, lineHeight: 1.6 }}>
              No email added yet. Emails are currently sent from the School Office default address.
            </div>
          )}
          {has && (
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-danger" style={{ fontSize: 12 }} disabled={!!busy} onClick={remove}>{busy === "remove" ? "Removing..." : "Remove email"}</button>
            </div>
          )}
        </>
      )}

      <Modal open={showAdd} onClose={() => busy !== "add" && setShowAdd(false)} title={has ? "Change Email" : "Add Email"} width={460}>
        <FormRow label="Sender email address">
          <input className="input" type="email" inputMode="email" placeholder="e.g. office@yourschool.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormRow>
        <FormRow label="Sender name (shown to parents)">
          <input className="input" placeholder="e.g. ABC Public School" value={name} onChange={(e) => setName(e.target.value)} />
        </FormRow>
        <div style={{ fontSize: 12, color: C.yellow, background: `${C.yellow}14`, borderRadius: 10, padding: "9px 12px", lineHeight: 1.6, marginBottom: 14 }}>
          A verification link will be sent to this address. Use an inbox you can open. Emails switch to this address only after you verify it.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy === "add"} onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, opacity: busy === "add" ? 0.7 : 1 }} disabled={busy === "add"} onClick={add}>{busy === "add" ? "Saving..." : "Save & Send Link"}</button>
        </div>
      </Modal>
    </div>
  );
};

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

      <EmailSenderCard />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
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
