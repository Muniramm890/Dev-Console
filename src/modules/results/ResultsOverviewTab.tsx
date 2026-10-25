// @ts-nocheck
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../api/client";
import { KpiCard } from "../../components/ui/KpiCard";
import { C } from "../../theme/theme";
import { Podium } from "./ResultsPodium";

const BAND_COLORS = [C.green, C.cyan, C.blue, C.yellow, C.red];
const tip = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text };

export const ResultsOverviewTab = ({ examGroupId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/results/overview?exam_group_id=${examGroupId}`)
      .then((res) => setData(res?.data || null))
      .catch((e) => { console.error(e); setData(null); })
      .finally(() => setLoading(false));
  }, [examGroupId]);

  if (loading) return <div className="pulse" style={{ textAlign: "center", color: C.primary, padding: 30 }}>Loading...</div>;
  if (!data || !data.total_appeared) return <div className="card" style={{ padding: 30, textAlign: "center", color: C.textMuted }}>No data yet -- compute results first.</div>;

  const counted = (data.bands || []).reduce((n, b) => n + b.count, 0);
  const podium = (data.toppers || []).map((t) => ({ id: t.student_id, name: t.full_name, photo_url: t.photo_url, sub: `${t.grade_name} - ${t.section_name}`, percentage: t.percentage, grade: t.grade }));
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16, marginBottom: 16 };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, marginBottom: 16 }}>
        <KpiCard label="Appeared" value={data.total_appeared} color={C.primary} />
        <KpiCard label="Passed" value={data.total_pass} color={C.green} sub={`${data.pass_percent}% pass rate`} />
        <KpiCard label="Failed" value={data.total_fail} color={C.red || "#e11d48"} />
        <KpiCard label="Incomplete" value={data.total_incomplete} color={C.yellow} sub="Marks pending entry" />
        <KpiCard label="Average %" value={`${data.avg_percentage}%`} color={C.purple} />
        <KpiCard label="Highest %" value={`${data.highest_percentage ?? "-"}%`} color={C.blue} />
      </div>

      {podium.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>School Top {podium.length}</h3>
          <Podium items={podium} />
        </div>
      )}

      <div style={grid}>
        <div className="card">
          <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Student Distribution</h3>
          {(data.bands || []).map((b, i) => (
            <div key={b.key} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: BAND_COLORS[i], fontWeight: 600 }}>{b.label}</span>
                <span className="syne" style={{ fontWeight: 700 }}>{b.count}</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${counted ? (b.count / counted) * 100 : 0}%`, background: BAND_COLORS[i] }} /></div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Score Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.histogram || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="range" tick={{ fill: C.textMuted, fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: C.textMuted, fontSize: 10 }} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="count" name="Students" radius={[5, 5, 0, 0]} fill={C.primary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {(data.trend || []).length > 1 && (
        <div className="card">
          <h3 className="syne" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Academic Trajectory</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="exam_name" tick={{ fill: C.textMuted, fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: C.textMuted, fontSize: 10 }} />
              <Tooltip contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="avg_percentage" name="Average %" stroke={C.primary} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pass_percent" name="Pass %" stroke={C.green} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
