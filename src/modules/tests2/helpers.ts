// @ts-nocheck
// Quick Test 2.0 - constants and small pure helpers.
export const TYPES = [
  { id: 1, label: "Single choice (MCQ)", short: "MCQ" },
  { id: 2, label: "Multiple correct", short: "Multi" },
  { id: 3, label: "True / False", short: "T/F" },
  { id: 4, label: "Fill in the blank", short: "Fill" },
  { id: 5, label: "Numeric answer", short: "Numeric" },
  { id: 6, label: "Short answer (manual marking)", short: "Short" },
  { id: 7, label: "Long answer (manual marking)", short: "Long" },
  { id: 8, label: "Match the following", short: "Match" },
  { id: 9, label: "Passage (reading text)", short: "Passage" },
];
export const typeShort = (id) => (TYPES.find((t) => t.id === id) || {}).short || "Q";
export const WRITTEN = [6, 7];

export const STATUS_LABEL = ["Draft", "Live", "Closed", "Archived"];
export const statusColor = (C, s) => [C.yellow, C.green, C.textMuted, C.textMuted][s] || C.textMuted;
export const VIS_LABELS = ["Show result immediately", "Show after the test closes", "Hide until I release"];
export const PROCTOR_LABELS = ["Off", "Track tab switching", "Tab switching + camera snapshots"];
export const EVENT_LABELS = { 1: "Tab switch", 2: "Window blur", 3: "Face missing", 4: "Multiple faces", 5: "Copy / paste", 6: "Left fullscreen" };

export const rows = (r) => { const d = r && r.data !== undefined ? r.data : r; return Array.isArray(d) ? d : Array.isArray(d && d.items) ? d.items : []; };
export const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

const pad = (n) => String(n).padStart(2, "0");
export const fmtDT = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "-");
export const toLocalInput = (v) => { if (!v) return ""; const d = new Date(v); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
export const mmss = (sec) => (sec == null ? "-" : `${Math.floor(sec / 60)}m ${pad(sec % 60)}s`);
export const mb = (bytes) => `${(Number(bytes || 0) / 1048576).toFixed(1)} MB`;

// ── CSV (paste / file) ──────────────────────────────────────────────────────
// ---------------------------------------------------------------------------------------------------------------
// Bulk import (CSV / Excel paste). Two layouts are understood:
//  1) with a header row (any column order): question, option_a .. option_f, correct, marks, negative_marks, difficulty, topic, explanation, type
//  2) without a header (old format):        Question | A | B | C | D | Correct | Marks | Topic | Explanation
// ---------------------------------------------------------------------------------------------------------------
const detectDelim = (text) => {
  const first = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((l) => l.trim()) || "";
  if (first.includes("\t")) return "\t";
  return first.split(";").length > first.split(",").length ? ";" : ",";
};

export const parseCsv = (text) => {
  text = String(text || "").replace(/^\uFEFF/, "");
  const delim = detectDelim(text);
  const out = []; let row = [], cur = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false; } else cur += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((c) => c.trim() !== "")) out.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some((c) => c.trim() !== "")) out.push(row);
  return out;
};

const norm = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const COL_NAMES = {
  question: ["question", "q", "question_text", "body"],
  a: ["option_a", "a", "opt_a", "option_1"], b: ["option_b", "b", "opt_b", "option_2"], c: ["option_c", "c", "opt_c", "option_3"],
  d: ["option_d", "d", "opt_d", "option_4"], e: ["option_e", "e", "opt_e", "option_5"], f: ["option_f", "f", "opt_f", "option_6"],
  correct: ["correct", "answer", "correct_answer", "correct_option"], marks: ["marks", "mark", "score"],
  negative: ["negative_marks", "negative", "neg_marks"], difficulty: ["difficulty", "level"], topic: ["topic", "chapter"],
  explanation: ["explanation", "solution", "hint"], type: ["type", "question_type"],
};
const POSITIONAL = { question: 0, a: 1, b: 2, c: 3, d: 4, correct: 5, marks: 6, topic: 7, explanation: 8 };
const OPT_KEYS = ["a", "b", "c", "d", "e", "f"];

const headerMap = (row) => {
  const map = {}; let hits = 0;
  row.forEach((cell, idx) => {
    const n = norm(cell);
    for (const [key, names] of Object.entries(COL_NAMES)) if (names.includes(n) && map[key] === undefined) { map[key] = idx; hits++; break; }
  });
  return map.question !== undefined && hits >= 4 ? map : null;
};

const DIFF = { easy: 1, medium: 3, hard: 5 };
const TRUE_WORDS = ["true", "t", "yes", "y"], FALSE_WORDS = ["false", "f", "no", "n"];

// returns { questions, errors, counts }. "Row N" is the row number in your file (the header row counts as row 1).
export const csvToQuestions = (text, base) => {
  const data = parseCsv(text);
  const questions = [], errors = [], counts = { single: 0, multi: 0, tf: 0 };
  if (!data.length) return { questions, errors, counts };
  const header = headerMap(data[0]);
  const col = header || POSITIONAL;
  const first = header ? 1 : 0;
  const hasLegacyHeader = !header && /^question/i.test((data[0][0] || "").trim());
  data.forEach((r, i) => {
    if (i < first || (hasLegacyHeader && i === 0)) return;
    const n = i + 1;
    const get = (k) => (col[k] === undefined ? "" : String(r[col[k]] ?? "").trim());
    const body = get("question");
    if (!body) return errors.push(`Row ${n}: question is empty`);
    const typeWord = norm(get("type"));
    let optTexts = OPT_KEYS.map((k) => get(k));
    let filled = optTexts.map((t, idx) => ({ t, idx })).filter((x) => x.t);
    const correct = get("correct");
    let q_type = /^(tf|true_false|truefalse|boolean)$/.test(typeWord) ? 3 : /^(multi|multiple|msq|multiple_correct)$/.test(typeWord) ? 2 : /^(mcq|single|choice|single_correct)$/.test(typeWord) ? 1 : 0;
    if (!q_type && !typeWord && filled.length === 2 && filled.every((x) => [...TRUE_WORDS.slice(0, 1), ...FALSE_WORDS.slice(0, 1)].includes(x.t.toLowerCase())) && new Set(filled.map((x) => x.t.toLowerCase())).size === 2) q_type = 3;

    let options;
    if (q_type === 3) {
      const v = correct.toLowerCase();
      let isTrue = TRUE_WORDS.includes(v) ? true : FALSE_WORDS.includes(v) ? false : null;
      if (isTrue === null && /^[a-f]$/.test(v)) { const picked = optTexts[v.charCodeAt(0) - 97].toLowerCase(); isTrue = TRUE_WORDS.includes(picked) ? true : FALSE_WORDS.includes(picked) ? false : null; }
      if (isTrue === null) return errors.push(`Row ${n}: for a True/False question the correct answer must be True or False`);
      options = [{ text: "True", is_correct: isTrue }, { text: "False", is_correct: !isTrue }];
      counts.tf++;
    } else {
      if (filled.length < 2) return errors.push(`Row ${n}: needs at least 2 options`);
      const letters = [...new Set(correct.toUpperCase().replace(/[^A-F]/g, "").split("").filter(Boolean))];
      if (!letters.length) return errors.push(`Row ${n}: correct answer is missing (use A, B, C ... or A,C for several)`);
      if (letters.some((l) => !optTexts["ABCDEF".indexOf(l)])) return errors.push(`Row ${n}: correct answer must be one of the filled options`);
      if (q_type === 1 && letters.length > 1) return errors.push(`Row ${n}: a single-answer question cannot have ${letters.length} correct answers`);
      if (!q_type) q_type = letters.length > 1 ? 2 : 1;
      options = filled.map((x) => ({ text: x.t, is_correct: letters.includes("ABCDEF"[x.idx]) }));
      if (q_type === 2) counts.multi++; else counts.single++;
    }

    const marksRaw = get("marks"), negRaw = get("negative"), diffRaw = get("difficulty").toLowerCase();
    const marks = marksRaw === "" ? 1 : Number(marksRaw);
    if (!(marks > 0 && marks <= 100)) return errors.push(`Row ${n}: marks must be more than 0 and at most 100`);
    const negative = negRaw === "" ? 0 : Number(negRaw);
    if (!(negative >= 0 && negative <= 100)) return errors.push(`Row ${n}: negative marks must be between 0 and 100`);
    let difficulty = null;
    if (diffRaw !== "") { difficulty = DIFF[diffRaw] || Number(diffRaw); if (!(Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5)) return errors.push(`Row ${n}: difficulty must be 1 to 5 (or easy / medium / hard)`); }

    questions.push({ ...base, q_type, body, marks, ...(negative ? { negative_marks: negative } : {}), ...(difficulty ? { difficulty } : {}),
      topic: get("topic") || base.topic || undefined, explanation: get("explanation") || undefined, options, source_row: n });
  });
  return { questions, errors, counts };
};

// A stable id for a question, so importing the same file twice never creates duplicates (the server skips known ones)
const cyrb = (str, seed) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0"); };
export const questionRef = async (q) => {
  const t = (v) => String(v || "").toLowerCase().replace(/\s+/g, " ").trim();
  const canon = [q.subject_id || "", q.grade_id || "", q.q_type, t(q.body), ...q.options.map((o) => `${t(o.text)}|${o.is_correct ? 1 : 0}`)].join("\n");
  let hex = "";
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canon));
    hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch { hex = cyrb(canon, 1) + cyrb(canon, 2) + cyrb(canon, 3); }
  return `csv:${hex.slice(0, 36)}`; // 40 characters, the size of the legacy_ref column
};

export const TEMPLATE_ROWS = [
  ["question", "option_a", "option_b", "option_c", "option_d", "option_e", "option_f", "correct", "marks", "negative_marks", "difficulty", "topic", "explanation", "type"],
  ["What is 2 + 2?", "3", "4", "5", "6", "", "", "B", "1", "0", "1", "Arithmetic", "Two plus two is four.", "mcq"],
  ["Which of these are prime numbers? (select all)", "2", "9", "11", "15", "", "", "A,C", "2", "0", "2", "Number System", "2 and 11 are prime.", "multi"],
  ["The Earth revolves around the Sun.", "", "", "", "", "", "", "True", "1", "0", "1", "Solar System", "One revolution takes about 365 days.", "tf"],
];

export const downloadCsv = (name, table) => {
  const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob([table.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};
