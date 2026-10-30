// FILE: teacher-app/src/modules/transport/TransportLiveTab.tsx
// @ts-nocheck
// Live fleet map (Google Maps). Positions come from the driver phones (24x7 tracking) and from Traccar devices.
// Status: Live (updated <= 2 min ago) · Last seen Xm/Xh/Xd (compact) · No data.
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL, apiRequest } from "../../api/client";
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";
import { createFleetMap } from "./fleetMap";

const LIVE_SEC = 120, RECENT_SEC = 1800;
const COLORS = { live: "#22C55E", recent: "#F59E0B", offline: "#EF4444", none: "#94A3B8" };
const LABEL = { live: "Live", recent: "Recently", offline: "Offline", none: "No data" };

const ago = (s) => (s == null ? "No data" : s < 60 ? `${Math.max(0, Math.round(s))}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
// a tracked staff member shaped like a bus row so the list, markers and popups can be shared
const staffItem = (p) => ({ kind: "staff", vehicle_id: p.user_id, registration_no: p.full_name, route_name: [p.transport_role, p.staff_role].find(Boolean) ? String([p.transport_role, p.staff_role].find(Boolean)).replace(/_/g, " ") : null,
  driver_name: null, driver_phone: p.phone, bus_reg: p.registration_no, latitude: p.latitude, longitude: p.longitude, speed_kmh: p.speed_kmh, battery_pct: p.battery_pct, age_sec: p.age_sec, _ts: p._ts });
const stamp = (v) => ({ ...v, _ts: v.age_sec == null ? null : Date.now() - v.age_sec * 1000 }); // moment of the last update on THIS device's clock

export const TransportLiveTab = () => {
  const [mode, setMode] = useState("bus"); // "bus" | "staff"
  const [people, setPeople] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapErr, setMapErr] = useState(null);
  const [cfg, setCfg] = useState(null);             // /transport/map-config
  const [forceOsm, setForceOsm] = useState(false);  // Google key rejected -> fall back to free OpenStreetMap
  const [engine, setEngine] = useState(null);
  const [mapReady, setMapReady] = useState(0);
  const [sel, setSel] = useState(null);
  const [traffic, setTraffic] = useState(false);
  const [, force] = useState(0);
  const fetchedAt = useRef(Date.now());
  const mapDiv = useRef(null), mapRef = useRef(null), focused = useRef(null);
  const tickN = useRef(0);

  // data
  const load = async () => {
    try {
      if (tickN.current++ % 4 === 0) apiRequest("/transport/gps/live").catch(() => {}); // refresh Traccar-fed vehicles (ignored if not configured)
      const res = await apiRequest("/transport/fleet/live");
      const ppl = await apiRequest("/transport/staff-live").then((r) => r?.data || []).catch(() => []);
      fetchedAt.current = Date.now(); setFleet((res?.data || []).map(stamp)); setPeople(ppl.map(stamp)); setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  // Real-time: the server pushes every location update (Socket.IO). Polling stays as a fallback.
  const [rt, setRt] = useState(false);
  const rtRef = useRef(false), lastEvt = useRef(0);
  useEffect(() => {
    const token = localStorage.getItem("erp_token"); if (!token) return;
    const merge = (list, key, e) => list.map((v) => (v[key] !== e[key] ? v
      : { ...v, ...(e.heartbeat ? {} : { latitude: e.latitude, longitude: e.longitude, speed_kmh: e.speed_kmh, heading: e.heading }),
          battery_pct: e.battery_pct ?? v.battery_pct, vehicle_id: key === "user_id" ? (e.vehicle_id ?? v.vehicle_id) : v.vehicle_id, source: "phone", age_sec: 0, _ts: Date.now() }));
    const sock = io(API_BASE_URL.replace(/\/api\/?$/, ""), { path: "/socket.io", auth: { token }, transports: ["websocket", "polling"], reconnectionDelayMax: 10000 });
    const on = (v) => { rtRef.current = v; setRt(v); };
    sock.on("connect", () => { on(true); load(); });
    sock.on("disconnect", () => on(false));
    sock.on("connect_error", () => on(false));
    sock.on("vehicle:position", (e) => { lastEvt.current = Date.now(); setFleet((l) => merge(l, "vehicle_id", e)); });
    sock.on("staff:position", (e) => { lastEvt.current = Date.now(); setPeople((l) => { const next = merge(l, "user_id", e); return next; }); });
    return () => sock.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); const iv = setInterval(() => { if (rtRef.current && Date.now() - lastEvt.current < 25000) return; load(); }, 10000); const t = setInterval(() => force((n) => n + 1), 15000); return () => { clearInterval(iv); clearInterval(t); }; }, []);
  useEffect(() => { apiRequest("/transport/map-config").then((r) => setCfg(r?.data || {})).catch(() => setCfg({})); }, []);

  const vehicles = useMemo(() => {
    const extra = (Date.now() - fetchedAt.current) / 1000;
    return (mode === "bus" ? fleet : people.map(staffItem)).map((v) => {
      const age = v._ts == null || v.latitude == null ? null : Math.max(0, (Date.now() - v._ts) / 1000);
      const status = age == null ? "none" : age <= LIVE_SEC ? "live" : age <= RECENT_SEC ? "recent" : "offline";
      return { ...v, age, status, lat: v.latitude == null ? null : Number(v.latitude), lng: v.longitude == null ? null : Number(v.longitude) };
    }).sort((a, b) => ({ live: 0, recent: 1, offline: 2, none: 3 }[a.status] - { live: 0, recent: 1, offline: 2, none: 3 }[b.status]) || String(a.registration_no).localeCompare(String(b.registration_no)));
  }, [fleet, people, mode, loading, error, fetchedAt.current]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => vehicles.reduce((m, v) => { m[v.status]++; return m; }, { live: 0, recent: 0, offline: 0, none: 0 }), [vehicles]);

  // map engine (free OpenStreetMap by default, Google Maps if a key is configured)
  useEffect(() => {
    if (!cfg || !mapDiv.current) return;
    let dead = false, created = null;
    setMapErr(null); mapRef.current = null; setEngine(null);
    createFleetMap(mapDiv.current, cfg, { onSelect: (id) => setSel(id), onFail: () => setForceOsm(true) }, forceOsm)
      .then((m) => { if (dead) { m.destroy(); return; } created = m; mapRef.current = m; setEngine(m.engine); setMapReady((n) => n + 1); })
      .catch((e) => { if (!dead) { if (cfg.google_maps_key && !forceOsm) setForceOsm(true); else setMapErr(e.message || "Map could not be loaded"); } });
    return () => { dead = true; mapRef.current = null; created?.destroy(); };
  }, [cfg, forceOsm]);

  const infoHtml = (v) => `
    <div style="font-family:Inter,Arial,sans-serif;min-width:200px;color:#14151F">
      <div style="font-weight:800;font-size:15px">${esc(v.registration_no)} <span style="font-size:11px;font-weight:700;color:${COLORS[v.status]}">● ${v.status === "live" ? "Live" : v.status === "none" ? "No data" : "Last seen " + ago(v.age) + " ago"}</span></div>
      <div style="font-size:12.5px;margin-top:6px;line-height:1.6;color:#444">
        ${v.kind === "staff"
          ? (v.route_name ? "Role: <b>" + esc(v.route_name) + "</b><br/>" : "") + (v.bus_reg ? "On bus: <b>" + esc(v.bus_reg) + "</b><br/>" : "") + (v.driver_phone ? `Phone: <a href="tel:${esc(v.driver_phone)}">${esc(v.driver_phone)}</a><br/>` : "")
          : (v.route_name ? "Route: <b>" + esc(v.route_name) + "</b><br/>" : "") + (v.driver_name ? "Driver: <b>" + esc(v.driver_name) + "</b>" + (v.driver_phone ? ` · <a href="tel:${esc(v.driver_phone)}">${esc(v.driver_phone)}</a>` : "") + "<br/>" : "")}
        ${v.speed_kmh != null && v.status === "live" ? "Speed: <b>" + Math.round(v.speed_kmh) + " km/h</b><br/>" : ""}
        ${v.battery_pct != null ? "Phone battery: <b>" + v.battery_pct + "%</b><br/>" : ""}
      </div>
      <a href="https://www.google.com/maps?q=${v.lat},${v.lng}" target="_blank" rel="noopener noreferrer" style="font-size:12.5px;font-weight:700;color:#1a73e8">Open in Google Maps</a>
    </div>`;

  // markers follow the data
  useEffect(() => {
    const m = mapRef.current; if (!m) return;
    m.setVehicles(vehicles.map((v) => ({ id: v.vehicle_id, lat: v.lat, lng: v.lng, status: v.status, color: COLORS[v.status], label: v.kind === "staff" ? initials(v.registration_no) : String(v.registration_no || "").replace(/\s+/g, "").slice(-4), title: v.registration_no })));
  }, [vehicles, mapReady]);

  // selecting a vehicle -> focus + info window
  useEffect(() => {
    const m = mapRef.current; if (!m || !sel) return;
    const v = vehicles.find((x) => x.vehicle_id === sel); if (!v || v.lat == null) return;
    if (focused.current !== sel) { focused.current = sel; m.focus(sel, infoHtml(v), true); } else m.focus(sel, infoHtml(v), false); // follow live changes without re-centring the map
  }, [sel, vehicles, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { mapRef.current?.setTraffic(traffic); }, [traffic, mapReady]);
  const fitAll = () => { mapRef.current?.fitAll(); setSel(null); focused.current = null; };

  return (
    <div>
      <style>{`
        .fleet-wrap { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 14px; height: calc(100vh - 250px); min-height: 520px; }
        .fleet-list { overflow-y: auto; padding: 0; }
        .fleet-map { position: relative; border-radius: 14px; overflow: hidden; border: 1px solid ${C.border}; min-height: 360px; background: ${C.surfaceAlt}; }
        @media (max-width: 900px) { .fleet-wrap { grid-template-columns: 1fr; height: auto; } .fleet-map { height: 52vh; order: -1; } .fleet-list { max-height: 44vh; } }
        .fleet-row { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-bottom: 1px solid ${C.border}; cursor: pointer; }
        .fleet-row:hover { background: ${C.surfaceAlt}; }
      `}</style>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["bus", `Buses (${fleet.length})`], ["staff", `Staff (${people.length})`]].map(([id, label]) => (
          <button key={id} className="btn" onClick={() => { setMode(id); setSel(null); focused.current = null; setTimeout(() => mapRef.current?.fitAll(), 120); }}
            style={{ border: "none", cursor: "pointer", padding: "8px 18px", borderRadius: 20, fontWeight: 700, fontSize: 13, background: mode === id ? C.primary : C.surfaceAlt, color: mode === id ? "#fff" : C.text }}>{label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {["live", "recent", "offline", "none"].map((k) => counts[k] > 0 && (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, padding: "5px 11px", borderRadius: 100, background: `${COLORS[k]}1F`, color: COLORS[k] }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: COLORS[k] }} />{counts[k]} {LABEL[k]}
          </span>
        ))}
        <span title={rt ? "Updates arrive instantly" : "Real-time connection is off: refreshing every 10 seconds"} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 100, background: rt ? "#22C55E1F" : "#F59E0B1F", color: rt ? "#22C55E" : "#F59E0B" }}><span style={{ width: 8, height: 8, borderRadius: 4, background: rt ? "#22C55E" : "#F59E0B" }} />{rt ? "Real-time" : "Every 10 s"}</span>
        <div style={{ flex: 1 }} />
        {engine === "google" && <button className="btn btn-ghost" onClick={() => setTraffic((t) => !t)} style={traffic ? { borderColor: C.primary, color: C.primary } : null}>Traffic</button>}
        <button className="btn btn-ghost" onClick={fitAll}>Show all</button>
        <button className="btn btn-ghost" onClick={load}><Icon name="refresh" size={13} /> Refresh</button>
      </div>

      {error && <div className="card" style={{ padding: 14, marginBottom: 12, borderColor: C.red }}><div style={{ color: C.red, fontSize: 12.5, fontWeight: 600 }}>{error}</div></div>}
      {mapErr && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Map could not be shown</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>{mapErr} The vehicle list below still works.</div>
        </div>
      )}

      <div className="fleet-wrap" style={mapErr ? { gridTemplateColumns: "1fr", height: "auto" } : null}>
        <div className="card fleet-list">
          {loading ? <div style={{ padding: 30, textAlign: "center", color: C.textMuted }}>Loading…</div>
            : !vehicles.length ? <div style={{ padding: 30, textAlign: "center", color: C.textMuted, fontSize: 13 }}>{mode === "bus" ? "No vehicles yet. Add vehicles in the Vehicles tab." : "No staff are being tracked yet. Switch tracking on for a staff member in User Management, or add drivers/conductors."}</div>
            : vehicles.map((v) => (
              <div key={v.vehicle_id} className="fleet-row" onClick={() => v.lat != null ? setSel(v.vehicle_id) : null} style={sel === v.vehicle_id ? { background: C.surfaceAlt } : null}>
                <span style={{ width: 11, height: 11, borderRadius: 6, background: COLORS[v.status], flexShrink: 0, boxShadow: v.status === "live" ? `0 0 0 4px ${COLORS.live}33` : "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{v.registration_no}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.kind === "staff" ? ([v.route_name, v.bus_reg && `on ${v.bus_reg}`].filter(Boolean).join(" · ") || "Staff") : ([v.driver_name, v.route_name].filter(Boolean).join(" · ") || "No driver / route assigned")}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS[v.status] }}>{v.status === "live" ? (v.speed_kmh != null && Number(v.speed_kmh) >= 3 ? `${Math.round(v.speed_kmh)} km/h` : "Live") : v.status === "none" ? "No data" : `${ago(v.age)} ago`}</div>
                  {v.battery_pct != null && <div style={{ fontSize: 11, color: C.textMuted }}>🔋 {v.battery_pct}%</div>}
                </div>
              </div>
            ))}
        </div>
        {!mapErr && <div className="fleet-map"><div ref={mapDiv} style={{ position: "absolute", inset: 0 }} />{!engine && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>Loading map…</div>}</div>}
      </div>
    </div>
  );
};
