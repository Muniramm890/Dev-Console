// @ts-nocheck
// Shown once before location sharing starts on a staff member's phone.
import { C } from "../../theme/theme";

export const TrackerConsent = ({ onAgree }) => (
  <div>
    <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Location sharing is switched on for your account</div>
    <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, margin: "8px 0 14px" }}>
      While it is on, this phone's location is shared with your school's administrators, <b>including when the app is closed</b>.
      It is used only for bus tracking and staff safety. A small notification stays on the phone while sharing is active.
      If you have a question, or want it switched off, please contact the school office.
    </div>
    <button className="btn btn-primary" style={{ width: "100%" }} onClick={onAgree}>I understand and agree</button>
  </div>
);
