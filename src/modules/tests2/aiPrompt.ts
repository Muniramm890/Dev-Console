// @ts-nocheck
// Quick Test 2.0 - the prompt a teacher gives to ChatGPT / Gemini / Claude. The answer pastes straight into "Import from code".
export const buildAiPrompt = ({ classNames = [], subjectNames = [] } = {}) => {
  const classes = classNames.length ? classNames.join(", ") : "Class 8";
  const subjects = subjectNames.length ? subjectNames.join(", ") : "Mathematics";
  return `You are an expert teacher who writes school test papers. Create the test described at the end of this message.

OUTPUT RULES
- Reply with ONE code block of plain JavaScript data and nothing else (no explanation before or after).
- The block has exactly two parts: const testDetails = {...}; and const mockQuestions = [...];
- Use "double quotes" for all text. Never use backticks. No trailing explanations inside strings.
- Write maths in LaTeX between $ signs and DOUBLE every backslash, e.g. "Solve $\\\\frac{x}{2} = 4$".
- Questions must be correct, clear and suitable for the class. Add a short explanation for every question.

const testDetails = {
  testName: "Chapter 3 - Linear Equations",
  className: "Class 8",            // choose exactly one of: ${classes}
  subject: "Mathematics",          // choose exactly one of: ${subjects}
  chapterNumber: "3",
  chapterName: "Linear Equations in One Variable",
  duration: 30,                    // minutes
  passMarks: 12,                   // optional
  maxAttempts: 1,                  // optional
  negativeMarking: false,          // optional
  shuffleQuestions: true,          // optional
  shuffleOptions: true,            // optional
  resultVisibility: "immediate",   // immediate | afterClose | manual
  instructions: "Read every question carefully."   // optional
};

const mockQuestions = [
  // MCQ: one correct answer. correct is the option letter (A, B, C, D ...).
  { type: "MCQ", text: "What is $2 + 2$?", options: ["3", "4", "5", "6"], correct: "B", marks: 1, difficulty: 1, topic: "Addition", explanation: "Two plus two is four." },
  // MULTI: several correct answers.
  { type: "MULTI", text: "Which of these are prime numbers?", options: ["2", "4", "5", "9"], correct: ["A", "C"], marks: 2, partial: true, explanation: "2 and 5 have no other factors." },
  // TF: True / False.
  { type: "TF", text: "The Sun is a star.", correct: true, marks: 1, explanation: "The Sun is a star." },
  // FIB: fill in the blank, list every accepted answer.
  { type: "FIB", text: "The capital of India is ____.", answers: ["New Delhi", "Delhi"], marks: 1 },
  // NUM: numeric answer, with tolerance (or min and max).
  { type: "NUM", text: "Value of pi up to two decimals?", value: 3.14, tolerance: 0.01, marks: 1 },
  // SHORT / LONG: written answers that the teacher marks. modelAnswer is only for the teacher.
  { type: "SHORT", text: "Define a variable.", modelAnswer: "A symbol that stands for an unknown number.", marks: 2 },
  { type: "LONG", text: "Explain how to solve $2x + 3 = 11$.", modelAnswer: "Subtract 3 then divide by 2: x = 4.", marks: 5 },
  // MATCH: pairs (left, right). extras are wrong right-side items (optional).
  { type: "MATCH", text: "Match the following", pairs: [{ left: "Triangle", right: "3 sides" }, { left: "Square", right: "4 sides" }], extras: ["5 sides"], marks: 2 },
  // PASSAGE: a reading text with an id; the questions about it say passage: "<id>".
  { type: "PASSAGE", id: "p1", text: "Read the passage: ..." },
  { type: "MCQ", passage: "p1", text: "According to the passage ...", options: ["...", "...", "...", "..."], correct: "A", marks: 1 }
];

IMAGES (optional)
- Only add an image if you really have a public link: image: "https://..." for a question, or options: [{ text: "A", image: "https://..." }, ...] for options. Never invent links.
- A data:image/png;base64,... string is also accepted.

Now create this test (write the topic, class, subject, number of questions and the mix of question types here):
TOPIC: 
CLASS: 
SUBJECT: 
NUMBER OF QUESTIONS: 
QUESTION TYPES: `;
};
