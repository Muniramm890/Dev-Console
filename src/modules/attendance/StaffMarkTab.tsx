// FILE: teacher-app/src/modules/attendance/StaffMarkTab.tsx
// Source: admin App.tsx -> StaffMarkTab [13515-13757]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { StatusPicker } from "./StatusPicker";
import { C } from "../../theme/theme";
import { todayISO } from "../../utils/date";
import { STAFF_STATUS_KEYS as STATUS_KEYS, STAFF_STATUS_META as STATUS_META } from "../../utils/status";

// ═══════════════════════════════════════════════════════════════
// TEACHERS — TAB 1: MARK ATTENDANCE
// ═══════════════════════════════════════════════════════════════
export const StaffMarkTab = () => {
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState([]);
  const [counts, setCounts] = useState({ P: 0, A: 0, L: 0, OD: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/attendance/staff/roster?date=${date}`);
      setRoster(res?.data?.teachers || []);
      setCounts(res?.data?.counts || { P: 0, A: 0, L: 0, OD: 0 });
    } catch (e) {
      console.error(e);
      setRoster([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadRoster();
  }, [date]); // eslint-disable-line

  const setStatus = (userId, status) => {
    setRoster((prev) => {
      const next = prev.map((r) =>
        r.user_id === userId ? { ...r, status } : r
      );
      const c = { P: 0, A: 0, L: 0, OD: 0 };
      next.forEach((r) => {
        c[r.status] = (c[r.status] || 0) + 1;
      });
      setCounts(c);
      return next;
    });
  };

  const markAll = (status) => {
    setRoster((prev) => prev.map((r) => ({ ...r, status })));
    const c = { P: 0, A: 0, L: 0, OD: 0 };
    c[status] = roster.length;
    setCounts(c);
  };

  const handleSave = async () => {
    if (!roster.length) return;
    setSaving(true);
    try {
      await apiRequest("/attendance/staff/mark", "POST", {
        date,
        entries: roster.map((r) => ({
          user_id: r.user_id,
          status: r.status,
          remarks: r.remarks || null,
        })),
      });
      alert("✅ Staff attendance saved successfully!");
    } catch (e) {
      alert("❌ Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const total = roster.length || 1;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: C.textMuted,
                marginBottom: 4,
              }}
            >
              DATE
            </label>
            <input
              className="input"
              type="date"
              style={{ width: 170 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayISO()}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginLeft: "auto",
              flexWrap: "wrap",
            }}
          >
            {STATUS_KEYS.map((s) => (
              <div key={s} style={{ textAlign: "center" }}>
                <div
                  className="syne"
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: STATUS_META[s].color,
                  }}
                >
                  {counts[s] || 0}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>
                  {STATUS_META[s].label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}
      >
        <button className="btn btn-success" onClick={() => markAll("P")}>
          Mark All Present
        </button>
        <button className="btn btn-danger" onClick={() => markAll("A")}>
          Mark All Absent
        </button>
        <button className="btn btn-ghost" onClick={() => markAll("L")}>
          Mark All Leave
        </button>
        <button
          className="btn btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? "Saving…" : "Save Attendance"}
        </button>
      </div>

      {roster.length > 0 && (
        <div
          className="progress-bar"
          style={{ marginBottom: 16, display: "flex" }}
        >
          {STATUS_KEYS.map((s) => (
            <div
              key={s}
              style={{
                width: `${((counts[s] || 0) / total) * 100}%`,
                background: STATUS_META[s].color,
                height: "100%",
              }}
            />
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div
            style={{ padding: 40, textAlign: "center", color: C.primary }}
            className="pulse"
          >
            Loading staff list…
          </div>
        ) : roster.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
            No teachers found.
          </div>
        ) : (
          <div className="scroll-x">
            <table className="table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Department</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.user_id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background:
                              r.gender === "Female"
                                ? `${C.purple}33`
                                : `${C.blue}33`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            color: r.gender === "Female" ? C.purple : C.blue,
                          }}
                        >
                          {(r.full_name?.[0] || "?").toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {r.full_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: C.textMuted }}>
                      {r.department || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <StatusPicker staff
                        value={r.status}
                        onChange={(s) => setStatus(r.user_id, s)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
