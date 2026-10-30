// @ts-nocheck
// Date input that accepts typing (DD/MM/YYYY, DD-MM-YYYY, 27112026 ...) AND the calendar picker.
// value / onChange use ISO "YYYY-MM-DD" ("" = empty), so it can be saved as-is.
import { useEffect, useRef, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");
export const isoToDisplay = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
export const parseDisplay = (txt) => {
  const t = String(txt || "").trim();
  if (!t) return "";
  const m = /^(\d{1,2})[\/\-. ](\d{1,2})[\/\-. ](\d{2}|\d{4})$/.exec(t) || /^(\d{2})(\d{2})(\d{4})$/.exec(t);
  if (!m) return null;
  const d = +m[1], mo = +m[2]; let y = +m[3];
  if (m[3].length === 2) y += 2000;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
};

export const DateField = ({ value, onChange, disabled, width = 148 }) => {
  const [text, setText] = useState(isoToDisplay(value));
  const [bad, setBad] = useState(false);
  const picker = useRef(null);

  // outside changes (auto-fill, load, copy) always win over what is shown
  useEffect(() => {
    if ((parseDisplay(text) ?? null) !== (value || "")) { setText(isoToDisplay(value)); setBad(false); }
  }, [value]); // eslint-disable-line

  const onType = (e) => {
    let v = e.target.value.replace(/[^\d\/\-. ]/g, "").replace(/[-. ]/g, "/").replace(/\/{2,}/g, "/").slice(0, 10);
    const forward = v.length > text.length;
    if (forward && (/^\d{2}$/.test(v) || /^\d{1,2}[\/\-. ]\d{2}$/.test(v))) v += "/"; // auto slash while typing digits
    setText(v);
    const iso = parseDisplay(v);
    if (iso !== null) { setBad(false); onChange(iso); } else setBad(v.length >= 8);
  };
  const onBlur = () => { if (parseDisplay(text) === null) { setText(isoToDisplay(value)); setBad(false); } };
  const openPicker = () => { const el = picker.current; if (!el || disabled) return; try { el.showPicker ? el.showPicker() : el.click(); } catch { el.click(); } };

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", width }}>
      <input
        className="input" type="text" inputMode="numeric" autoComplete="off" placeholder="DD/MM/YYYY" maxLength={10}
        disabled={disabled} value={text} onChange={onType} onBlur={onBlur}
        style={{ width: "100%", paddingRight: 32, borderColor: bad ? "#dc2626" : undefined }}
      />
      <button type="button" disabled={disabled} onClick={openPicker} aria-label="Pick date"
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", cursor: disabled ? "default" : "pointer", padding: 4, opacity: disabled ? 0.4 : 0.8, color: "inherit", lineHeight: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
      </button>
      <input ref={picker} type="date" tabIndex={-1} aria-hidden="true" value={value || ""} disabled={disabled}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        style={{ position: "absolute", right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
    </div>
  );
};
