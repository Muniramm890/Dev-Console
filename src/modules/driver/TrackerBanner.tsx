// @ts-nocheck
// Normal ERP + tracking switched ON for this staff account: tracking runs in the background and this small bar
// only appears while something still needs to be allowed on the phone.
import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import { C } from "../../theme/theme";
import { TrackerChecklist } from "./TrackerChecklist";
import { TrackerConsent } from "./TrackerConsent";
import { useTrackerSetup } from "./useTrackerSetup";

export const TrackerBanner = () => {
  const { user } = useAuth();
  const t = useTrackerSetup({ uid: String(user?.id ?? "") });
  const [open, setOpen] = useState(false);
  if (!t.info?.tracking_enabled || !t.st || (t.consent && t.allOk && t.st.running)) return null;
  return (
    <>
      <div style={{ position: "fixed", left: 12, right: 12, bottom: "calc(12px + var(--sab, 0px))", zIndex: 9000, maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center", gap: 10,
        background: C.surface, border: `1.5px solid ${C.primary}`, borderRadius: 14, padding: "10px 12px", boxShadow: "0 8px 28px rgba(0,0,0,.28)" }}>
        <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.4, color: C.text }}><b>Location sharing is on for your account.</b><br /><span style={{ color: C.textMuted }}>{t.consent ? "Finish the phone setup so it keeps working." : "Please read and agree to start."}</span></div>
        <button className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 12.5, flexShrink: 0 }} onClick={() => setOpen(true)}>Set up</button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Location sharing setup" width={440}>
        {!t.consent ? <TrackerConsent onAgree={t.agree} /> : (<>
          <TrackerChecklist st={t.st} busy={t.busy} run={t.run} />
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>Keep mobile data and location ON. Your school can see this phone's location while tracking is on.</div>
        </>)}
        {t.err && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>{t.err}</div>}
      </Modal>
    </>
  );
};
