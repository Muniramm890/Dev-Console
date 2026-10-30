// @ts-nocheck
// The 5 phone-setup steps (shared by the tracker screen and the setup popup).
import { BusTracker } from "../../utils/busTracker";
import { C } from "../../theme/theme";

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

export const TrackerChecklist = ({ st, busy, run }) => (
  <div>
    <Row ok={!!st?.fineLocation} title="Location access" hint="Allow location for this app." action="Allow" busy={busy} onAction={run(() => BusTracker.requestLocation())} />
    <Row ok={!!st?.backgroundLocation} title="Location: Allow all the time" hint="Choose “Allow all the time” so tracking works when the app is closed." action="Allow" busy={busy}
      onAction={run(async () => { const s = await BusTracker.requestBackground(); return s.backgroundLocation ? s : BusTracker.openAppSettings(); })} />
    <Row ok={!!st?.gpsOn} title="Phone location (GPS) is on" hint="Turn on Location in the phone settings." action="Open" busy={busy} onAction={run(() => BusTracker.openLocationSettings())} />
    <Row ok={!!st?.notifications} title="Notifications" hint="Needed to keep tracking running in the background." action="Allow" busy={busy} onAction={run(() => BusTracker.requestNotifications())} />
    <Row ok={!!st?.batteryUnrestricted} title="Battery: Unrestricted" hint="Stops the phone from switching tracking off to save battery." action="Allow" busy={busy} onAction={run(() => BusTracker.requestBatteryExemption())} />
  </div>
);
