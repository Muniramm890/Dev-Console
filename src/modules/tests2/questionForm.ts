// @ts-nocheck
// Quick Test 2.0 - the ONE place that knows how a question form looks and how it becomes an API payload.
// The manual editor and the "Import from code" parser both go through these functions, so the result is identical.

export const emptyOpt = () => ({ text: "", image_asset_id: null, image_url: null, is_correct: false });

export const blankForm = (type = 1, d = {}) => ({
  q_type: type, body: "", explanation: "", marks: type === 9 ? 0 : 1, negative_marks: 0, topic: "", difficulty: "", visibility: 1,
  subject_id: d.subject_id || "", grade_id: d.grade_id || "", parent_id: "",
  options: [emptyOpt(), emptyOpt(), emptyOpt(), emptyOpt()], tf: true, answers: "", case_sensitive: false,
  nMode: "value", nValue: "", nTol: "0", nMin: "", nMax: "", modelAnswer: "",
  pairs: [{ l: emptyOpt(), r: emptyOpt() }, { l: emptyOpt(), r: emptyOpt() }], extras: [], partial: false,
});

const part = (x) => ({ text: (x.text || "").trim() || null, image_asset_id: x.image_asset_id || null });

// form state -> body of POST /cbt/questions (throws a readable Error when the form cannot be sent)
export const buildPayload = (f) => {
  const t = Number(f.q_type);
  const p = { q_type: t, body: f.body, explanation: f.explanation || null, marks: t === 9 ? 0 : Number(f.marks), negative_marks: t === 9 ? 0 : Number(f.negative_marks || 0), topic: f.topic || null,
    difficulty: f.difficulty ? Number(f.difficulty) : null, visibility: Number(f.visibility), subject_id: f.subject_id || null, grade_id: f.grade_id || null, parent_id: f.parent_id || null };
  if (t === 1 || t === 2) {
    p.options = f.options.filter((x) => (x.text || "").trim() || x.image_asset_id).map((x) => ({ ...part(x), is_correct: !!x.is_correct }));
    if (t === 2 && f.partial) p.answer_config = { partial: true };
  } else if (t === 3) p.options = [{ text: "True", is_correct: !!f.tf }, { text: "False", is_correct: !f.tf }];
  else if (t === 4) p.answer_config = { answers: f.answers.split("\n").map((s) => s.trim()).filter(Boolean), case_sensitive: !!f.case_sensitive };
  else if (t === 5) p.answer_config = f.nMode === "range" ? { min: Number(f.nMin), max: Number(f.nMax) } : { value: Number(f.nValue), tolerance: Number(f.nTol || 0) };
  else if (t === 6 || t === 7) p.answer_config = f.modelAnswer ? { model_answer: f.modelAnswer } : {};
  else if (t === 8) {
    if (f.pairs.length < 2) throw new Error("Add at least 2 pairs");
    p.options = [
      ...f.pairs.map((x, i) => ({ ...part(x.l), side: "L", pair_key: i + 1 })),
      ...f.pairs.map((x, i) => ({ ...part(x.r), side: "R", pair_key: i + 1 })),
      ...f.extras.map((x, j) => ({ ...part(x), side: "R", pair_key: 100 + j })),
    ];
    if (f.partial) p.answer_config = { partial: true };
  }
  return p;
};

// GET /cbt/questions/:id  ->  form state (used when editing a saved question)
export const formFromApi = (q) => {
  const cfg = q.answer_config || {}; const base = blankForm(q.q_type, {});
  const o = (q.options || []).map((x) => ({ text: x.text || "", image_asset_id: x.image_asset_id, image_url: x.image_url, is_correct: !!x.is_correct, pair_key: x.pair_key, side: x.side, pos: x.pos }));
  const next = { ...base, q_type: q.q_type, body: q.body || "", explanation: q.explanation || "", marks: q.marks, negative_marks: q.negative_marks, topic: q.topic || "", difficulty: q.difficulty || "",
    visibility: q.visibility, subject_id: q.subject_id || "", grade_id: q.grade_id || "", parent_id: q.parent_id || "", partial: !!cfg.partial };
  if ([1, 2].includes(q.q_type)) next.options = o;
  if (q.q_type === 3) next.tf = !!(o[0] && o[0].is_correct);
  if (q.q_type === 4) { next.answers = (cfg.answers || []).join("\n"); next.case_sensitive = !!cfg.case_sensitive; }
  if (q.q_type === 5) { if (cfg.min != null) { next.nMode = "range"; next.nMin = cfg.min; next.nMax = cfg.max; } else { next.nValue = cfg.value; next.nTol = cfg.tolerance || 0; } }
  if (q.q_type === 6 || q.q_type === 7) next.modelAnswer = cfg.model_answer || "";
  if (q.q_type === 8) {
    const L = o.filter((x) => x.side === "L").sort((a, b) => a.pos - b.pos), R = o.filter((x) => x.side === "R");
    next.pairs = L.map((l) => ({ l, r: R.find((x) => x.pair_key === l.pair_key) || emptyOpt() }));
    const used = new Set(L.map((l) => l.pair_key));
    next.extras = R.filter((x) => !used.has(x.pair_key));
  }
  return next;
};

// quick client-side check used by the import review (the server validates again on save)
export const validateForm = (f) => {
  const t = Number(f.q_type); const has = (x) => (x.text || "").trim() || x.image_asset_id || x.pending_src;
  if (!(f.body || "").trim() && !(f.body_images || []).length) return "Question text is empty";
  if (t === 1 || t === 2) {
    const o = f.options.filter(has);
    if (o.length < 2) return "Needs at least 2 options";
    const n = o.filter((x) => x.is_correct).length;
    if (t === 1 && n !== 1) return "Mark exactly one correct option";
    if (t === 2 && n < 1) return "Mark at least one correct option";
  } else if (t === 4) { if (!f.answers.split("\n").some((s) => s.trim())) return "No accepted answer"; }
  else if (t === 5) { if (f.nMode === "range" ? !(Number.isFinite(Number(f.nMin)) && Number.isFinite(Number(f.nMax)) && f.nMin !== "" && f.nMax !== "") : !(f.nValue !== "" && Number.isFinite(Number(f.nValue)))) return "Numeric answer is missing"; }
  else if (t === 8) {
    if (f.pairs.length < 2) return "Needs at least 2 pairs";
    if (f.pairs.some((p) => !has(p.l) || !has(p.r))) return "Every pair needs a left and a right item";
  }
  const m = Number(f.marks); if (t !== 9 && !(m >= 0 && m <= 100)) return "Marks must be 0 to 100";
  return null;
};
