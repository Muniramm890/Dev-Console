// FILE: teacher-app/src/contexts/AuthContext.tsx
// Source: admin App.tsx -> AuthContext, AuthProvider, useAuth
// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from "react";
import { apiRequest, setAuthLogoutRef } from "../api/client";
import { unregisterPush } from "../native";
import { useDialog } from "./DialogContext";
import { SplashScreen } from "../components/ui/SplashScreen";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { dialogAlert, dialogConfirm } = useDialog() || {};
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authCheckFailed, setAuthCheckFailed] = useState(false);
  const [forceLoggedOut, setForceLoggedOut] = useState(false);

  useEffect(() => {
    if (!authCheckFailed || !dialogConfirm) return;
    dialogConfirm(
      "We couldn't reach the server. Please check your internet connection and try again.",
      "Connection Problem"
    ).then((retry) => {
      if (retry) {
        window.location.reload();
      } else {
        // Cancel = force logout to login page, no more splash/retry loop
        localStorage.removeItem("erp_token");
        setUser(null);
        setForceLoggedOut(true);
      }
    });
  }, [authCheckFailed]); // eslint-disable-line

  const logout = React.useCallback(async () => {
    unregisterPush(apiRequest); // fire-and-forget; sync part reads the token before it is cleared
    try {
      await apiRequest("/auth/logout", "POST");
    } catch (e) {
      // Backend call fail ho (network issue, token already expired, etc.)
      // to bhi user ko frontend se logout hona hi chahiye
      console.error("Logout API call failed:", e.message);
    }
    localStorage.removeItem("erp_token");
    try { localStorage.removeItem("erp_academic_year_id"); } catch {}
    setUser(null);
  }, []);

  // 🔴 apiRequest ko is logout ka reference de do (reload ki jagah)
  useEffect(() => { setAuthLogoutRef(logout); }, [logout]); // [teacher-app] was: authLogoutRef = logout

  // 🔴 INACTIVITY AUTO-LOGOUT — 15 min inactive → logout, 1 min pehle warning
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem("erp_driver_mode") === "1") return; // bus-driver phone stays logged in (24x7 tracking screen)

    const TIMEOUT_MS = 15 * 60 * 1000;   // 👈 yahan change karo (5*60*1000 ya 30*60*1000)
    const WARNING_MS = 60 * 1000;        // logout se 1 min pehle warning dikhao

    let idleTimer, warnTimer;

    const resetTimers = () => {
      clearTimeout(idleTimer);
      clearTimeout(warnTimer);
      warnTimer = setTimeout(async () => {
        if (!dialogConfirm) return;
        const stay = await dialogConfirm(
          "You've been inactive for a while. You will be logged out in 1 minute due to inactivity.",
          "Session Timeout Warning"
        );
        if (stay) resetTimers();
      }, TIMEOUT_MS - WARNING_MS);
      idleTimer = setTimeout(() => logout(), TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, resetTimers));
    resetTimers();

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(warnTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimers));
    };
  }, [user, logout]);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("erp_token");
      if (!token || token === "undefined" || token === "null") {
        setLoading(false);
        return;
      }

      // 🔴 WATCHDOG: agar 5 second mein server response nahi aata (hung request,
      // slow network, dead API), to token clean karke login screen pe bhej do —
      // splash kabhi hamesha ke liye atkega nahi.
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Auth check timed out")), 5000)
      );

      try {
        // 🔴 Server se actually verify karo ki token valid hai — race against 5s timeout
        const res = await Promise.race([apiRequest("/auth/me"), timeout]);
        const d = res?.data || res;
        setUser({ id: d.id, role: d.role, name: d.full_name || "User", schoolId: d.school_id, avatarUrl: d.avatar_url || "",
          // [teacher-app] module permissions (User Management se assign) — sidebar/route guard me use hote hain
          permissions: Array.isArray(d.permissions?.modules) ? d.permissions.modules : [] });
      } catch (e) {
        if (e.message === "Auth check timed out") {
          // Server slow/unreachable — token abhi bhi VALID ho sakta hai, isko delete mat karo
          setAuthCheckFailed(true);
        } else {
          // Server ne clearly bola invalid/expired (401) — tabhi token delete karo
          localStorage.removeItem("erp_token");
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      // API call
      const response = await apiRequest("/auth/login", "POST", {
        email,
        password,
      });
  
      // 🔥 THE FIX: Agar backend { success: true, data: {...} } bhejta hai, toh use parse karein
      // Warna direct response use karein.
      const payload = response.data ? response.data : response;
  
      if (!payload.token) {
        console.error("No token received:", response);
        throw new Error("Invalid response from server. Token missing.");
      }
  
      // ✅ Perfectly save the token
      localStorage.setItem("erp_token", payload.token);
  
            // ✅ Set User State gracefully (Handles both nested 'user' obj and flat response)
            setUser({
              id: payload.userId || payload.user?.id,
              role: payload.role || payload.user?.role,
              name: payload.name || payload.user?.fullName || "User",
              schoolId: payload.schoolId || payload.user?.school?.id,
              avatarUrl: payload.avatarUrl || payload.user?.avatar_url || "",
              // [teacher-app] module permissions
              permissions: Array.isArray(payload.user?.permissions?.modules) ? payload.user.permissions.modules : [],
            });
    } catch (error) {
      throw { response: { data: { error: error.message || "Login failed" } } };
    }
  };
  if (loading) return <SplashScreen />;
  if (authCheckFailed && !forceLoggedOut) return <SplashScreen />; 
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
