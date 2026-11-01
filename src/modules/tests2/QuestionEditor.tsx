// @ts-nocheck
// Quick Test 2.0 - create / edit one question (all 9 types, images for the question and for every option).
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";
import { useGradesAndSections } from "../attendance/useGradesAndSections";
import { cbt, unwrap, uploadImage, useSubjects } from "./cbtApi";
import { TYPES } from "./helpers";
import { blankForm as blank, buildPayload, emptyOpt, formFromApi } from "./questionForm";

const Row = ({ label, children, flex = 1 }) => (
  <div style={{ flex, minWidth: 140 }}>
    <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 5, fontWeight: 600 }}>{label}</label>
    {children}
  </div>
);

// one small image slot (preview + upload + remove)
const ImageSlot = ({ item, kind, onChange, busyRef }) => {
  const { dialogAlert } = useDialog();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    setBusy(true);
    try { const a = await uploadImage(f, kind); onChange({ image_asset_id: a.id, image_url: a.url }); }
    catch (err) { dialogAlert(err.message || "Upload failed"); }
    finally { setBusy(false); }
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {item.image_url && <img src={item.image_url} alt="" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />}
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      <button type="button" className="btn btn-ghost" title={item.image_url ? "Replace image" : "Add image"} disabled={busy} onClick={() => ref.current.click()} style={{ padding: "5px 8px" }}>
        <Icon name="upload" size={13} />
      </button>
      {item.image_url && <button type="button" className="btn btn-ghost" title="Remove image" onClick={() => onChange({ image_asset_id: null, image_url: null })} style={{ padding: "5px 8px" }}><Icon name="close" size={13} /></button>}
    </span>
  );
};

export const QuestionEditor = ({ open, onClose, questionId, defaults, onSaved, draft, onDraftSave }) => {
  const { dialogAlert } = useDialog();
  const { grades } = useGradesAndSections();
  const subjects = useSubjects();
  const [f, setF] = useState(blank(1, defaults));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passages, setPassages] = useState([]);
  const bodyImg = useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const editing = !!questionId && !draft;

  useEffect(() => {
    if (!open) return;
    cbt.get("/questions?q_type=9&limit=50").then((r) => setPassages(unwrap(r).questions || [])).catch(() => {});
    if (draft) { setF(draft); return; }
    if (!questionId) { setF(blank(1, defaults)); return; }
    setLoading(true);
    cbt.get(`/questions/${questionId}`).then((r) => {
      setF(formFromApi(unwrap(r)));
    }).catch((e) => dialogAlert(e.message || "Could not load the question")).finally(() => setLoading(false));
  }, [open, questionId, draft]); // eslint-disable-line

  const build = () => buildPayload(f);

  const save = async () => {
    setSaving(true);
    try {
      const payload = build();
      if (draft) { onDraftSave && onDraftSave(f); onClose(); return; }
      if (editing) await cbt.put(`/questions/${questionId}`, payload); else await cbt.post("/questions", payload);
      onSaved && onSaved(); onClose();
    } catch (e) { dialogAlert(e.message || "Could not save the question"); }
    finally { setSaving(false); }
  };

  const addBodyImage = async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) return;
    try { const a = await uploadImage(file, 1); set("body", `${f.body}${f.body && !f.body.endsWith("\n") ? "\n" : ""}![](asset://${a.id})\n`); }
    catch (err) { dialogAlert(err.message || "Upload failed"); }
  };

  const t = Number(f.q_type);
  const setOpt = (i, patch) => set("options", f.options.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const toggleCorrect = (i) => set("options", f.options.map((x, k) => (t === 1 ? { ...x, is_correct: k === i } : k === i ? { ...x, is_correct: !x.is_correct } : x)));
  const setPair = (i, side, patch) => set("pairs", f.pairs.map((x, k) => (k === i ? { ...x, [side]: { ...x[side], ...patch } } : x)));
  const box = { border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, marginBottom: 8, background: `${C.surfaceAlt}66` };
  const OptLine = ({ item, onChange, onRemove, left }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {left}
      <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Text (optional if image is added)" value={item.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
      <ImageSlot item={item} kind={2} onChange={onChange} />
      {onRemove && <button type="button" className="btn btn-ghost" onClick={onRemove} style={{ padding: "5px 8px" }}><Icon name="trash" size={13} /></button>}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={draft ? "Edit question (before import)" : editing ? "Edit Question" : "New Question"} width={760}>
      {loading ? <div className="pulse" style={{ padding: 40, textAlign: "center", color: C.primary, fontSize: 12, fontWeight: 600 }}>Loading</div> : (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <Row label="Question type" flex={2}>
              <select className="select" style={{ width: "100%" }} value={f.q_type} disabled={editing} onChange={(e) => setF(blank(Number(e.target.value), { subject_id: f.subject_id, grade_id: f.grade_id }))}>
                {TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </Row>
            {t !== 9 && <Row label="Marks"><input className="input" type="number" min="0" step="0.5" style={{ width: "100%" }} value={f.marks} onChange={(e) => set("marks", e.target.value)} /></Row>}
            {t !== 9 && <Row label="Negative marks"><input className="input" type="number" min="0" step="0.25" style={{ width: "100%" }} value={f.negative_marks} onChange={(e) => set("negative_marks", e.target.value)} /></Row>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <label style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{t === 9 ? "Passage text" : "Question"}</label>
              <span>
                <input ref={bodyImg} type="file" accept="image/*" hidden onChange={addBodyImage} />
                <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => bodyImg.current.click()}><Icon name="upload" size={12} /> Add image</button>
              </span>
            </div>
            {(f.body_images || []).length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 8px", fontSize: 12, color: C.textMuted }}>
                From pasted code (uploaded when you import):
                {f.body_images.map((src, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <img src={src} alt="" style={{ height: 36, borderRadius: 6, border: `1px solid ${C.border}` }} />
                    <button type="button" className="btn btn-ghost" style={{ padding: "2px 6px" }} onClick={() => set("body_images", f.body_images.filter((_, k) => k !== i))}><Icon name="close" size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            <textarea className="input" rows={4} style={{ width: "100%", resize: "vertical" }} value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="Type the question. Write maths between $ signs, e.g. $x^2 + 3x$" />
          </div>

          {(t === 1 || t === 2) && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>{t === 1 ? "Options (pick the one correct answer)" : "Options (tick every correct answer)"}</label>
              {f.options.map((o, i) => (
                <div key={i} style={box}>
                  <OptLine item={o} onChange={(p) => setOpt(i, p)} onRemove={f.options.length > 2 ? () => set("options", f.options.filter((_, k) => k !== i)) : null}
                    left={<label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, width: 54 }}><input type={t === 1 ? "radio" : "checkbox"} checked={!!o.is_correct} onChange={() => toggleCorrect(i)} /> {"ABCDEFGHIJKLMNO"[i]}</label>} />
                </div>
              ))}
              {f.options.length < 15 && <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => set("options", [...f.options, emptyOpt()])}><Icon name="plus" size={12} /> Add option</button>}
              {t === 2 && <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12.5 }}><input type="checkbox" checked={f.partial} onChange={(e) => set("partial", e.target.checked)} /> Give partial marks when only some correct options are chosen</label>}
            </div>
          )}

          {t === 3 && (
            <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 13.5 }}>
              <label><input type="radio" checked={f.tf} onChange={() => set("tf", true)} /> Correct answer is True</label>
              <label><input type="radio" checked={!f.tf} onChange={() => set("tf", false)} /> Correct answer is False</label>
            </div>
          )}

          {t === 4 && (
            <div style={{ marginBottom: 14 }}>
              <Row label="Accepted answers (one per line)"><textarea className="input" rows={3} style={{ width: "100%" }} value={f.answers} onChange={(e) => set("answers", e.target.value)} /></Row>
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12.5 }}><input type="checkbox" checked={f.case_sensitive} onChange={(e) => set("case_sensitive", e.target.checked)} /> Capital / small letters must match</label>
            </div>
          )}

          {t === 5 && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
              <Row label="Answer type"><select className="select" style={{ width: "100%" }} value={f.nMode} onChange={(e) => set("nMode", e.target.value)}><option value="value">Exact value (+/- tolerance)</option><option value="range">Range</option></select></Row>
              {f.nMode === "value" ? (<>
                <Row label="Correct value"><input className="input" type="number" step="any" style={{ width: "100%" }} value={f.nValue} onChange={(e) => set("nValue", e.target.value)} /></Row>
                <Row label="Tolerance (+/-)"><input className="input" type="number" min="0" step="any" style={{ width: "100%" }} value={f.nTol} onChange={(e) => set("nTol", e.target.value)} /></Row>
              </>) : (<>
                <Row label="Minimum"><input className="input" type="number" step="any" style={{ width: "100%" }} value={f.nMin} onChange={(e) => set("nMin", e.target.value)} /></Row>
                <Row label="Maximum"><input className="input" type="number" step="any" style={{ width: "100%" }} value={f.nMax} onChange={(e) => set("nMax", e.target.value)} /></Row>
              </>)}
            </div>
          )}

          {(t === 6 || t === 7) && <div style={{ marginBottom: 14 }}><Row label="Model answer / marking hint (only teachers see this)"><textarea className="input" rows={3} style={{ width: "100%" }} value={f.modelAnswer} onChange={(e) => set("modelAnswer", e.target.value)} /></Row></div>}

          {t === 8 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>Matching pairs (left item - its correct right item)</label>
              {f.pairs.map((p, i) => (
                <div key={i} style={{ ...box, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                  <OptLine item={p.l} onChange={(x) => setPair(i, "l", x)} left={<b style={{ width: 20 }}>{i + 1}</b>} />
                  <OptLine item={p.r} onChange={(x) => setPair(i, "r", x)} />
                  {f.pairs.length > 2 ? <button type="button" className="btn btn-ghost" onClick={() => set("pairs", f.pairs.filter((_, k) => k !== i))} style={{ padding: "5px 8px" }}><Icon name="trash" size={13} /></button> : <span />}
                </div>
              ))}
              {f.pairs.length < 15 && <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => set("pairs", [...f.pairs, { l: emptyOpt(), r: emptyOpt() }])}><Icon name="plus" size={12} /> Add pair</button>}
              <label style={{ display: "block", fontSize: 12, color: C.textMuted, margin: "12px 0 6px", fontWeight: 600 }}>Extra wrong right-side items (optional)</label>
              {f.extras.map((x, j) => (
                <div key={j} style={box}><OptLine item={x} onChange={(p) => set("extras", f.extras.map((e, k) => (k === j ? { ...e, ...p } : e)))} onRemove={() => set("extras", f.extras.filter((_, k) => k !== j))} /></div>
              ))}
              {f.extras.length < 10 && <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => set("extras", [...f.extras, emptyOpt()])}><Icon name="plus" size={12} /> Add extra item</button>}
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12.5 }}><input type="checkbox" checked={f.partial} onChange={(e) => set("partial", e.target.checked)} /> Partial marks for correct pairs</label>
            </div>
          )}

          {t !== 9 && <div style={{ marginBottom: 14 }}><Row label="Explanation (shown to students after the result)"><textarea className="input" rows={2} style={{ width: "100%" }} value={f.explanation} onChange={(e) => set("explanation", e.target.value)} /></Row></div>}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <Row label="Class"><select className="select" style={{ width: "100%" }} value={f.grade_id} onChange={(e) => set("grade_id", e.target.value)}><option value="">Any</option>{grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Row>
            <Row label="Subject"><select className="select" style={{ width: "100%" }} value={f.subject_id} onChange={(e) => set("subject_id", e.target.value)}><option value="">Any</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Row>
            <Row label="Topic / chapter"><input className="input" style={{ width: "100%" }} value={f.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. Linear equations" /></Row>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <Row label="Difficulty"><select className="select" style={{ width: "100%" }} value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)}><option value="">Not set</option><option value="1">1 - Very easy</option><option value="2">2 - Easy</option><option value="3">3 - Medium</option><option value="4">4 - Hard</option><option value="5">5 - Very hard</option></select></Row>
            <Row label="Who can use it"><select className="select" style={{ width: "100%" }} value={f.visibility} onChange={(e) => set("visibility", e.target.value)}><option value="1">All teachers of my school</option><option value="0">Only me</option></select></Row>
            {t !== 9 && <Row label="Belongs to passage"><select className="select" style={{ width: "100%" }} value={f.parent_id} onChange={(e) => set("parent_id", e.target.value)}><option value="">No passage</option>{passages.map((p) => <option key={p.id} value={p.id}>{String(p.snippet || "").slice(0, 40)}</option>)}</select></Row>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : draft ? "Apply changes" : editing ? "Save changes" : "Save question"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
};
