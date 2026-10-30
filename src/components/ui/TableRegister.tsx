// @ts-nocheck
// Generic register view. The backend sends ONE table JSON ({title, subtitle, info, legend, columns, rows, footers, sticky})
// which drives both this screen and the PDF, so they always match. Theme tokens only.
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { useDialog } from "../../contexts/DialogContext";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icon";
import { C } from "../../theme/theme";

const tone = (t) => ({ good: C.green, bad: C.red, warn: C.yellow, info: C.blue, muted: C.textMuted }[t] || C.text);
const bgOf = (b) => (b === "off" ? `${C.border}66` : b ? `${tone(b)}26` : "transparent");
const cellOf = (c) => (c === null || c === undefined ? { t: "" } : typeof c === "object" ? c : { t: c });

export const useRegisterData = (url) => {
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seq = useRef(0);
  useEffect(() => {
    if (!url) { setTable(null); setError(""); return; }
    const my = ++seq.current;
    setLoading(true); setError("");
    (async () => {
      try {
        const res = await apiRequest(url);
        if (my === seq.current) setTable(res?.data?.register || null);
      } catch (e) { if (my === seq.current) { setTable(null); setError(e.message || "Could not load the register"); } }
      finally { if (my === seq.current) setLoading(false); }
    })();
  }, [url]);
  return { table, loading, error };
};

export const useRegisterPdf = () => {
  const { dialogAlert } = useDialog();
  const [busy, setBusy] = useState(false);
  const open = async (url, name, title) => {
    setBusy(true);
    try { await openGeneratedPdf(url, { name, title }); }
    catch (e) { await dialogAlert(e.message || "Could not generate the PDF", "PDF failed"); }
    finally { setBusy(false); }
  };
  return { busy, open };
};

export const TableRegister = ({ table, loading, error, filters, actions, onPdf, pdfBusy, emptyTitle = "Nothing to show", emptySub = "Change the filters above." }) => {
  const cols = table?.columns || []; const rows = table?.rows || []; const foots = table?.footers || [];
  const px = cols.map((c) => Math.max(34, Math.round((c.w || 6) * 9)));
  const sticky = Math.min(table?.sticky || 0, 2);
  const left = px.map((_, i) => px.slice(0, i).reduce((a, b) => a + b, 0));
  const stickStyle = (i, bg) => (i < sticky ? { position: "sticky", left: left[i], zIndex: 2, background: bg } : {});

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>{filters}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {actions}
          {onPdf && (
            <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5 }} disabled={pdfBusy || !rows.length} onClick={onPdf} title="Generate this register as a PDF">
              <Icon name="download" size={14} /> {pdfBusy ? "Preparing…" : "PDF"}
            </button>
          )}
        </div>
      </div>

      {loading && !table ? (
        <div className="card pulse" style={{ padding: 30, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading register…</div>
      ) : error ? (
        <div className="card"><EmptyState icon="warning" title="Could not load the register" sub={error} /></div>
      ) : !table || rows.length === 0 ? (
        <div className="card"><EmptyState icon="file" title={emptyTitle} sub={emptySub} /></div>
      ) : (
        <div className="card" style={{ padding: 0, opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
          <div style={{ padding: "14px 16px" }}>
            <div className="syne" style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{table.title}{table.subtitle ? <span style={{ color: C.textMuted, fontWeight: 500 }}> · {table.subtitle}</span> : null}</div>
            {table.info && <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 3 }}>{table.info.replace(/\s{2,}\|\s{2,}/g, "  ·  ")}</div>}
            {(table.legend || []).length > 0 && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {table.legend.map((l, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                    <span style={{ width: 16, height: 12, borderRadius: 4, border: `1px solid ${C.border}`, background: bgOf(l.bg), display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {l.tone && <span style={{ width: 6, height: 3, borderRadius: 2, background: tone(l.tone) }} />}
                    </span>
                    {l.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", maxHeight: "68vh" }}>
            <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%" }}>
              <thead>
                <tr>
                  {cols.map((c, i) => (
                    <th key={i} style={{ position: "sticky", top: 0, zIndex: i < sticky ? 4 : 3, background: C.surfaceAlt, ...(i < sticky ? { left: left[i] } : {}), minWidth: px[i], width: px[i], padding: "7px 6px", fontSize: 10.5, fontWeight: 700, color: C.textMuted, textAlign: c.align || "left", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                      <div style={{ color: C.text }}>{c.label}</div>
                      {c.sub && <div style={{ fontWeight: 600, opacity: 0.75 }}>{c.sub}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri}>
                    {cols.map((c, i) => {
                      const cell = cellOf(r[i]);
                      return (
                        <td key={i} style={{ ...stickStyle(i, C.surface), padding: "6px 6px", fontSize: 12, textAlign: c.align || "left", fontWeight: cell.bold ? 800 : 500, color: tone(cell.tone), background: cell.bg ? bgOf(cell.bg) : i < sticky ? C.surface : "transparent", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          {cell.t}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {foots.length > 0 && (
                <tfoot>
                  {foots.map((r, ri) => (
                    <tr key={ri}>
                      {cols.map((c, i) => {
                        const cell = cellOf(r[i]);
                        return (
                          <td key={i} style={{ ...stickStyle(i, C.surfaceAlt), padding: "6px 6px", fontSize: 12, fontWeight: 800, textAlign: c.align || "left", color: tone(cell.tone), background: C.surfaceAlt, whiteSpace: "nowrap", borderTop: ri === 0 ? `2px solid ${C.border}` : undefined }}>
                            {cell.t}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
