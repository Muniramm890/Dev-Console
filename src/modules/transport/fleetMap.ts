// @ts-nocheck
// Map engines for the live fleet view. One small interface, two implementations:
//   • OpenStreetMap + Leaflet  – default, FREE, no API key / billing
//   • Google Maps              – used automatically if GOOGLE_MAPS_API_KEY is set on the server
// Interface: { engine, supportsTraffic, setVehicles(list), focus(id, html), fitAll(), setTraffic(on), destroy() }
// list item: { id, lat, lng, status, color, label, title }
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pinSvg = (color, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52"><path d="M22 51C22 51 41 33 41 20C41 9.5 32.5 1 22 1S3 9.5 3 20C3 33 22 51 22 51Z" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="22" cy="20" r="11.5" fill="#fff"/><text x="22" y="24" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="${label.length > 3 ? 10 : 11.5}" fill="${color}">${esc(label)}</text></svg>`;

// ─────────────── OpenStreetMap / Leaflet ───────────────
async function createLeaflet(container, cfg, h) {
  const L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");
  const map = L.map(container, { zoomControl: true, attributionControl: true }).setView([22.5, 78.9], 5);
  L.tileLayer(cfg.tile_url || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: cfg.tile_attribution || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(map);
  const ro = new ResizeObserver(() => map.invalidateSize()); ro.observe(container);
  const popup = L.popup({ offset: [0, -42], maxWidth: 280 });
  const markers = {}; let fitted = false; let openId = null;
  popup.on("remove", () => { openId = null; });
  const glide = (mk, to) => { // move smoothly to the new position instead of jumping
    const from = mk.getLatLng(); cancelAnimationFrame(mk._raf);
    if (map.distance(from, to) > 3000 || map.distance(from, to) < 1) { mk.setLatLng(to); return; }
    const t0 = performance.now(), D = 900;
    const step = (t) => { const k = Math.min(1, (t - t0) / D); mk.setLatLng([from.lat + (to[0] - from.lat) * k, from.lng + (to[1] - from.lng) * k]); if (k < 1) mk._raf = requestAnimationFrame(step); };
    mk._raf = requestAnimationFrame(step);
  };
  const icon = (color, label) => L.divIcon({ className: "", html: pinSvg(color, label), iconSize: [40, 47], iconAnchor: [20, 47] });
  const bounds = (list) => L.latLngBounds(list.filter((v) => v.lat != null).map((v) => [v.lat, v.lng]));
  let last = [];
  return {
    engine: "osm", supportsTraffic: false,
    setVehicles(list) {
      last = list; const seen = new Set();
      list.forEach((v) => {
        if (v.lat == null) return; seen.add(v.id);
        let mk = markers[v.id];
        if (!mk) { mk = L.marker([v.lat, v.lng], { icon: icon(v.color, v.label), title: v.title }).addTo(map); mk.on("click", () => h.onSelect(v.id)); markers[v.id] = mk; }
        glide(mk, [v.lat, v.lng]); mk.setIcon(icon(v.color, v.label)); mk.setZIndexOffset(v.status === "live" ? 300 : v.status === "recent" ? 200 : 100);
      });
      Object.keys(markers).forEach((id) => { if (!seen.has(id)) { map.removeLayer(markers[id]); delete markers[id]; } });
      if (!fitted && seen.size) { fitted = true; const b = bounds(list); if (b.isValid()) map.fitBounds(b, { padding: [50, 50], maxZoom: 16 }); }
    },
    focus(id, html, recenter = true) { // recenter=false: live update of an already open popup only
      const mk = markers[id]; if (!mk) return;
      if (!recenter) { if (openId === id) popup.setLatLng(mk.getLatLng()).setContent(html); return; }
      map.setView(mk.getLatLng(), Math.max(map.getZoom(), 16), { animate: true });
      popup.setLatLng(mk.getLatLng()).setContent(html).openOn(map); openId = id;
    },
    fitAll() { const b = bounds(last); if (b.isValid()) map.fitBounds(b, { padding: [50, 50], maxZoom: 16 }); map.closePopup(); },
    setTraffic() {},
    destroy() { try { ro.disconnect(); map.remove(); } catch { /* noop */ } },
  };
}

// ─────────────── Google Maps (optional) ───────────────
let gmapsPromise = null;
const loadGoogle = (key, onAuthFail) => {
  window.gm_authFailure = () => onAuthFail?.("Google Maps rejected the API key.");
  if (!gmapsPromise) {
    gmapsPromise = new Promise((resolve, reject) => {
      if (window.google?.maps) return resolve(window.google.maps);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`; s.async = true;
      s.onload = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error("Google Maps failed to load.")));
      s.onerror = () => reject(new Error("Could not load Google Maps."));
      document.head.appendChild(s);
    }).catch((e) => { gmapsPromise = null; throw e; });
  }
  return gmapsPromise;
};

async function createGoogle(container, cfg, h) {
  const maps = await loadGoogle(cfg.google_maps_key, h.onFail);
  const map = new maps.Map(container, { center: { lat: 22.5, lng: 78.9 }, zoom: 5, mapTypeControl: true, streetViewControl: false, fullscreenControl: true, gestureHandling: "greedy", clickableIcons: false });
  const info = new maps.InfoWindow(); const markers = {}; let fitted = false, traffic = null, last = [], openId = null;
  info.addListener("closeclick", () => { openId = null; });
  const glide = (mk, to) => {
    const from = mk.getPosition(); if (!from) { mk.setPosition(to); return; } cancelAnimationFrame(mk._raf);
    const t0 = performance.now(), D = 900, dl = to.lat - from.lat(), dg = to.lng - from.lng();
    if (Math.abs(dl) > 0.03 || Math.abs(dg) > 0.03) { mk.setPosition(to); return; }
    const step = (t) => { const k = Math.min(1, (t - t0) / D); mk.setPosition({ lat: from.lat() + dl * k, lng: from.lng() + dg * k }); if (k < 1) mk._raf = requestAnimationFrame(step); };
    mk._raf = requestAnimationFrame(step);
  };
  const icon = (color, label) => ({ url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg(color, label)), scaledSize: new maps.Size(40, 47), anchor: new maps.Point(20, 47) });
  const fit = (list) => { const b = new maps.LatLngBounds(); let n = 0; list.forEach((v) => { if (v.lat != null) { b.extend({ lat: v.lat, lng: v.lng }); n++; } }); if (n) { map.fitBounds(b, 60); if (n === 1) map.setZoom(15); } };
  return {
    engine: "google", supportsTraffic: true,
    setVehicles(list) {
      last = list; const seen = new Set();
      list.forEach((v) => {
        if (v.lat == null) return; seen.add(v.id); const pos = { lat: v.lat, lng: v.lng };
        let mk = markers[v.id];
        if (!mk) { mk = new maps.Marker({ map, position: pos, title: v.title }); mk.addListener("click", () => h.onSelect(v.id)); markers[v.id] = mk; }
        glide(mk, pos); mk.setIcon(icon(v.color, v.label)); mk.setZIndex(v.status === "live" ? 3 : v.status === "recent" ? 2 : 1);
      });
      Object.keys(markers).forEach((id) => { if (!seen.has(id)) { markers[id].setMap(null); delete markers[id]; } });
      if (!fitted && seen.size) { fitted = true; fit(list); }
    },
    focus(id, html, recenter = true) {
      const mk = markers[id]; if (!mk) return;
      if (!recenter) { if (openId === id) info.setContent(html); return; }
      map.panTo(mk.getPosition()); if ((map.getZoom() || 0) < 15) map.setZoom(16); info.setContent(html); info.open({ map, anchor: mk }); openId = id;
    },
    fitAll() { fit(last); info.close(); },
    setTraffic(on) { if (!traffic) traffic = new maps.TrafficLayer(); traffic.setMap(on ? map : null); },
    destroy() { Object.values(markers).forEach((m) => m.setMap(null)); },
  };
}

/** Google if a key is configured (and not forced off), otherwise free OpenStreetMap. */
export const createFleetMap = (container, cfg, handlers, forceOsm = false) =>
  cfg.google_maps_key && !forceOsm ? createGoogle(container, cfg, handlers) : createLeaflet(container, cfg, handlers);
