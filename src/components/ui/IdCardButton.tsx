// @ts-nocheck
// "ID Card" button for the Student / Staff profile modals. Opens the generated PDF (front + back) in the in-app viewer.
import { useState } from "react";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { useDialog } from "../../contexts/DialogContext";
import { Icon } from "./Icon";

export const IdCardButton = ({ kind, id }) => {
  const { dialogAlert } = useDialog();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await openGeneratedPdf(`/${kind === "student" ? "students" : "teachers"}/${id}/id-card`, { name: "ID Card.pdf", title: "ID Card" });
    } catch (e) {
      await dialogAlert(e?.message || "Could not generate the ID card.", "ID Card");
    } finally { setBusy(false); }
  };
  return (
    <button className="btn btn-ghost" onClick={go} disabled={busy || !id}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="download" size={13} /> {busy ? "Preparing…" : "ID Card"}</span>
    </button>
  );
};
