// @ts-nocheck
// Capacitor (Android/iOS) glue. Web par kuch nahi karta: sab kuch Capacitor.isNativePlatform() se guarded hai.
import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();

// status bar ke icons theme ke hisaab se (dark theme -> light icons)
export const setNativeTheme = async (mode) => {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: mode === "dark" ? Style.Dark : Style.Light });
  } catch (_) { /* plugin unavailable */ }
};

export const initNative = async () => {
  if (!isNative) return;
  document.documentElement.classList.add("is-native", `is-${Capacitor.getPlatform()}`);

  let theme = "dark";
  try { theme = localStorage.getItem("erp_theme") || "dark"; } catch (_) {}
  setNativeTheme(theme);

  try {
    const { App } = await import("@capacitor/app");

    // Android hardware/gesture back:  1) open modal / drawer band  2) router history me peeche  3) app minimize
    App.addListener("backButton", () => {
      const overlays = document.querySelectorAll(".modal-overlay, [data-native-back]");
      if (overlays.length) { overlays[overlays.length - 1].click(); return; }
      const idx = window.history.state && typeof window.history.state.idx === "number" ? window.history.state.idx : 0;
      if (idx > 0) window.history.back();
      else App.minimizeApp();
    });
  } catch (_) { /* ignore */ }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch (_) { /* ignore */ }
};

// ── Push notifications (FCM) ──
let pushToken = null;

// login ke baad: permission -> token -> backend ko batao. Tap par 'open-chat' event (SchoolERP use sunta hai).
export const registerPush = async (api) => {
  if (!isNative) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    await PushNotifications.createChannel({ id: "chat", name: "Messages", description: "Announcements and chat replies", importance: 4, visibility: 1, vibration: true }).catch(() => {});
    await PushNotifications.removeAllListeners(); // dobara login par duplicate listeners na bane
    PushNotifications.addListener("registration", async (t) => {
      pushToken = t.value;
      try { await api("/device-tokens", "POST", { fcm_token: t.value, platform: "android" }); } catch (e) { console.warn("push register failed", e?.message); }
    });
    PushNotifications.addListener("registrationError", (e) => console.warn("push registration error", e));
    PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      const d = a?.notification?.data || {};
      if (d.type === "chat") window.dispatchEvent(new CustomEvent("open-chat", { detail: d }));
    });
    await PushNotifications.register();
  } catch (e) { console.warn("push setup failed", e?.message); }
};

// logout: is phone par is user ko push band (api call PEHLE hona chahiye, token clear hone se pehle)
export const unregisterPush = (api) => {
  if (!isNative || !pushToken) return Promise.resolve();
  const t = pushToken;
  pushToken = null;
  return api("/device-tokens", "DELETE", { fcm_token: t }).catch(() => {});
};
