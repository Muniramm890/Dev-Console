// FILE: teacher-app/src/modules/commhub/StudentPicker.tsx
// Source: admin App.tsx -> StudentPicker [10191-10230]
// [teacher-app] cosmetic tweaks only (selected tick, hover row)
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { C } from "../../theme/theme";

// -- Tiny debounced student search-and-pick control --
export const StudentPicker = ({ value, label, onPick }) => {
  const [q, setQ] = useState(label || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2 || q === label) { setResults([]); return; }
    const t = setTimeout(() => {
      apiRequest(`/students?search=${encodeURIComponent(q)}&limit=8`)
        .then((res) => setResults(Array.isArray(res?.data) ? res.data : []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  return (
    <div style={{ position: "relative", width: 220 }}>
      <input
        className="input" placeholder="Search student name..."
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 20, maxHeight: 180, overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}>
          {results.map((s) => (
            <div
              key={s.id}
              style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.surfaceAlt; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              onClick={() => { onPick(s.id, `${s.first_name} ${s.last_name}`); setQ(`${s.first_name} ${s.last_name}`); setOpen(false); }}
            >
              {s.first_name} {s.last_name} <span style={{ color: C.textMuted }}>({s.admission_no})</span>
            </div>
          ))}
        </div>
      )}
      {value && <div style={{ fontSize: 11.5, color: C.green, marginTop: 4, fontWeight: 600 }}>✓ Student selected</div>}
    </div>
  );
};
