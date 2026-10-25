// FILE: teacher-app/src/App.tsx
// Source: admin App.tsx -> MainLayout [25702-25722], App [25725-25737]
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { SplashScreen } from "./components/ui/SplashScreen";
import { DriverTrackerScreen } from "./modules/driver/DriverTrackerScreen";
import { isNative } from "./native";
import { apiRequest } from "./api/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { DialogProvider } from "./contexts/DialogContext";
import { PdfViewerProvider } from "./components/pdf/PdfViewerProvider";
import { SessionProvider } from "./contexts/SessionContext";
import { SchoolERP } from "./layout/SchoolERP";
import { LoginPage } from "./pages/Login";

// Gatekeeper Component: Check karta hai user logged in hai ya nahi
const MainLayout = () => {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(false);
  const hadUserRef = useRef(false);
  // Android app: is this login a bus DRIVER? -> tracker screen instead of the ERP (tracking runs 24x7 in a native service)
  const [driverChecked, setDriverChecked] = useState(!isNative);
  const [isDriver, setIsDriver] = useState(false);
  const [driverTry, setDriverTry] = useState(0);
  useEffect(() => {
    if (!isNative || !user) { setIsDriver(false); setDriverChecked(!isNative); return; }
    let dead = false;
    setDriverChecked(false);
    apiRequest("/driver/me").then((r) => {
      if (dead) return;
      const d = !!(r?.data?.driver_mode ?? r?.data?.is_driver); // plain driver/conductor login on the bus phone -> tracker screen
      setIsDriver(d); setDriverChecked(true);
      if (d) localStorage.setItem("erp_driver_mode", "1"); else localStorage.removeItem("erp_driver_mode");
    }).catch(() => { if (!dead) setTimeout(() => setDriverTry((n) => n + 1), 5000); }); // offline at start: retry
    return () => { dead = true; };
  }, [user?.id, driverTry]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Sirf login ke moment pe (no-user -> user transition) splash dikhao,
    // page refresh ka case AuthProvider ke apne loading state se already handle hai.
    if (user && !hadUserRef.current) {
      setShowSplash(true);
      hadUserRef.current = true;
      const t = setTimeout(() => setShowSplash(false), 2200);
      return () => clearTimeout(t);
    }
    if (!user) hadUserRef.current = false;
  }, [user]);

  if (!user) { if (typeof window !== "undefined" && window.__DEV_CONSOLE__) { window.__DEV_CONSOLE__.exit("Session ended"); return null; } return <LoginPage />; } // Dev-Console: back to the console
  if (showSplash || (isNative && !driverChecked)) return <SplashScreen />;
  if (isNative && isDriver) return <DriverTrackerScreen />;
  return <SchoolERP />;
};

// Naya Main App Export
export default function App() {
  return (
    <ErrorBoundary label="app" fullscreen>
      <DialogProvider>
        <PdfViewerProvider>
          <AuthProvider>
            <DataProvider>
              <SessionProvider>
                <MainLayout />
              </SessionProvider>
            </DataProvider>
          </AuthProvider>
        </PdfViewerProvider>
      </DialogProvider>
    </ErrorBoundary>
  );
}
