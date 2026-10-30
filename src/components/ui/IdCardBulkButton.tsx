// @ts-nocheck
// "ID Cards" header button (Students / Staff modules): popup -> (students: pick class + section) -> choose layout -> bulk PDF.
// Staff: prints all active staff. Max 60 cards per print. `sectionId` (students) only pre-selects from the page filter.
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { useDialog } from "../../contexts/DialogContext";
import { Modal } from "./Modal";
import { Icon } from "./Icon";
import { C } from "../../theme/theme";

const layoutsFor = (o) => [
  { id: "a4", title: "A4 sheet", sub: `${o === "horizontal" ? "10" : "9"} cards per page with cut lines. Front and back pages (duplex friendly).` },
  { id: "card", title: "Card size", sub: `One card per page (${o === "horizontal" ? "86 x 54" : "54 x 86"} mm), front then back. For ID card printers.` },
];
const ORIENTS = [
  { id: "vertical", title: "Vertical", sub: "Portrait" },
  { id: "horizontal", title: "Horizontal", sub: "Landscape" },
];
const lab = { display: "block", fontSize: 11, color: C.textMuted, marginBottom: 4 };
const up = (v) => String(v).toUpperCase();

export const IdCardBulkButton = ({ kind, sectionId }) => {
  const { dialogAlert } = useDialog();
  const student = kind === "student";
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState("a4");
  const [orient, setOrient] = useState("vertical");
  const [busy, setBusy] = useState(false);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [gradeId, setGradeId] = useState("");
  const [secId, setSecId] = useState("");

  useEffect(() => {
    if (!open || !student) return;
    let off = false;
    (async () => {
      try {
        const [g, s, y] = await Promise.all([
          apiRequest("/setup/grades"), apiRequest("/setup/sections"), apiRequest("/setup/academic-years").catch(() => ({ data: [] })),
        ]);
        if (off) return;
        const gl = Array.isArray(g?.data) ? g.data : [];
        let sl = Array.isArray(s?.data) ? s.data : [];
        const cur = (Array.isArray(y?.data) ? y.data : []).find((v) => v.is_current);
        const inYear = cur ? sl.filter((x) => up(x.academic_year_id) === up(cur.id)) : sl;
        sl = (inYear.length ? inYear : sl).filter((x) => x.is_active !== false && x.is_active !== 0);
        setGrades(gl); setSections(sl);
        const pre = sl.find((x) => x.id === sectionId);
        setGradeId(pre ? pre.grade_id : gl[0]?.id || "");
        setSecId(pre ? pre.id : "");
      } catch { setGrades([]); setSections([]); }
    })();
    return () => { off = true; };
  }, [open]); // eslint-disable-line

  const secList = sections.filter((x) => x.grade_id === gradeId);
  const pickGrade = (id) => {
    setGradeId(id);
    const list = sections.filter((x) => x.grade_id === id);
    setSecId(list.length === 1 ? list[0].id : "");
  };
  const missing = student && !secId;

  const generate = async () => {
    if (missing) return;
    setBusy(true);
    try {
      await openGeneratedPdf(student ? "/students/id-cards" : "/teachers/id-cards", {
        method: "POST", name: "ID Cards.pdf", title: "ID Cards",
        body: student ? { section_id: secId, layout, orientation: orient } : { layout, orientation: orient },
      });
    } catch (e) {
      await dialogAlert(e?.message || "Could not generate the ID cards.", "ID Cards");
    } finally { setBusy(false); }
  };

  return (
    <>
      <button className="btn btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }} onClick={() => setOpen(true)}>
        <Icon name="download" size={14} /> ID Cards
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Print ID Cards" width={460}>
        <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 14 }}>
          {student ? "Prints ID cards for every student of the selected class and section." : "Prints ID cards for all active staff."} Up to 60 cards at a time.
        </div>
        {student && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={lab}>CLASS</label>
              <select className="select" value={gradeId} onChange={(e) => pickGrade(e.target.value)}>
                {grades.length === 0 && <option value="">Loading…</option>}
                {grades.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
              </select>
            </div>
            <div>
              <label style={lab}>SECTION</label>
              <select className="select" value={secId} onChange={(e) => setSecId(e.target.value)}>
                <option value="">{secList.length ? "Select section" : "No sections"}</option>
                {secList.map((x) => (<option key={x.id} value={x.id}>{x.name}</option>))}
              </select>
            </div>
          </div>
        )}
        <label style={lab}>ORIENTATION</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {ORIENTS.map((o) => (
            <label key={o.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${orient === o.id ? C.primary : C.border}` }}>
              <input type="radio" name="idcard-orient" checked={orient === o.id} onChange={() => setOrient(o.id)} style={{ accentColor: C.primary }} />
              <span><div style={{ fontSize: 13, fontWeight: 600 }}>{o.title}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{o.sub}</div></span>
            </label>
          ))}
        </div>
        <label style={lab}>LAYOUT</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {layoutsFor(orient).map((l) => (
            <label key={l.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${layout === l.id ? C.primary : C.border}` }}>
              <input type="radio" name="idcard-layout" checked={layout === l.id} onChange={() => setLayout(l.id)} style={{ accentColor: C.primary, marginTop: 3 }} />
              <span><div style={{ fontSize: 13, fontWeight: 600 }}>{l.title}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{l.sub}</div></span>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
          <button className="btn btn-primary" onClick={generate} disabled={busy || missing}>{busy ? "Generating…" : "Generate PDF"}</button>
        </div>
      </Modal>
    </>
  );
};
