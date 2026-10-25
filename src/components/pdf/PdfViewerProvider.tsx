// @ts-nocheck
// Mount once near the app root. After that, any code can open a PDF in the in-app viewer:
//   openPdf({ url, name: "Receipt.pdf", title: "Fee Receipt" })        (from "utils/openDocument")
//   const { openPdf } = usePdfViewer()                                   (inside components)
// openDocument() / <DocLink> route every PDF here automatically.
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { registerPdfOpener, type DocRef } from "../../utils/openDocument";

const PdfViewer = lazy(() => import("./PdfViewer").then((m) => ({ default: m.PdfViewer }))); // pdf.js loads only on first use

const Ctx = createContext<{ openPdf: (d: DocRef) => void }>({ openPdf: () => {} });
export const usePdfViewer = () => useContext(Ctx);

const Boot = () => (
  <div style={{ position: "fixed", inset: 0, zIndex: 100001, background: "#171a24", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <style>{`@keyframes pvSpin2 { to { transform: rotate(360deg); } }`}</style>
    <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(255,255,255,.12)", borderTopColor: "#E8600A", animation: "pvSpin2 .8s linear infinite" }} />
  </div>
);

export const PdfViewerProvider = ({ children }: { children: ReactNode }) => {
  const [doc, setDoc] = useState<DocRef | null>(null);
  const open = useCallback((d: DocRef) => setDoc({ ...d }), []);
  useEffect(() => { registerPdfOpener(open); return () => registerPdfOpener(null); }, [open]);
  const value = useMemo(() => ({ openPdf: open }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {doc && <Suspense fallback={<Boot />}><PdfViewer key={doc.url} doc={doc} onClose={() => setDoc(null)} /></Suspense>}
    </Ctx.Provider>
  );
};
