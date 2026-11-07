// @ts-nocheck
// Quick Test 2.0 - shared drill-down helpers (Class > Subject > Chapter / Topic): breadcrumb, card grid, grouping.
import { Icon } from "../../components/ui/Icon";
import { C } from "../../theme/theme";

export const natCmp = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

export const groupBy = (items, keyFn, labelFn) => {
  const m = new Map();
  items.forEach((it) => {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, { key: k, label: labelFn(it), items: [] });
    m.get(k).items.push(it);
  });
  return [...m.values()].sort((a, b) => natCmp(a.label, b.label));
};

export const Crumbs = ({ items }) => (
  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 14, fontSize: 13 }}>
    {items.map((c, i) => {
      const last = i === items.length - 1;
      return (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ color: C.textMuted }}>/</span>}
          {last || !c.onClick ? <b>{c.label}</b> : <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={c.onClick}>{c.label}</button>}
        </span>
      );
    })}
  </div>
);

const PALETTE = [C.blue, C.green, C.red, C.yellow, C.purple, C.cyan];
const GRADIENTS = [
  `linear-gradient(135deg, ${C.blue}, #7c3aed)`, `linear-gradient(135deg, ${C.green}, #10b981)`,
  `linear-gradient(135deg, ${C.red}, #f97316)`, `linear-gradient(135deg, ${C.yellow}, #fbbf24)`,
];

// cards: [{ key, label, sub, icon }]  big = gradient class cards (same look as Quick Tests)
export const CardGrid = ({ cards, onPick, big = false }) => (
  <div className="slide-in" style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(150px, 1fr))`, gap: big ? 16 : 14 }}>
    {cards.map((c, i) => big ? (
      <div key={c.key} onClick={() => onPick(c)} style={{ background: GRADIENTS[i % 4], borderRadius: 20, padding: 20, color: "white", cursor: "pointer", minHeight: 110, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ background: "rgba(255,255,255,0.2)", width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={c.icon || "academic"} size={20} color="white" /></div>
        <div>
          <h3 className="syne" style={{ fontSize: 20, fontWeight: 800, margin: "10px 0 2px" }}>{c.label}</h3>
          <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 600 }}>{c.sub}</div>
        </div>
      </div>
    ) : (
      <div key={c.key} className="card" onClick={() => onPick(c)} style={{ cursor: "pointer", padding: 16, borderBottom: `4px solid ${PALETTE[i % PALETTE.length]}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name={c.icon || "book"} size={16} color={PALETTE[i % PALETTE.length]} />
          <b className="syne" style={{ fontSize: 14.5, minWidth: 0, wordBreak: "break-word" }}>{c.label}</b>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{c.sub}</div>
      </div>
    ))}
  </div>
);
