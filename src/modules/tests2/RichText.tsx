// @ts-nocheck
// Question text is plain text with ![](image-url) pictures (the server swaps asset://ID for a short-lived URL). Rendered without any HTML injection.
import { C } from "../../theme/theme";

const IMG = /!\[[^\]]*\]\((https?:[^)\s]+)\)/g;

export const RichText = ({ text, style }) => {
  const parts = []; let last = 0; let m;
  const src = String(text == null ? "" : text);
  IMG.lastIndex = 0;
  while ((m = IMG.exec(src))) {
    if (m.index > last) parts.push({ t: src.slice(last, m.index) });
    parts.push({ img: m[1] });
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push({ t: src.slice(last) });
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", ...style }}>
      {parts.map((p, i) => (p.img
        ? <img key={i} src={p.img} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: 260, borderRadius: 8, margin: "6px 0", border: `1px solid ${C.border}` }} />
        : <span key={i}>{p.t}</span>))}
    </div>
  );
};
