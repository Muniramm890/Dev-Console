// @ts-nocheck
// Link jo browser me nayi tab kholta hai, lekin Android app me file download karke phone ke PDF/document viewer me kholta hai (WhatsApp jaisa).
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { isNative } from "../../native";
import { useDialog } from "../../contexts/DialogContext";
import { isDocDownloaded, isPdfDoc, openDocument, type DocRef } from "../../utils/openDocument";

export type DocState = { busy: boolean; pct: number; done: boolean };

export const DocLink = ({ doc, children, style, className, stopPropagation, forceDownload }: {
  doc: DocRef; children: ReactNode | ((s: DocState) => ReactNode);
  style?: CSSProperties; className?: string; stopPropagation?: boolean; forceDownload?: boolean;
}) => {
  const { dialogAlert } = useDialog();
  const [st, setSt] = useState<DocState>({ busy: false, pct: 0, done: false });

  useEffect(() => {
    let live = true;
    if (isNative) isDocDownloaded(doc).then((ok) => { if (live && ok) setSt((s) => ({ ...s, done: true })); });
    return () => { live = false; };
  }, [doc.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const onClick = async (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    // PDF -> in-app viewer (web + app). Other files: Android app downloads + opens in a phone app; web = normal link.
    const pdfInViewer = isPdfDoc(doc) && (isNative || !forceDownload);
    if (!isNative && !pdfInViewer) return;
    e.preventDefault();
    if (st.busy) return;
    setSt({ busy: true, pct: 0, done: st.done });
    try {
      await openDocument(doc, (pct) => setSt((s) => ({ ...s, pct })));
      setSt({ busy: false, pct: 100, done: true });
    } catch (err: any) {
      setSt((s) => ({ ...s, busy: false, pct: 0 }));
      await dialogAlert(err?.message || "Could not open this file.", "Could not open file");
    }
  };

  return (
    <a href={doc.url} target="_blank" rel="noopener noreferrer" download={forceDownload ? doc.name : undefined} onClick={onClick} className={className}
      style={{ ...style, opacity: st.busy ? 0.85 : undefined, touchAction: "manipulation" }}>
      {typeof children === "function" ? children(st) : children}
    </a>
  );
};
