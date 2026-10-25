// FILE: teacher-app/src/modules/transport/TransportModule.tsx
// Source: admin App.tsx -> TransportModule [10024-10064]
// @ts-nocheck
import { useState } from "react";
import { TransportAllocationsTab } from "./TransportAllocationsTab";
import { TransportLiveTab } from "./TransportLiveTab";
import { TransportRoutesTab } from "./TransportRoutesTab";
import { TransportSettingsTab } from "./TransportSettingsTab";
import { TransportStaffTab } from "./TransportStaffTab";
import { TransportTripsTab } from "./TransportTripsTab";
import { TransportVehiclesTab } from "./TransportVehiclesTab";
import { C } from "../../theme/theme";

// ── MAIN MODULE ───────────────────────────────────────────────────────
export const TransportModule = ({ school }) => {
  const [tab, setTab] = useState("vehicles");
  const TABS = [
    { id: "vehicles", label: "Vehicles" },
    { id: "staff", label: "Drivers & Conductors" },
    { id: "routes", label: "Routes & Stops" },
    { id: "trips", label: "Trip Assignment" },
    { id: "allocations", label: "Student Allocation" },
    { id: "live", label: "Live Tracking" },
    { id: "settings", label: "GPS Settings" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="syne" style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Transport Management</h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Vehicles, routes, staff, live GPS tracking and student allocation.</p>
        </div>
        <div style={{ display: "flex", gap: 6, background: C.surfaceAlt, padding: 4, borderRadius: 12, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.id} className="btn" onClick={() => setTab(t.id)}
              style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderRadius: 9, background: tab === t.id ? C.surface : "transparent", color: tab === t.id ? C.primary : C.textMuted, boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="slide-in">
        {tab === "vehicles" && <TransportVehiclesTab />}
        {tab === "staff" && <TransportStaffTab />}
        {tab === "routes" && <TransportRoutesTab />}
        {tab === "trips" && <TransportTripsTab />}
        {tab === "allocations" && <TransportAllocationsTab />}
        {tab === "live" && <TransportLiveTab />}
        {tab === "settings" && <TransportSettingsTab />}
      </div>
    </div>
  );
};
