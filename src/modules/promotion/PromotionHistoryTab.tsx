// FILE: teacher-app/src/modules/promotion/PromotionHistoryTab.tsx
// Source: admin App.tsx -> PromotionHistoryTab [9191-9228]
// @ts-nocheck
import { C } from "../../theme/theme";

export const PromotionHistoryTab = ({ history, loading }) => {
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Loading history…</div>;
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>From Session</th>
              <th>To Session</th>
              <th>Promoted</th>
              <th>Retained</th>
              <th>TC</th>
              <th>Graduated</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.created_at).toLocaleDateString()}</td>
                <td>{h.from_year_name}</td>
                <td>{h.to_year_name}</td>
                <td>{h.total_promoted}</td>
                <td>{h.total_retained}</td>
                <td>{h.total_tc}</td>
                <td>{h.total_graduated}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color: C.textMuted }}>No promotion runs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
