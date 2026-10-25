// @ts-nocheck
// Premium in-app PDF viewer (reusable): receipts, payslips, marksheets, chat/homework attachments ...
// Features: continuous scroll, crisp HiDPI rendering, lazy pages (big PDFs smooth), pinch-zoom + double-tap + ctrl/⌘-wheel,
// page indicator + jump-to-page, fit-to-width, download/print (web) or "Open with" (Android), safe-area aware,
// Android back button closes it, keyboard shortcuts (Esc, + − 0, PageUp/PageDown, Home/End), retry on errors.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { isNative } from "../../native";
import { getPdfjs } from "./pdfjs";
import { fileNameOf, loadDocBytes, openExternally, type DocRef } from "../../utils/openDocument";

const MIN_Z = 0.5, MAX_Z = 4, ACCENT = "#E8600A", INK = "#F4F6FB", MUTED = "#8891A8";
const ICON = {
  close: "M18 6L6 18M6 6l12 12", plus: "M12 5v14M5 12h14", minus: "M5 12h14",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14",
  print: "M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a1 1 0 011-1h16a1 1 0 011 1v6a1 1 0 01-1 1h-2M6 14h12v7H6z",
  open: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  alert: "M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
};
const Ic = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);
const btn: CSSProperties = { width: 44, height: 44, borderRadius: 12, border: "none", background: "transparent", color: INK, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, touchAction: "manipulation" };
const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z));

type Dim = { w: number; h: number };

// ── one page: lazy canvas render (only near the viewport), crisp swap without flicker ──
const PdfPage = ({ pdf, index, w, h, scale, root }: { pdf: any; index: number; w: number; h: number; scale: number; root: RefObject<HTMLDivElement | null> }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(index <= 2);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { root: root.current, rootMargin: "150% 0px" });
    io.observe(el); return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    if (!near) { c.width = 1; c.height = 1; setPainted(false); return; }
    let dead = false; let task: any;
    const t = window.setTimeout(async () => {
      try {
        const page = await pdf.getPage(index);
        const base = page.getViewport({ scale: 1 });
        let s = scale * Math.min(window.devicePixelRatio || 1, 2.5);
        const px = base.width * s * base.height * s; if (px > 16e6) s *= Math.sqrt(16e6 / px); // memory guard on phones
        const vp = page.getViewport({ scale: s });
        const off = document.createElement("canvas"); off.width = Math.floor(vp.width); off.height = Math.floor(vp.height);
        task = page.render({ canvasContext: off.getContext("2d")!, viewport: vp });
        await task.promise; if (dead) return;
        c.width = off.width; c.height = off.height; c.getContext("2d")!.drawImage(off, 0, 0); setPainted(true);
      } catch { /* cancelled / destroyed */ }
    }, 80);
    return () => { dead = true; window.clearTimeout(t); try { task?.cancel(); } catch { /* noop */ } };
  }, [near, scale, pdf, index]);

  return (
    <div ref={wrap} data-page={index} style={{ width: w, height: h, background: "#fff", borderRadius: 2, boxShadow: "0 2px 14px rgba(0,0,0,.45)", position: "relative", flexShrink: 0, overflow: "hidden" }}>
      <canvas ref={canvas} style={{ width: "100%", height: "100%", display: "block" }} />
      {!painted && <div className="pv-shimmer" style={{ position: "absolute", inset: 0 }} />}
    </div>
  );
};

export const PdfViewer = ({ doc, onClose }: { doc: DocRef; onClose: () => void }) => {
  const title = doc.title || (doc.name || fileNameOf(doc)).replace(/\.pdf$/i, "");
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [pdf, setPdf] = useState<any>(null);
  const [sizes, setSizes] = useState<Dim[]>([]);
  const [zoom, setZoom] = useState(1);
  const [cw, setCw] = useState(0);
  const [cur, setCur] = useState(1);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const bytes = useRef<Uint8Array | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ fx: number; fy: number; cx: number; cy: number } | null>(null);
  const zoomRef = useRef(1); zoomRef.current = zoom;
  const offsetsRef = useRef<number[]>([]);

  const flash = (m: string) => { setNote(m); window.setTimeout(() => setNote(""), 3200); };

  // ── load: bytes (download/fetch) -> pdf.js document -> page sizes ──
  useEffect(() => {
    const ac = new AbortController(); let task: any; let loaded: any; let dead = false;
    setPhase("loading"); setPct(0); setErr(""); setPdf(null); setSizes([]); setZoom(1); setCur(1);
    (async () => {
      try {
        const data = await loadDocBytes(doc, setPct, ac.signal); if (dead) return;
        bytes.current = data;
        const lib = await getPdfjs(); if (dead) return;
        task = lib.getDocument({ data: data.slice(), isEvalSupported: false });
        loaded = await task.promise; if (dead) return;
        const n: number = Math.min(loaded.numPages, 500); const dims: Dim[] = new Array(n);
        for (let i = 0; i < n; i += 25) {
          await Promise.all(Array.from({ length: Math.min(25, n - i) }, async (_, k) => {
            const p = await loaded.getPage(i + k + 1); const v = p.getViewport({ scale: 1 }); dims[i + k] = { w: v.width, h: v.height };
          }));
          if (dead) return;
        }
        setPdf(loaded); setSizes(dims); setPhase("ready");
      } catch (e: any) {
        if (dead || e?.name === "AbortError") return;
        const bad = e?.name === "InvalidPDFException" || e?.name === "FormatError" || /Invalid PDF/i.test(e?.message || "");
        const pw = e?.name === "PasswordException";
        setErr(pw ? "This PDF is password protected and cannot be opened here." : bad ? "This file is not a valid PDF." : (e?.message || "Could not open this document."));
        setPhase("error");
      }
    })();
    return () => { dead = true; ac.abort(); try { task?.destroy(); } catch { /* noop */ } try { loaded?.destroy(); } catch { /* noop */ } };
  }, [doc.url, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── lock page scroll behind the viewer ──
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = prev; }; }, []);

  // ── container width ──
  useLayoutEffect(() => {
    const r = root.current; if (!r) return;
    setCw(r.clientWidth);
    const ro = new ResizeObserver(() => setCw(r.clientWidth)); ro.observe(r); return () => ro.disconnect();
  }, []);

  // ── layout ──
  const narrow = cw > 0 && cw < 640;
  const padX = narrow ? 8 : 24, gap = narrow ? 8 : 14, padY = narrow ? 10 : 20;
  const maxW = sizes.reduce((m, s) => Math.max(m, s.w), 1);
  const fit = cw ? Math.min((cw - padX * 2) / maxW, 1000 / maxW) : 1;
  const scale = fit * zoom;
  const dims = useMemo(() => sizes.map((s) => ({ w: s.w * scale, h: s.h * scale })), [sizes, scale]);
  const offsets = useMemo(() => { let y = padY; return dims.map((d) => { const o = y; y += d.h + gap; return o; }); }, [dims, padY, gap]);
  offsetsRef.current = offsets;

  // ── zoom (keeps the point under your fingers/cursor fixed) ──
  const applyZoom = useCallback((next: number, cx?: number, cy?: number) => {
    const r = root.current, c = content.current; if (!r || !c) return;
    const ax = cx ?? r.clientWidth / 2, ay = cy ?? r.clientHeight / 2;
    anchor.current = { fx: (r.scrollLeft + ax - c.offsetLeft) / c.offsetWidth, fy: (r.scrollTop + ay - c.offsetTop) / c.offsetHeight, cx: ax, cy: ay };
    setZoom(clampZ(next));
  }, []);
  useLayoutEffect(() => {
    const a = anchor.current, r = root.current, c = content.current; if (!a || !r || !c) return;
    r.scrollLeft = a.fx * c.offsetWidth + c.offsetLeft - a.cx; r.scrollTop = a.fy * c.offsetHeight + c.offsetTop - a.cy; anchor.current = null;
  }, [zoom]);

  const goTo = useCallback((n: number) => {
    const r = root.current; if (!r) return;
    const i = Math.min(Math.max(1, n), offsetsRef.current.length || 1);
    r.scrollTo({ top: Math.max(0, (offsetsRef.current[i - 1] ?? 0) - 8) }); setCur(i);
  }, []);

  // ── gestures: pinch, double-tap, ctrl/⌘+wheel, scroll -> current page ──
  useEffect(() => {
    const r = root.current; if (!r || phase !== "ready") return;
    let pinch: { d0: number; z0: number; cx: number; cy: number; live: number } | null = null;
    let lastTap = 0, lastX = 0, lastY = 0, moved = false, sx = 0, sy = 0, raf = 0;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      const c = content.current; if (!c) return;
      if (e.touches.length === 2) {
        const b = r.getBoundingClientRect(); const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - b.left, my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - b.top;
        pinch = { d0: dist(e.touches), z0: zoomRef.current, cx: mx, cy: my, live: 1 };
        c.style.transformOrigin = `${r.scrollLeft + mx - c.offsetLeft}px ${r.scrollTop + my - c.offsetTop}px`; c.style.willChange = "transform";
      } else if (e.touches.length === 1) { moved = false; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
    };
    const onMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const z = clampZ(pinch.z0 * (dist(e.touches) / pinch.d0)); pinch.live = z / pinch.z0;
        if (content.current) content.current.style.transform = `scale(${pinch.live})`;
      } else if (e.touches.length === 1 && Math.hypot(e.touches[0].clientX - sx, e.touches[0].clientY - sy) > 10) moved = true;
    };
    const onEnd = (e: TouchEvent) => {
      const c = content.current;
      if (pinch && e.touches.length < 2) {
        const p = pinch; pinch = null; if (c) { c.style.transform = ""; c.style.willChange = ""; }
        applyZoom(p.z0 * p.live, p.cx, p.cy); lastTap = 0; return;
      }
      if (e.touches.length === 0 && e.changedTouches.length === 1 && !moved) {
        const t = e.changedTouches[0], now = Date.now();
        if (now - lastTap < 300 && Math.hypot(t.clientX - lastX, t.clientY - lastY) < 30) {
          const b = r.getBoundingClientRect(); applyZoom(zoomRef.current > 1.05 ? 1 : 2.4, t.clientX - b.left, t.clientY - b.top); lastTap = 0;
        } else { lastTap = now; lastX = t.clientX; lastY = t.clientY; }
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault(); const b = r.getBoundingClientRect();
      applyZoom(zoomRef.current * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - b.left, e.clientY - b.top);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const y = r.scrollTop + r.clientHeight * 0.4; const o = offsetsRef.current; let lo = 0, hi = o.length - 1;
        while (lo < hi) { const m = (lo + hi + 1) >> 1; if (o[m] <= y) lo = m; else hi = m - 1; }
        setCur(lo + 1);
      });
    };
    r.addEventListener("touchstart", onStart, { passive: true }); r.addEventListener("touchmove", onMove, { passive: false });
    r.addEventListener("touchend", onEnd, { passive: true }); r.addEventListener("touchcancel", onEnd, { passive: true });
    r.addEventListener("wheel", onWheel, { passive: false }); r.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      r.removeEventListener("touchstart", onStart); r.removeEventListener("touchmove", onMove); r.removeEventListener("touchend", onEnd);
      r.removeEventListener("touchcancel", onEnd); r.removeEventListener("wheel", onWheel); r.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf);
    };
  }, [phase, applyZoom]);

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (phase !== "ready") return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); applyZoom(zoomRef.current * 1.2); }
      else if (e.key === "-") { e.preventDefault(); applyZoom(zoomRef.current / 1.2); }
      else if (e.key === "0") { e.preventDefault(); applyZoom(1); }
      else if (e.key === "PageDown") { e.preventDefault(); goTo(cur + 1); }
      else if (e.key === "PageUp") { e.preventDefault(); goTo(cur - 1); }
      else if (e.key === "Home") { e.preventDefault(); goTo(1); }
      else if (e.key === "End") { e.preventDefault(); goTo(offsetsRef.current.length); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [phase, cur, onClose, applyZoom, goTo]);

  // ── actions ──
  const saveCopy = async () => {
    if (isNative) { try { await openExternally(doc); } catch (e: any) { flash(e?.message || "Could not open this file."); } return; }
    if (!bytes.current) return;
    const url = URL.createObjectURL(new Blob([bytes.current.slice()], { type: "application/pdf" }));
    const a = document.createElement("a"); a.href = url; a.download = fileNameOf({ ...doc, mime: "application/pdf" }); document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const printIt = () => {
    if (!bytes.current) return;
    const url = URL.createObjectURL(new Blob([bytes.current.slice()], { type: "application/pdf" }));
    const f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;"; f.src = url;
    f.onload = () => { try { f.contentWindow?.focus(); f.contentWindow?.print(); } catch { window.open(url, "_blank"); } window.setTimeout(() => { f.remove(); URL.revokeObjectURL(url); }, 60000); };
    document.body.appendChild(f);
  };

  const pages = sizes.length;
  const sub = phase === "ready" ? `${pages} page${pages === 1 ? "" : "s"}${bytes.current ? ` · ${fmtSize(bytes.current.length)}` : ""}` : phase === "loading" ? "Opening…" : "Could not open";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: "fixed", inset: 0, zIndex: 100001, background: "#171a24", display: "flex", flexDirection: "column", color: INK, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes pvSpin { to { transform: rotate(360deg); } }
        @keyframes pvShim { 0% { background-position: -300px 0; } 100% { background-position: 300px 0; } }
        .pv-shimmer { background: linear-gradient(90deg, #f1f2f6 0, #fff 50%, #f1f2f6 100%); background-size: 600px 100%; animation: pvShim 1.3s linear infinite; }
        .pv-btn:hover { background: rgba(255,255,255,.1) !important; } .pv-btn:active { background: rgba(255,255,255,.16) !important; }
        .pv-scroll { scrollbar-width: thin; scrollbar-color: #3a3f52 transparent; }
      `}</style>
      <span data-native-back onClick={onClose} style={{ display: "none" }} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "calc(8px + var(--sat, 0px)) 8px 8px", background: "#0B0D14", borderBottom: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>
        <button className="pv-btn" style={btn} onClick={onClose} aria-label="Close"><Ic d={ICON.close} /></button>
        <div style={{ minWidth: 0, flex: 1, padding: "0 4px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{sub}</div>
        </div>
        {phase === "ready" && !narrow && (<>
          <button className="pv-btn" style={btn} onClick={() => applyZoom(zoom / 1.2)} aria-label="Zoom out" disabled={zoom <= MIN_Z}><Ic d={ICON.minus} size={18} /></button>
          <button className="pv-btn" style={{ ...btn, width: 62, fontSize: 13, fontWeight: 700 }} onClick={() => applyZoom(1)} aria-label="Fit to width" title="Fit to width">{Math.round(scale * 100)}%</button>
          <button className="pv-btn" style={btn} onClick={() => applyZoom(zoom * 1.2)} aria-label="Zoom in" disabled={zoom >= MAX_Z}><Ic d={ICON.plus} size={18} /></button>
          {!isNative && <button className="pv-btn" style={btn} onClick={printIt} aria-label="Print" title="Print"><Ic d={ICON.print} /></button>}
        </>)}
        {phase === "ready" && (
          <button className="pv-btn" style={btn} onClick={saveCopy} aria-label={isNative ? "Open in another app" : "Download"} title={isNative ? "Open in another app" : "Download"}>
            <Ic d={isNative ? ICON.open : ICON.download} />
          </button>
        )}
      </div>

      {/* body */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div ref={root} className="pv-scroll" style={{ position: "absolute", inset: 0, overflow: "auto", touchAction: "pan-x pan-y", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
          {phase === "ready" && pdf && (
            <div ref={content} style={{ width: "max-content", minWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap, padding: `${padY}px ${padX}px calc(${padY + 56}px + var(--sab, 0px))` }}>
              {dims.map((d, i) => <PdfPage key={i} pdf={pdf} index={i + 1} w={d.w} h={d.h} scale={scale} root={root} />)}
            </div>
          )}
        </div>

        {phase === "loading" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(255,255,255,.12)", borderTopColor: ACCENT, animation: "pvSpin .8s linear infinite" }} />
            <div style={{ fontSize: 13.5, color: MUTED }}>Opening document…</div>
            <div style={{ width: 180, height: 4, borderRadius: 4, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(6, pct)}%`, background: ACCENT, transition: "width .25s" }} />
            </div>
          </div>
        )}

        {phase === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 28, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(239,68,68,.14)", color: "#F87171", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic d={ICON.alert} size={26} /></div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Couldn’t open this document</div>
            <div style={{ fontSize: 13.5, color: MUTED, maxWidth: 320, lineHeight: 1.5 }}>{err}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={() => setAttempt((a) => a + 1)} style={{ height: 44, padding: "0 22px", borderRadius: 12, border: "none", background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Try again</button>
              {!isNative && !doc.bytes && <button onClick={() => window.open(doc.url, "_blank", "noopener")} style={{ height: 44, padding: "0 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "transparent", color: INK, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Open in new tab</button>}
            </div>
          </div>
        )}

        {/* page pill + fit */}
        {phase === "ready" && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: "calc(14px + var(--sab, 0px))", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, pointerEvents: "none" }}>
            {pages > 1 && (editing ? (
              <form style={{ pointerEvents: "auto" }} onSubmit={(e) => { e.preventDefault(); const v = Number((e.currentTarget.elements.namedItem("pg") as HTMLInputElement).value); if (v) goTo(v); setEditing(false); }}>
                <input name="pg" autoFocus type="number" min={1} max={pages} inputMode="numeric" defaultValue={cur} onBlur={() => setEditing(false)}
                  style={{ width: 84, height: 38, borderRadius: 100, border: `1.5px solid ${ACCENT}`, background: "#0B0D14", color: INK, textAlign: "center", fontSize: 15, fontWeight: 700, outline: "none" }} />
              </form>
            ) : (
              <button onClick={() => setEditing(true)} aria-label="Go to page" style={{ pointerEvents: "auto", height: 38, padding: "0 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,.14)", background: "rgba(11,13,20,.88)", backdropFilter: "blur(8px)", color: INK, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                {cur} <span style={{ color: MUTED, fontWeight: 500 }}>/ {pages}</span>
              </button>
            ))}
            {Math.abs(zoom - 1) > 0.02 && (
              <button onClick={() => applyZoom(1)} aria-label="Fit to width" style={{ pointerEvents: "auto", height: 38, padding: "0 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,.14)", background: "rgba(11,13,20,.88)", backdropFilter: "blur(8px)", color: INK, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Ic d={ICON.fit} size={15} /> Fit
              </button>
            )}
          </div>
        )}

        {note && <div role="status" style={{ position: "absolute", left: 16, right: 16, bottom: "calc(66px + var(--sab, 0px))", margin: "0 auto", maxWidth: 420, padding: "12px 16px", borderRadius: 12, background: "#0B0D14", border: "1px solid rgba(255,255,255,.14)", fontSize: 13.5, textAlign: "center" }}>{note}</div>}
      </div>
    </div>,
    document.body
  );
};
