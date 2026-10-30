// @ts-nocheck
// Shared logic for phone-location tracking on the Android app (bus phone AND any tracked staff member):
//  1) asks the server if tracking is ON for this account  2) gets a location-only token and starts the native service
//  3) asks the Android permissions ONE BY ONE, automatically (location -> all the time -> notifications -> battery)
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, API_BASE_URL } from "../../api/client";
import { BusTracker } from "../../utils/busTracker";

export const useTrackerSetup = ({ uid }) => {
  const [info, setInfo] = useState(null);
  const [st, setSt] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const asked = useRef(new Set());
  // the person must agree once before location sharing starts on his phone
  const consentKey = `tracker_consent_${uid}`;
  const [consent, setConsent] = useState(() => { try { return localStorage.getItem(consentKey) === "1"; } catch { return false; } });
  const agree = () => { try { localStorage.setItem(consentKey, "1"); } catch { /* private mode */ } setConsent(true); };

  const refreshStatus = useCallback(async () => { try { setSt(await BusTracker.getStatus()); } catch (e) { setErr(e.message); } }, []);
  const refreshInfo = useCallback(async () => { try { const r = await apiRequest("/driver/me"); setInfo(r?.data || null); } catch { /* offline: keep last */ } }, []);

  useEffect(() => {
    refreshInfo(); refreshStatus();
    const a = setInterval(refreshStatus, 3000), b = setInterval(refreshInfo, 30000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refreshInfo, refreshStatus]);

  // start the native service (token once per user)
  useEffect(() => {
    if (!info?.tracking_enabled || !st || !consent) return;
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
  }, [info?.tracking_enabled, st?.configured, st?.userId, st?.fineLocation, st?.backgroundLocation, uid, consent]); // eslint-disable-line react-hooks/exhaustive-deps

  // permissions: prompt automatically, one step at a time, each step only once per app start
  useEffect(() => {
    if (!info?.tracking_enabled || !st || !consent) return;
    const next = !st.fineLocation ? "location" : !st.backgroundLocation ? "background" : !st.notifications ? "notifications" : !st.batteryUnrestricted ? "battery" : null;
    if (!next || asked.current.has(next)) return;
    asked.current.add(next);
    (async () => {
      try {
        const s = next === "location" ? await BusTracker.requestLocation()
          : next === "background" ? await BusTracker.requestBackground()
          : next === "notifications" ? await BusTracker.requestNotifications()
          : await BusTracker.requestBatteryExemption();
        setSt(s);
      } catch { /* the user can use the buttons */ }
    })();
  }, [info?.tracking_enabled, st?.fineLocation, st?.backgroundLocation, st?.notifications, st?.batteryUnrestricted, consent]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (fn) => async () => { setBusy(true); try { setSt(await fn()); } catch (e) { setErr(e.message || "Could not complete this step"); } finally { setBusy(false); setTimeout(refreshStatus, 1500); } };
  const allOk = !!(st && st.fineLocation && st.backgroundLocation && st.notifications && st.batteryUnrestricted && st.gpsOn);
  return { info, st, err, busy, run, allOk, refreshStatus, consent, agree };
};
