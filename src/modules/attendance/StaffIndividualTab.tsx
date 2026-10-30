// FILE: teacher-app/src/modules/attendance/StaffIndividualTab.tsx
// Source: admin App.tsx -> StaffIndividualTab [13975-14203]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { C } from "../../theme/theme";
import { daysAgoISO, todayISO } from "../../utils/date";
import { STAFF_STATUS_KEYS as STATUS_KEYS, STAFF_STATUS_META as STATUS_META } from "../../utils/status";

// ═══════════════════════════════════════════════════════════════
// TEACHERS — TAB 3: INDIVIDUAL TEACHER
// ═══════════════════════════════════════════════════════════════
export const StaffIndividualTab = () => {
  const [teachersList, setTeachersList] = useState([]);
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());
  const [history, setHistory] = useState({
    records: [],
    counts: {},
    percentage: 0,
    totalMarked: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("/teachers");
        setTeachersList(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        setTeachersList([]);
      }
    })();
  }, []);

  const loadHistory = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await apiRequest(
        `/attendance/staff/${userId}/history?from=${from}&to=${to}`
      );
      setHistory(
        res?.data || { records: [], counts: {}, percentage: 0, totalMarked: 0 }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadHistory();
  }, [userId, from, to]); // eslint-disable-line

  const recordMap = {};
  history.records.forEach((r) => {
    recordMap[r.attendance_date?.split("T")[0]] = r.status;
  });

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ width: 220 }}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">-- Select Teacher --</option>
            {teachersList.map((t) => (
              <option key={t.user_id} value={t.user_id}>
                {t.full_name}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            style={{ width: 150 }}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span style={{ alignSelf: "center", color: C.textMuted }}>to</span>
          <input
            className="input"
            type="date"
            style={{ width: 150 }}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            max={todayISO()}
          />
        </div>
      </div>

      {!userId ? (
        <div
          className="card"
          style={{ padding: 40, textAlign: "center", color: C.textMuted }}
        >
          Select a teacher to view their attendance record.
        </div>
      ) : loading ? (
        <div
          className="card pulse"
          style={{ padding: 40, textAlign: "center", color: C.primary }}
        >
          Loading history…
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
                justifyContent: "space-around",
              }}
            >
              {STATUS_KEYS.map((s) => (
                <div key={s} style={{ textAlign: "center" }}>
                  <div
                    className="syne"
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: STATUS_META[s].color,
                    }}
                  >
                    {history.counts[s] || 0}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {STATUS_META[s].label}
                  </div>
                </div>
              ))}
              <div style={{ textAlign: "center" }}>
                <div
                  className="syne"
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: history.percentage >= 85 ? C.primary : C.red,
                  }}
                >
                  {history.percentage}%
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>Overall</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3
              className="syne"
              style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}
            >
              Day-by-Day Calendar
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7,1fr)",
                gap: 6,
                maxWidth: 460,
              }}
            >
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div
                  key={i}
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: C.textMuted,
                    fontWeight: 600,
                    padding: "4px 0",
                  }}
                >
                  {d}
                </div>
              ))}
              {(() => {
                const start = new Date(from);
                const days = [];
                const startPad = start.getDay();
                for (let i = 0; i < startPad; i++) days.push(null);
                const cur = new Date(from);
                const end = new Date(to);
                while (cur <= end) {
                  days.push(cur.toISOString().split("T")[0]);
                  cur.setDate(cur.getDate() + 1);
                }
                return days.map((d, i) => {
                  const status = d ? recordMap[d] : null;
                  const meta = status ? STATUS_META[status] : null;
                  return (
                    <div
                      key={i}
                      title={d || ""}
                      style={{
                        aspectRatio: "1",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 600,
                        background: !d
                          ? "transparent"
                          : meta
                          ? `${meta.color}33`
                          : C.surfaceAlt,
                        color: !d
                          ? "transparent"
                          : meta
                          ? meta.color
                          : C.textMuted,
                        border: `1px solid ${
                          !d
                            ? "transparent"
                            : meta
                            ? meta.color + "55"
                            : C.border
                        }`,
                      }}
                    >
                      {d ? new Date(d).getDate() : ""}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
