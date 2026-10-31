// @ts-nocheck
import { useState } from "react";
import { papi, explain, toast, ago } from "../api";
import { Field, useLoad } from "../ui";
import { C } from "../../theme/theme";
import { SectionCard } from "../../components/ui/SectionCard";
import { EmptyState } from "../../components/ui/EmptyState";

export const AnnouncementsPage = () => {
  const l = useLoad(() => papi("/announcements"), []);
  const [t, setT] = useState(""); const [b, setB] = useState(""); const [ex, setEx] = useState(""); const [busy, setBusy] = useState(false);
  const add = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await papi("/announcements", "POST", { title: t, body: b, expires_at: ex || undefined }); setT(""); setB(""); setEx(""); toast("Saved (all schools)"); l.reload(); }
    catch (x) { toast(explain(x), "err"); } finally { setBusy(false); }
  };
  const toggle = async (a) => { try { await papi(`/announcements/${a.id}`, "PUT", { is_active: !a.is_active }); l.reload(); } catch (x) { toast(explain(x), "err"); } };
  return (
    <div>
      <form onSubmit={add} style={{ marginBottom: 14 }}><SectionCard icon="megaphone" title="New announcement" sub="Sab schools ke liye">
        <Field label="Title"><input className="input" value={t} onChange={(e) => setT(e.target.value)} required /></Field>
        <Field label="Message"><textarea className="input" rows={3} value={b} onChange={(e) => setB(e.target.value)} required /></Field>
        <Field label="Expires (optional)"><input className="input" type="date" value={ex} onChange={(e) => setEx(e.target.value)} /></Field>
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy}>Save</button>
        <p style={{ fontSize: 12, color: C.textMuted }}>Stored now; showing them inside the school apps comes with the next step.</p>
      </SectionCard></form>
      {!l.loading && !(l.data || []).length && <div className="card"><EmptyState icon="megaphone" title="No announcements yet" sub="Upar form se pehli announcement banao." /></div>}
      {(l.data || []).map((a) => (
        <div key={a.id} className="card dc-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div><b>{a.title}</b> <span style={{ fontSize: 12, color: a.is_active ? C.green : C.textMuted }}>{a.is_active ? "active" : "off"}</span>
            <div style={{ fontSize: 13 }}>{a.body}</div><div style={{ fontSize: 11, color: C.textMuted }}>{ago(a.created_at)}</div></div>
          <button className="btn btn-ghost" onClick={() => toggle(a)}>{a.is_active ? "Turn off" : "Turn on"}</button>
        </div>))}
    </div>
  );
};
