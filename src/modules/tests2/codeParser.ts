// @ts-nocheck
// Quick Test 2.0 - "Import from code": reads `const testDetails = {...}; const mockQuestions = [...];` (as produced by an AI tool)
// as DATA (JSON5) - the pasted text is never executed - and turns every question into the SAME form state the manual editor uses.
import JSON5 from "json5";
import { blankForm, emptyOpt } from "./questionForm";

// ── reading the pasted text ─────────────────────────────────────────────────
const matchClose = (s, i) => {
  let depth = 0;
  for (let k = i; k < s.length; k++) {
    const ch = s[k];
    if (ch === '"' || ch === "'" || ch === "`") { const q = ch; k++; while (k < s.length && s[k] !== q) { if (s[k] === "\\") k++; k++; } continue; }
    if (ch === "/" && s[k + 1] === "/") { while (k < s.length && s[k] !== "\n") k++; continue; }
    if (ch === "/" && s[k + 1] === "*") { const e = s.indexOf("*/", k + 2); if (e < 0) return -1; k = e + 1; continue; }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") { depth--; if (depth === 0) return k; }
  }
  return -1;
};
const extract = (src, name) => {
  const m = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*`).exec(src);
  if (!m) return null;
  const start = m.index + m[0].length;
  if (src[start] !== "{" && src[start] !== "[") return null;
  const end = matchClose(src, start);
  return end < 0 ? null : src.slice(start, end + 1);
};
// template literals (backticks) become normal strings, kept raw so LaTeX backslashes survive
const lit = (text) => JSON5.parse(text.replace(/`([^`]*)`/g, (m, t) => (t.includes("${") ? m : JSON.stringify(t))));

// LaTeX typed with a single backslash inside "..." turns into control characters (\f \t \b \r \v): put the backslash back
const fixStr = (s) => (typeof s !== "string" ? s : s
  .replace(/\u000c(?=rac|orall|ootnote)/g, "\\f").replace(/\t(?=imes|heta|ext|au\b|an\b|riangle|ilde|o\b|op\b)/g, "\\t")
  .replace(/\u0008(?=eta|ar\b|ig|egin|inom|oldsymbol|ullet|ecause)/g, "\\b").replace(/\r(?=ho\b|ight|angle|ceil|floor)/g, "\\r")
  .replace(/\u000b(?=ec|ee\b|arphi|arepsilon|artheta|dots|erb)/g, "\\v"));

// ── tolerant field access ───────────────────────────────────────────────────
const normKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
const keyed = (o) => { const out = {}; Object.keys(o || {}).forEach((k) => { out[normKey(k)] = o[k]; }); return out; };
const pick = (L, ...keys) => { for (const k of keys) { const v = L[k]; if (v !== undefined && v !== null && v !== "") return v; } return undefined; };
const str = (v) => (v === undefined || v === null ? "" : fixStr(String(v)).trim());
const bool = (v) => (typeof v === "boolean" ? v : /^(true|yes|y|1|on)$/i.test(String(v || "")));
const numOr = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const LET = "ABCDEFGHIJKLMNO";

// ── images: data URL / raw base64 / http(s) link ────────────────────────────
const sniff = (b64) => (b64.startsWith("iVBOR") ? "png" : b64.startsWith("/9j/") ? "jpeg" : b64.startsWith("UklGR") ? "webp" : b64.startsWith("R0lGOD") ? "gif" : "png");
export const imgSrc = (v) => {
  if (v && typeof v === "object") return imgSrc(v.url || v.src || v.data || v.base64 || v.image);
  const s = String(v || "").trim();
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(s)) return s;
  if (/^https?:\/\/\S+$/i.test(s)) return s;
  const raw = s.replace(/\s+/g, "");
  if (raw.length >= 100 && /^[A-Za-z0-9+/]+=*$/.test(raw)) return `data:image/${sniff(raw)};base64,${raw}`;
  return null;
};
const IMG_MD = /!\[[^\]]*\]\((data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+|https?:\/\/[^)\s]+)\)/gi;
// an image written inside a text as ![](...) is moved out of the text (it is uploaded when the import runs)
const splitInline = (text) => { const imgs = []; const t = String(text || "").replace(IMG_MD, (m, src) => { imgs.push(src); return ""; }); return { text: t.trim(), imgs }; };
const imgList = (v) => (v === undefined || v === null || v === "" ? [] : (Array.isArray(v) ? v : [v]).map(imgSrc).filter(Boolean));

// ── type names ──────────────────────────────────────────────────────────────
const TYPE_MAP = { mcq: 1, single: 1, singlechoice: 1, multi: 2, msq: 2, mca: 2, multiple: 2, multiplechoice: 2, multiplecorrect: 2, tf: 3, truefalse: 3, boolean: 3,
  fib: 4, fill: 4, blank: 4, fillintheblank: 4, num: 5, numeric: 5, numerical: 5, short: 6, shortanswer: 6, sa: 6, long: 7, longanswer: 7, la: 7, desc: 7, descriptive: 7, subjective: 7,
  match: 8, matching: 8, matchthefollowing: 8, mtf: 8, passage: 9, comprehension: 9, para: 9, paragraph: 9 };
const DIFF = { veryeasy: 1, easy: 2, medium: 3, moderate: 3, hard: 4, difficult: 4, veryhard: 5 };

const normOpt = (o) => {
  const L = o && typeof o === "object" && !Array.isArray(o) ? keyed(o) : null;
  const raw = L ? pick(L, "text", "label", "option", "value", "name", "title") : o;
  const split = splitInline(str(raw));
  const own = L ? imgList(pick(L, "image", "img", "imageurl", "src", "picture", "photo")) : [];
  const src = own[0] || split.imgs[0] || null;
  return { ...emptyOpt(), text: split.text, image_url: src, pending_src: src };
};

function resolveCorrect(opts, L, warn) {
  const idx = new Set(); let any = false;
  const add = (i, label) => { any = true; if (i >= 0 && i < opts.length) idx.add(i); else warn(`correct answer "${label}" is not one of the options`); };
  if (L.correctindex !== undefined) [].concat(L.correctindex).forEach((v) => add(Number(v), v)); // 0-based
  const c = pick(L, "correct", "correctanswer", "answer", "ans", "correctoption", "correctoptions", "key", "answers");
  if (c !== undefined) {
    const letters = (s) => /^[A-Za-z](\s*[,&/;]\s*[A-Za-z])+$/.test(s.trim());
    const list = Array.isArray(c) ? c : (typeof c === "string" && letters(c) ? c.split(/[,&/;]/) : [c]);
    for (const v of list) {
      if (typeof v === "number") { add(v - 1, v); continue; }                                       // numbers are 1-based
      const s = str(v);
      const byText = opts.findIndex((o) => o.text && o.text.toLowerCase() === s.toLowerCase());
      if (byText >= 0) { add(byText, s); continue; }
      let m = /^(?:option\s*)?\(?([A-Oa-o])\)?[\s.:)-]*$/i.exec(s) || /^\(?([A-Oa-o])[).:]\s+/.exec(s);
      if (m) { add(LET.indexOf(m[1].toUpperCase()), s); continue; }
      if (/^\d+$/.test(s)) { add(Number(s) - 1, s); continue; }
      warn(`could not match the correct answer "${s.slice(0, 40)}"`);
    }
  }
  return { idx, any };
}

// one pasted question -> { form, warnings } where form is exactly what the manual editor holds
export function rawToDraft(raw, n) {
  const warnings = []; const warn = (m) => warnings.push(m);
  const L = keyed(raw);
  const f = blankForm(1, {});
  f.body_images = []; f.explanation_images = [];

  // type
  let t = TYPE_MAP[normKey(pick(L, "type", "qtype", "questiontype", "kind") || "")];
  const optsRaw = pick(L, "options", "choices", "opts");
  const pairsRaw = pick(L, "pairs", "matches", "match");
  const correctRaw = pick(L, "correct", "correctanswer", "answer", "ans");
  if (!t) {
    if (pairsRaw) t = 8;
    else if (Array.isArray(optsRaw) && optsRaw.length) t = (Array.isArray(correctRaw) && correctRaw.length > 1) || (typeof correctRaw === "string" && /^[A-Da-d]\s*[,&/;]\s*[A-Da-d]/.test(correctRaw)) ? 2 : 1;
    else if (typeof correctRaw === "boolean" || /^(true|false)$/i.test(String(correctRaw || ""))) t = 3;
    else if (pick(L, "answers", "blanks") || /_{3,}/.test(String(pick(L, "text", "question", "body", "q") || ""))) t = 4;
    else if (typeof correctRaw === "number" || pick(L, "value", "min")) t = 5;
    else t = 7; // the old format's DESC
  }
  f.q_type = t;

  // text + question images
  const bodySplit = splitInline(str(pick(L, "text", "question", "body", "q", "title", "stem")));
  f.body = bodySplit.text;
  f.body_images = [...imgList(pick(L, "image", "img", "imageurl", "figure", "diagram", "picture", "images")), ...bodySplit.imgs];
  if (!f.body && !f.body_images.length) warn("question text is empty");
  const exSplit = splitInline(str(pick(L, "explanation", "solution", "exp", "reason", "rationale")));
  f.explanation = exSplit.text; f.explanation_images = [...imgList(pick(L, "explanationimage", "solutionimage")), ...exSplit.imgs];

  // marks, topic, difficulty
  f.marks = t === 9 ? 0 : numOr(pick(L, "marks", "mark", "points", "score"), t === 7 ? 3 : t === 6 ? 2 : 1);
  f.negative_marks = t === 9 ? 0 : numOr(pick(L, "negativemarks", "negative", "neg", "penalty"), 0);
  f.topic = str(pick(L, "topic", "chapter", "concept", "tag"));
  const d = pick(L, "difficulty", "level");
  if (d !== undefined) { const dv = Number.isFinite(Number(d)) ? Number(d) : DIFF[normKey(d)]; if (dv >= 1 && dv <= 5) f.difficulty = String(Math.round(dv)); }
  f.partial = bool(pick(L, "partial", "partialmarks"));

  if (t === 1 || t === 2) {
    let opts = (Array.isArray(optsRaw) ? optsRaw : []).map(normOpt).filter((o) => o.text || o.pending_src);
    if (opts.length > 15) { opts = opts.slice(0, 15); warn("only the first 15 options were kept"); }
    if (opts.length < 2) warn("needs at least 2 options");
    const { idx, any } = resolveCorrect(opts, L, warn);
    if (!any) warn("no correct answer given");
    if (t === 1 && idx.size > 1) { f.q_type = 2; warn("several correct answers found: converted to Multiple correct"); }
    if (f.q_type === 2 && idx.size === 1 && !pick(L, "type", "qtype", "questiontype")) f.q_type = 1;
    opts.forEach((o, i) => { o.is_correct = idx.has(i); });
    f.options = opts.length ? opts : f.options;
  } else if (t === 3) {
    const v = pick(L, "correct", "correctanswer", "answer", "ans");
    if (v === undefined) warn("no correct answer given (True assumed)");
    f.tf = v === undefined ? true : typeof v === "boolean" ? v : /^(true|t|yes|y|1)$/i.test(String(v).trim());
  } else if (t === 4) {
    const a = pick(L, "answers", "blanks", "correct", "correctanswer", "answer", "ans");
    const list = Array.isArray(a) ? a : (a === undefined ? [] : String(a).split(/\s*\|\s*|\s*;\s*|\n/));
    f.answers = list.map(str).filter(Boolean).join("\n");
    f.case_sensitive = bool(pick(L, "casesensitive"));
    if (!f.answers) warn("no accepted answer given");
  } else if (t === 5) {
    const mn = pick(L, "min"), mx = pick(L, "max"), rg = pick(L, "range");
    if (Array.isArray(rg) && rg.length === 2) { f.nMode = "range"; f.nMin = rg[0]; f.nMax = rg[1]; }
    else if (mn !== undefined && mx !== undefined) { f.nMode = "range"; f.nMin = mn; f.nMax = mx; }
    else { const v = pick(L, "value", "correct", "correctanswer", "answer", "ans"); f.nValue = v === undefined ? "" : String(v).replace(/,/g, ""); f.nTol = String(numOr(pick(L, "tolerance", "tol", "error"), 0)); }
    if (f.nMode === "value" && !Number.isFinite(Number(f.nValue))) warn("numeric answer is missing");
  } else if (t === 6 || t === 7) {
    f.modelAnswer = str(pick(L, "modelanswer", "rubric", "answer", "correct", "correctanswer", "markingscheme", "hint"));
  } else if (t === 8) {
    const norm = (p) => {
      if (Array.isArray(p)) return { l: normOpt(p[0]), r: normOpt(p[1]) };
      const K = keyed(p); return { l: normOpt(pick(K, "left", "l", "a", "item", "term") ?? ""), r: normOpt(pick(K, "right", "r", "b", "match", "definition") ?? "") };
    };
    f.pairs = (Array.isArray(pairsRaw) ? pairsRaw : []).map(norm);
    const leftArr = pick(L, "left", "leftitems", "columna"), rightArr = pick(L, "right", "rightitems", "columnb");
    if (!f.pairs.length && Array.isArray(leftArr) && Array.isArray(rightArr)) f.pairs = leftArr.map((l, i) => ({ l: normOpt(l), r: normOpt(rightArr[i] ?? "") }));
    f.extras = (Array.isArray(pick(L, "extras", "distractors", "extraright", "extrarightitems")) ? pick(L, "extras", "distractors", "extraright", "extrarightitems") : []).map(normOpt);
    if (f.pairs.length < 2) warn("match needs at least 2 pairs");
    if (f.pairs.length > 15) { f.pairs = f.pairs.slice(0, 15); warn("only the first 15 pairs were kept"); }
  }

  // passages: a PASSAGE item has an id, the questions about it carry passage: "<id>"
  const cid = pick(L, "id", "passageid", "key");
  if (t === 9 && cid !== undefined) f.client_id = String(cid);
  const ref = pick(L, "passage", "passageref", "passageid", "belongsto");
  if (t !== 9 && ref !== undefined) f.passage_ref = String(ref);
  return { form: f, warnings, index: n };
}

// ── test details ────────────────────────────────────────────────────────────
const VIS = { immediate: 0, now: 0, afterclose: 1, afterthetestcloses: 1, manual: 2, hidden: 2, release: 2 };
const PROC = { off: 0, none: 0, tab: 1, tabs: 1, tabswitch: 1, camera: 2, snapshot: 2, video: 2 };
const dt = (v) => { if (!v) return ""; const d = new Date(String(v).replace(" ", "T")); if (isNaN(d.getTime())) return ""; const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
export function normalizeMeta(m) {
  const L = keyed(m);
  const num = (...k) => { const v = pick(L, ...k); return v === undefined ? "" : String(numOr(v, "")); };
  const vis = pick(L, "resultvisibility", "results", "showresults"); const pr = pick(L, "proctoring");
  return {
    title: str(pick(L, "testname", "title", "name", "test", "mocknumber")), className: str(pick(L, "classname", "class", "grade", "standard")), subject: str(pick(L, "subject", "subjectname")),
    chapter_no: str(pick(L, "chapternumber", "chapterno", "chapternum")), chapter_name: str(pick(L, "chaptername", "chapter", "topic")), instructions: str(pick(L, "instructions", "description", "note")),
    duration_min: num("duration", "durationmin", "time", "minutes") || "30", pass_marks: num("passmarks", "passingmarks", "pass"), max_attempts: num("maxattempts", "attempts") || "1",
    negative_marking: bool(pick(L, "negativemarking", "negative")), shuffle_questions: bool(pick(L, "shufflequestions", "shuffle")), shuffle_options: bool(pick(L, "shuffleoptions")),
    result_visibility: typeof vis === "number" ? Math.max(0, Math.min(2, vis)) : (VIS[normKey(vis || "")] ?? 0), proctoring: typeof pr === "number" ? Math.max(0, Math.min(2, pr)) : (PROC[normKey(pr || "")] ?? 0),
    starts_at: dt(pick(L, "startsat", "starttime", "opensat", "start")), ends_at: dt(pick(L, "endsat", "endtime", "closesat", "end")),
    sections: [].concat(pick(L, "sections", "section") || []).map(str).filter(Boolean),
  };
}

// ── names -> ids ────────────────────────────────────────────────────────────
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
export const normClass = (s) => { let t = String(s || "").toLowerCase().trim().replace(/\b(class|grade|std|standard)\b/g, "").replace(/[^a-z0-9]/g, ""); t = t.replace(/^(\d+)(st|nd|rd|th)$/, "$1"); return ROMAN[t] ? String(ROMAN[t]) : t; };
const SUBJ = { maths: "mathematics", math: "mathematics", sci: "science", sst: "socialscience", socialstudies: "socialscience", eng: "english", hin: "hindi", cs: "computerscience", gk: "generalknowledge" };
export const normSubject = (s) => { const t = String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); return SUBJ[t] || t; };
export const matchClass = (grades, name) => { const n = normClass(name); return n ? (grades.find((g) => normClass(g.name) === n) || null) : null; };
export const matchSubject = (subjects, name) => { const n = normSubject(name); return n ? (subjects.find((s) => normSubject(s.name) === n) || subjects.find((s) => normSubject(s.name).startsWith(n) || n.startsWith(normSubject(s.name))) || null) : null; };

// ── entry point ─────────────────────────────────────────────────────────────
export function parseCode(raw) {
  const src = String(raw || "").replace(/^\s*```[a-zA-Z]*\s*$/gm, "").trim();
  if (!src) throw new Error("Paste the code first.");
  let metaRaw = null, qs = null;
  try {
    const d = extract(src, "testDetails") || extract(src, "testdetails") || extract(src, "details");
    const q = extract(src, "mockQuestions") || extract(src, "questions") || extract(src, "mockquestions");
    if (q) { qs = lit(q); metaRaw = d ? lit(d) : {}; }
    else { // plain JSON / JSON5: an array, or { testDetails, questions }
      const all = lit(src);
      if (Array.isArray(all)) { qs = all; metaRaw = {}; }
      else { const K = keyed(all); qs = K.questions || K.mockquestions; metaRaw = K.testdetails || K.details || K.meta || {}; }
    }
  } catch (e) { throw new Error(`The code could not be read: ${String(e.message || e).split("\n")[0]}\n\nCheck commas, brackets and quotes. Use "double quotes" for text and write LaTeX with double backslashes.`); }
  if (!Array.isArray(qs) || !qs.length) throw new Error("No questions found. Expected const mockQuestions = [ ... ];");
  if (qs.length > 400) throw new Error("Too many questions in one paste (max 400). Split the code in two.");
  const drafts = qs.map((q, i) => {
    if (!q || typeof q !== "object") return { key: i, include: true, form: blankForm(1, {}), warnings: ["not a question object"], index: i };
    const r = rawToDraft(q, i);
    return { key: i, include: true, ...r };
  });
  return { meta: normalizeMeta(metaRaw || {}), drafts };
}
