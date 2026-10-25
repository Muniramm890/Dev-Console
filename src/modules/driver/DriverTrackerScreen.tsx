// @ts-nocheck
// Driver mode (Android app on the bus phone): the driver just logs in once with his own username.
// The app gets a location-only tracker token and the native service shares the bus location 24x7 (even when the app is closed).
import { useCallback, useEffect, useState } from "react";
import { apiRequest, API_BASE_URL } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { BusTracker } from "../../utils/busTracker";
import { C } from "../../theme/theme";

const ago = (ms) => {
  if (!ms) return "never";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`;
};

const Row = ({ ok, title, hint, action, onAction, busy }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
    <div style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800,
      background: ok ? "rgba(34,197,94,.16)" : "rgba(239,68,68,.14)", color: ok ? "#22C55E" : "#EF4444" }}>{ok ? "✓" : "!"}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{title}</div>
      {!ok && hint && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
    </div>
    {!ok && action && <button className="btn btn-primary" disabled={busy} onClick={onAction} style={{ padding: "9px 14px", minHeight: 38, fontSize: 12.5, flexShrink: 0 }}>{action}</button>}
  </div>
);

export const DriverTrackerScreen = () => {
  const { user } = useAuth();
  const uid = String(user?.id ?? user?.userId ?? user?.user_id ?? "");
  const [info, setInfo] = useState(null);
  const [st, setSt] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  const refreshStatus = useCallback(async () => { try { setSt(await BusTracker.getStatus()); } catch (e) { setErr(e.message); } }, []);
  const refreshInfo = useCallback(async () => { try { const r = await apiRequest("/driver/me"); setInfo(r?.data || null); } catch (e) { /* offline: keep last */ } }, []);

  useEffect(() => {
    refreshInfo(); refreshStatus();
    const a = setInterval(refreshStatus, 3000), b = setInterval(refreshInfo, 30000), c = setInterval(() => tick((n) => n + 1), 10000);
    return () => { clearInterval(a); clearInterval(b); clearInterval(c); };
  }, [refreshInfo, refreshStatus]);

  // Auto-start: nothing to press. Get a tracker token once, hand it to the native service, keep the service running.
  useEffect(() => {
    if (!info?.is_driver || !st) return;
    if (st.configured && st.userId === uid) { if (!st.running && st.fineLocation) BusTracker.ensureRunning().then(setSt).catch(() => {}); return; }
    let dead = false;
    (async () => {
      try {
        const r = await apiRequest("/driver/tracker-token", "POST");
        const s = await BusTracker.start({ baseUrl: API_BASE_URL, token: r.data.token, userId: uid });
        if (!dead) { setSt(s); setErr(""); }
      } catch (e) { if (!dead) setErr(e.message || "Could not start tracking"); }
    })();
    return () => { dead = true; };
  }, [info?.is_driver, st?.configured, st?.userId, st?.fineLocation, st?.backgroundLocation, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (fn) => async () => { setBusy(true); try { setSt(await fn()); } catch (e) { setErr(e.message || "Could not complete this step"); } finally { setBusy(false); setTimeout(refreshStatus, 1500); } };

  const sentAgo = st?.lastSentAt ? Date.now() - st.lastSentAt : null;
  const live = st?.running && sentAgo !== null && sentAgo < 90000;
  const waiting = st?.running && !live;
  const allOk = st && st.fineLocation && st.backgroundLocation && st.notifications && st.batteryUnrestricted && st.gpsOn;
  const tone = live ? { c: "#22C55E", t: "Tracking is ON", s: `Location sent ${ago(st.lastSentAt)}` }
    : waiting ? { c: "#F59E0B", t: "Waiting for internet", s: `Last sent ${ago(st.lastSentAt)}${st.queued ? ` · ${st.queued} points saved on the phone` : ""}` }
    : { c: "#EF4444", t: "Tracking is OFF", s: st?.lastError || "Finish the steps below" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", justifyContent: "center", padding: "calc(18px + var(--sat, 0px)) 16px calc(24px + var(--sab, 0px))" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: C.text }}>Bus Tracker</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{info?.name ? `Driver: ${info.name}` : "Driver account"}</div>

        {info && !info.is_driver && (
          <div className="card" style={{ padding: 16, marginTop: 16, borderColor: "#EF4444" }}>
            <div style={{ fontWeight: 700, color: C.text }}>You are not added as a driver or conductor</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>Please ask the school office to add you as a driver or conductor in Transport → Staff.</div>
          </div>
        )}

        {info?.is_driver && (<>
          <div className="card" style={{ padding: 18, marginTop: 16, display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: tone.c, boxShadow: live ? `0 0 0 6px ${tone.c}33` : "none", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{tone.t}</div>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>{tone.s}</div>
            </div>
          </div>

          <div className="card" style={{ padding: "14px 18px", marginTop: 12 }}>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>YOUR BUS</div>
            {info.vehicle
              ? (<div style={{ marginTop: 4 }}><span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{info.vehicle.registration_no}</span>{info.route?.name && <span style={{ fontSize: 13, color: C.textMuted }}> · {info.route.name}</span>}</div>)
              : (<div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>No bus is assigned to you yet. Ask the school office to assign you in Transport. Tracking will start automatically.</div>)}
          </div>

          <div className="card" style={{ padding: "6px 18px", marginTop: 12 }}>
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, padding: "12px 0 2px" }}>PHONE SETUP {allOk ? "· ALL DONE" : ""}</div>
            <Row ok={!!st?.fineLocation} title="Location access" hint="Allow location for this app." action="Allow" busy={busy} onAction={run(() => BusTracker.requestLocation())} />
            <Row ok={!!st?.backgroundLocation} title="Location: Allow all the time" hint="Choose “Allow all the time” so tracking works when the app is closed." action="Allow" busy={busy}
              onAction={run(async () => { const s = await BusTracker.requestBackground(); return s.backgroundLocation ? s : BusTracker.openAppSettings(); })} />
            <Row ok={!!st?.gpsOn} title="Phone location (GPS) is on" hint="Turn on Location in the phone settings." action="Open" busy={busy} onAction={run(() => BusTracker.openLocationSettings())} />
            <Row ok={!!st?.notifications} title="Notifications" hint="Needed to keep tracking running in the background." action="Allow" busy={busy} onAction={run(() => BusTracker.requestNotifications())} />
            <Row ok={!!st?.batteryUnrestricted} title="Battery: Unrestricted" hint="Stops the phone from switching tracking off to save battery." action="Allow" busy={busy} onAction={run(() => BusTracker.requestBatteryExemption())} />
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
