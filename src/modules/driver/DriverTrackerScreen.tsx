// @ts-nocheck
// Tracker-only screen (Android app on the bus phone / a plain driver-conductor login with no ERP modules).
// Everything is automatic: the app asks the permissions, gets the token and keeps sharing the location 24x7, even when closed.
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { C } from "../../theme/theme";
import { TrackerChecklist } from "./TrackerChecklist";
import { TrackerConsent } from "./TrackerConsent";
import { useTrackerSetup } from "./useTrackerSetup";

const ago = (ms) => {
  if (!ms) return "never";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`;
};

export const DriverTrackerScreen = () => {
  const { user } = useAuth();
  const uid = String(user?.id ?? user?.userId ?? user?.user_id ?? "");
  const { info, st, err, busy, run, allOk, consent, agree } = useTrackerSetup({ uid });
  const [, tick] = useState(0);
  useEffect(() => { const c = setInterval(() => tick((n) => n + 1), 10000); return () => clearInterval(c); }, []);

  const sentAgo = st?.lastSentAt ? Date.now() - st.lastSentAt : null;
  const live = st?.running && sentAgo !== null && sentAgo < 90000;
  const waiting = st?.running && !live;
  const tone = live ? { c: "#22C55E", t: "Tracking is ON", s: `Location sent ${ago(st.lastSentAt)}` }
    : waiting ? { c: "#F59E0B", t: "Waiting for internet", s: `Last sent ${ago(st.lastSentAt)}${st.queued ? ` · ${st.queued} points saved on the phone` : ""}` }
    : { c: "#EF4444", t: "Tracking is OFF", s: st?.lastError || "Allow the permissions below" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center", padding: "calc(18px + var(--sat, 0px)) 16px calc(24px + var(--sab, 0px))" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: C.text }}>{info?.is_driver ? "Bus Tracker" : "Location Sharing"}</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{info?.name || user?.name || "Staff account"}</div>

        {info && !info.tracking_enabled && (
          <div className="card" style={{ padding: 16, marginTop: 16, borderColor: "#EF4444" }}>
            <div style={{ fontWeight: 700, color: C.text }}>Location tracking is not switched on for your account</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>Please ask the school office to add you as a driver/conductor or switch tracking on.</div>
          </div>
        )}

        {info?.tracking_enabled && !consent && <div className="card" style={{ padding: 18, marginTop: 16 }}><TrackerConsent onAgree={agree} /></div>}

        {info?.tracking_enabled && consent && (<>
          <div className="card" style={{ padding: 18, marginTop: 16, display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: tone.c, boxShadow: live ? `0 0 0 6px ${tone.c}33` : "none", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{tone.t}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>{tone.s}</div>
            </div>
          </div>

          {info.is_driver && (
            <div className="card" style={{ padding: "14px 18px", marginTop: 12 }}>
              <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>YOUR BUS</div>
              {info.vehicle
                ? (<div style={{ marginTop: 4 }}><span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{info.vehicle.registration_no}</span>{info.route?.name && <span style={{ fontSize: 13, color: C.textMuted }}> · {info.route.name}</span>}</div>)
                : (<div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>No bus is assigned to you yet. Tracking will start for the bus automatically once the school office assigns you in Transport.</div>)}
            </div>
          )}

          <div className="card" style={{ padding: "6px 18px", marginTop: 12 }}>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, padding: "12px 0 2px" }}>PHONE SETUP {allOk ? "· ALL DONE" : ""}</div>
            <TrackerChecklist st={st} busy={busy} run={run} />
          </div>

          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginTop: 14, padding: "0 4px" }}>
            Keep <b>mobile data</b> and <b>location</b> ON and keep the phone charged. Tracking continues even when this app is closed or the screen is off.
            If the internet is lost, the school sees “last seen” and the saved points are sent when it returns.
          </div>
          {err && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 10 }}>{err}</div>}
        </>)}
      </div>
    </div>
  );
};
