// @ts-nocheck
import { useEffect, useState } from "react";
import { C } from "../theme/theme";

export const statusColor = (s) => (s === "blocked" ? C.red : s === "suspended" ? C.yellow : C.green);
export const Chip = ({ status, deleted }) => {
  const label = deleted ? "deleted" : status || "active"; const col = deleted ? C.textMuted : statusColor(status);
  return <span className="dc-chip" style={{ background: `${col}22`, color: col }}>{label}</span>;
};

export const Modal = ({ title, onClose, children, wide }) => (
  <div className="dc-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
    <div className="card" style={{ maxWidth: wide ? 640 : 460 }}>
      <div className="dc-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <h3 className="syne" style={{ fontSize: 16, fontWeight: 800 }}>{title}</h3>
        {onClose && <button className="btn btn-ghost" onClick={onClose}>Close</button>}
      </div>
      {children}
    </div>
  </div>
);

export const Field = ({ label, children }) => (<label style={{ display: "block" }}><span className="dc-label">{label}</span>{children}</label>);

export const Toasts = () => {
  const [t, setT] = useState(null);
  useEffect(() => {
    let timer; const on = (e) => { setT(e.detail); clearTimeout(timer); timer = setTimeout(() => setT(null), 3500); };
    window.addEventListener("dc-toast", on); return () => { window.removeEventListener("dc-toast", on); clearTimeout(timer); };
  }, []);
  if (!t) return null;
  return <div className="dc-toast" style={{ background: t.kind === "err" ? C.red : C.green, color: "#fff" }}>{t.msg}</div>;
};

export const useLoad = (fn, deps) => {
  const [data, setData] = useState(null); const [err, setErr] = useState(""); const [loading, setLoading] = useState(true);
  const reload = () => { setLoading(true); setErr(""); return fn().then(setData).catch((e) => setErr(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { reload(); }, deps); // eslint-disable-line
  return { data, err, loading, reload, setData };
};

export const CopyBox = ({ text }) => (
  <div className="dc-row" style={{ background: C.surfaceAlt, padding: 10, borderRadius: 10, justifyContent: "space-between" }}>
    <span className="dc-mono">{text}</span>
    <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(text); }}>Copy</button>
  </div>
);
