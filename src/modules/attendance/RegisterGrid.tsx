// @ts-nocheck
// Monthly attendance register (shared by Students and Teachers). Theme tokens only.
// Data shape: { month, days:[{d,dow,marked}], rows:[{id,name,roll_no,sub,cells:[status|null],P,A,L,OD,marked,percentage}], working_days }
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { C, LIGHT_SURFACE } from "../../theme/theme";
import { STATUS_KEYS as STUDENT_KEYS, STATUS_META as STUDENT_META, STAFF_STATUS_KEYS, STAFF_STATUS_META } from "../../utils/status";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const shiftMonth = (m, n) => {
  const d = new Date(`${m}-01T00:00:00`); d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const MonthPicker = ({ month, setMonth, maxMonth }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <button className="btn btn-ghost" style={{ padding: "7px 9px" }} onClick={() => setMonth(shiftMonth(month, -1))} title="Previous month">
      <Icon name="arrow_right" size={14} style={{ transform: "rotate(180deg)" }} />
    </button>
    <input type="month" className="input" value={month} max={maxMonth}
      onChange={(e) => e.target.value && setMonth(e.target.value > maxMonth ? maxMonth : e.target.value)} style={{ width: 160 }} />
    <button className="btn btn-ghost" style={{ padding: "7px 9px" }} disabled={month >= maxMonth} onClick={() => setMonth(shiftMonth(month, 1))} title="Next month">
      <Icon name="arrow_right" size={14} />
    </button>
  </div>
);

const stick = (left, extra) => ({ position: "sticky", left, zIndex: 2, background: C.surface, ...extra });
const mkTh = (line) => ({ padding: "6px 2px", fontSize: 10.5, fontWeight: 700, color: C.textMuted, textAlign: "center", borderBottom: `1px solid ${line}`, background: C.surfaceAlt });

export const RegisterGrid = ({ data, loading, who = "Student", filters, month, setMonth, maxMonth, onPdf, pdfBusy }) => {
  // Theme-aware status ink: bright status colours are unreadable as text on white, so use the darker *Text tokens on light theme.
  const isLight = C.bg === LIGHT_SURFACE.bg;
  const INK = { P: C.greenText, A: C.redText, L: C.yellowText, PL: C.purpleText, OD: C.blueText, HD: isLight ? "#C2410C" : "#F97316" };
  const line = isLight ? "#D6CEC2" : C.border; // slightly stronger grid lines on light theme
  const ink = (k) => INK[k] || META[k].color;
  const th = mkTh(line);
  const KEYS = who === "Teacher" ? STAFF_STATUS_KEYS : STUDENT_KEYS;
  const META = who === "Teacher" ? STAFF_STATUS_META : STUDENT_META;
  const rows = data?.rows || []; const days = data?.days || [];
  const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
  const marked = sum("marked");
  const avg = marked ? Math.round(((who === "Teacher" ? sum("P") + sum("OD") + 0.5 * sum("HD") : sum("P")) / marked) * 100) : 0;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>{filters}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <MonthPicker month={month} setMonth={setMonth} maxMonth={maxMonth} />
          {onPdf && (
            <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5 }} disabled={pdfBusy || !rows.length} onClick={onPdf} title="Generate the register as a PDF">
              <Icon name="download" size={14} /> {pdfBusy ? "Preparing…" : "PDF"}
            </button>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="card pulse" style={{ padding: 30, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading register…</div>
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState icon="attendance" title={`No ${who.toLowerCase()}s found`} sub="Pick another class or month." /></div>
      ) : (
        <div className="card" style={{ padding: 0, opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "14px 16px" }}>
            <div>
              <div className="syne" style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Monthly Register · {monthLabel(data.month)}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>
                {rows.length} {who.toLowerCase()}{rows.length > 1 ? "s" : ""} · {data.working_days} working day{data.working_days === 1 ? "" : "s"} · average {avg}%
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {KEYS.map((k) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: `${META[k].color}${isLight ? "2e" : "26"}`, color: ink(k), fontSize: 10, fontWeight: 800 }}>{k}</span>
                  {META[k].label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%" }}>
              <thead>
                <tr>
                  <th style={{ ...th, ...stick(0, { width: 34, minWidth: 34, background: C.surfaceAlt, zIndex: 3 }) }}>#</th>
                  <th style={{ ...th, ...stick(34, { minWidth: 150, textAlign: "left", paddingLeft: 8, background: C.surfaceAlt, zIndex: 3 }) }}>{who}</th>
                  {days.map((d) => (
                    <th key={d.d} style={{ ...th, minWidth: 26, width: 26, background: !d.marked ? `${C.border}66` : C.surfaceAlt }}>
                      <div style={{ color: C.text }}>{d.d}</div>
                      <div style={{ fontWeight: 600, opacity: 0.7 }}>{DOW[d.dow]}</div>
                    </th>
                  ))}
                  {KEYS.map((k) => <th key={k} style={{ ...th, minWidth: 30, color: ink(k) }}>{k}</th>)}
                  <th style={{ ...th, minWidth: 44 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ ...stick(0, { width: 34, textAlign: "center", fontSize: 11, color: C.textMuted, borderBottom: `1px solid ${line}` }) }}>{r.roll_no || i + 1}</td>
                    <td style={{ ...stick(34, { padding: "5px 8px", borderBottom: `1px solid ${line}`, minWidth: 150, maxWidth: 190 }) }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar teacher={{ full_name: r.name, avatar_url: r.photo_url, gender: r.gender }} size={24} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                          {r.sub && <div style={{ fontSize: 10.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sub}</div>}
                        </div>
                      </div>
                    </td>
                    {r.cells.map((st, di) => {
                      const meta = st ? META[st] : null;
                      return (
                        <td key={di} title={st ? `${r.name} · ${days[di].d} ${monthLabel(data.month).split(" ")[0]} · ${meta.label}` : undefined}
                          style={{ textAlign: "center", padding: 0, borderBottom: `1px solid ${line}`, background: !days[di].marked ? `${C.border}40` : "transparent" }}>
                          {meta ? (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, fontSize: 10.5, fontWeight: 800, background: `${meta.color}${isLight ? (st === "P" ? "26" : "3d") : (st === "P" ? "1f" : "33")}`, color: ink(st) }}>{st}</span>
                          ) : (
                            <span style={{ color: C.textMuted, opacity: isLight ? 0.8 : 0.5, fontSize: 11 }}>{days[di].marked ? "·" : ""}</span>
                          )}
                        </td>
                      );
                    })}
                    {KEYS.map((k) => (
                      <td key={k} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: r[k] ? ink(k) : C.textMuted, borderBottom: `1px solid ${line}` }}>{r[k]}</td>
                    ))}
                    <td style={{ textAlign: "center", fontSize: 12, fontWeight: 800, borderBottom: `1px solid ${line}`, color: !r.marked ? C.textMuted : r.percentage >= 75 ? ink("P") : ink("A") }}>{r.marked ? `${r.percentage}%` : "–"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {KEYS.map((k, ki) => (
                  <tr key={k}>
                    <td style={{ ...stick(0, { background: C.surfaceAlt, borderTop: ki === 0 ? `2px solid ${C.border}` : undefined }) }} />
                    <td style={{ ...stick(34, { padding: "6px 8px", fontSize: 11.5, fontWeight: 700, color: ink(k), background: C.surfaceAlt, whiteSpace: "nowrap", borderTop: ki === 0 ? `2px solid ${C.border}` : undefined }) }}>{META[k].label} per day</td>
                    {days.map((d, di) => {
                      const n = d.marked ? rows.filter((r) => r.cells[di] === k).length : 0;
                      return (
                        <td key={d.d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: n ? ink(k) : C.textMuted, background: C.surfaceAlt, borderTop: ki === 0 ? `2px solid ${C.border}` : undefined }}>
                          {d.marked ? (n || "·") : ""}
                        </td>
                      );
                    })}
                    {KEYS.map((kk) => (
                      <td key={kk} style={{ textAlign: "center", fontSize: 11.5, fontWeight: 800, color: ink(kk), background: C.surfaceAlt, borderTop: ki === 0 ? `2px solid ${C.border}` : undefined }}>{kk === k ? sum(k) : ""}</td>
                    ))}
                    <td style={{ textAlign: "center", fontSize: 11.5, fontWeight: 800, color: C.text, background: C.surfaceAlt, borderTop: ki === 0 ? `2px solid ${C.border}` : undefined }}>{k === "P" ? `${avg}%` : ""}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
