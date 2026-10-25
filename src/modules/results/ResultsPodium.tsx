// @ts-nocheck
// Shared by Results > Overview and Results > Toppers: round profile photo + top-3 podium.
import { C } from "../../theme/theme";

const MEDAL = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
const RING = [C.yellow, "#9CA3AF", "#CD7F32"];

export const Avatar = ({ url, name, size = 44, ring }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: `${C.primary}22`,
    border: ring ? `3px solid ${ring}` : `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center",
    color: C.primary, fontWeight: 800, fontSize: size * 0.4 }}>
    {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /> : (name || "?").trim()[0]?.toUpperCase()}
  </div>
);

// items: [{ id, name, photo_url, sub, percentage, grade }]  (already sorted, best first)
export const Podium = ({ items }) => {
  const top = (items || []).slice(0, 3);
  if (!top.length) return null;
  const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i); // 2nd - 1st - 3rd
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, flexWrap: "wrap", padding: "8px 0 4px" }}>
      {order.map((i) => {
        const s = top[i], first = i === 0;
        return (
          <div key={s.id || i} style={{ flex: "1 1 108px", maxWidth: 190, textAlign: "center", background: C.surface, borderRadius: 18,
            border: `2px solid ${RING[i]}`, padding: first ? "20px 12px 16px" : "14px 10px 12px", marginBottom: first ? 14 : 0,
            boxShadow: first ? `0 8px 24px ${RING[0]}33` : "none" }}>
            <div style={{ fontSize: first ? 30 : 24 }}>{MEDAL[i]}</div>
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}><Avatar url={s.photo_url} name={s.name} size={first ? 72 : 56} ring={RING[i]} /></div>
            <div className="syne" style={{ fontWeight: 700, fontSize: first ? 14 : 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.name}>{s.name}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.sub}</div>
            <div className="syne" style={{ fontSize: first ? 24 : 20, fontWeight: 800, color: RING[i], marginTop: 6 }}>{s.percentage}%</div>
            {s.grade && <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700 }}>Grade {s.grade}</div>}
          </div>
        );
      })}
    </div>
  );
};
