// @ts-nocheck
// What the server needs to know at login: which device, and (if allowed) where. Sent in the login request body.
// Android app: asks for location permission (once) and sends GPS. Web: sends GPS only if the browser already allowed it (no popup).
import { isNative } from "../native";

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

export const getDeviceContext = async () => {
  try {
    if (isNative) {
      const { Device } = await import("@capacitor/device");
      const { App } = await import("@capacitor/app");
      const [info, id, app] = await Promise.all([Device.getInfo(), Device.getId(), App.getInfo().catch(() => ({}))]);
      const name = [info.manufacturer, info.model].filter(Boolean).join(" ").trim() || info.name || "Android phone";
      return { id: id?.identifier || null, name, platform: info.platform || "android", appVersion: app?.version || null };
    }
  } catch { /* fall through */ }
  return { platform: "web" };
};

export const getLoginLocation = async (timeoutMs = 7000) => {
  try {
    if (isNative) {
      const { Geolocation } = await import("@capacitor/geolocation");
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted" && perm.coarseLocation !== "granted") perm = await Geolocation.requestPermissions({ permissions: ["location"] });
      if (perm.location !== "granted" && perm.coarseLocation !== "granted") return null;
      const pos = await withTimeout(Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 120000 }), timeoutMs + 1000);
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    }
    if (navigator.geolocation && navigator.permissions) {
      const p = await navigator.permissions.query({ name: "geolocation" });
      if (p.state !== "granted") return null; // never pop a permission dialog on the web login
      const pos = await withTimeout(new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: timeoutMs, maximumAge: 120000 })), timeoutMs + 1000);
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    }
  } catch { /* denied / timeout: the server falls back to the IP address */ }
  return null;
};

export const collectClientContext = async () => {
  const [device, location] = await Promise.all([getDeviceContext(), getLoginLocation()]);
  return { device, ...(location ? { location } : {}) };
};
