// FILE: teacher-app/src/components/ui/PdfViewerModal.tsx
// @ts-nocheck
// Backward-compatible wrapper: the old iframe viewer is replaced by the shared in-app PdfViewer
// (components/pdf). Same props, so existing screens (fee receipts, report cards) keep working.
import { useEffect } from "react";
import { openPdf } from "../../utils/openDocument";

export const PdfViewerModal = ({ url, onClose, title = "Document" }) => {
  useEffect(() => {
    if (!url) return;
    openPdf({ url, name: `${title}.pdf`, mime: "application/pdf", title });
    onClose?.(); // the viewer is owned by PdfViewerProvider; reset the caller's state
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};
