// Builds the Livestream vision prototype deck: what the teacher sees and what the student sees.
// Run: NODE_PATH=<folder with pptxgenjs> node build_deck.js <path to pptx skill apply_theme.js>
// All class numbers in the deck are made up for illustration.

const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.argv[2]);

const OUT = path.join(__dirname, "Livestream-Prototype.pptx");

const THEME = {
  name: "YouPass Live",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1A1B2E", // ink
    lt1: "FFFFFF",
    dk2: "55597A", // slate
    lt2: "F2F1F8", // pale lavender
    accent1: "5B3DF5", // violet: brand
    accent2: "E8394D", // live red: confusion, alerts
    accent3: "13955F", // green: understand, correct
    accent4: "E39A12", // amber: hints, Gợi ý
    accent5: "9A97B5", // muted
    accent6: "1FA2C8", // teal: second series
    hlink: "5B3DF5",
    folHlink: "7A62F7",
  },
};
const HX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "YouPass Live: vision prototype";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const S = pres.shapes;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.7, w: 11.7, h: 1.3, fontSize: 54, bold: true, align: "left", color: C.background1, valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.15, w: 11.7, h: 1.0, fontSize: 22, color: C.accent5, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "MOCK",
  background: { color: C.background2 },
  margin: [0.5, 0.5, 0.5, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 12.3, h: 0.65, fontSize: 32, bold: true, align: "left", color: C.text1, valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.5, y: 0.95, w: 12.3, h: 0.4, fontSize: 16, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Mock-up · all class numbers are made up", options: { x: 0.5, y: 7.08, w: 6, h: 0.3, fontSize: 10, color: C.text2, margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 7.08, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" },
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 12.3, h: 0.65, fontSize: 32, bold: true, align: "left", color: C.text1, valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.5, y: 0.95, w: 12.3, h: 0.4, fontSize: 16, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.3, y: 7.08, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" },
});
pres.defineSlideMaster({
  title: "CLOSING_DARK",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.45, w: 12.3, h: 0.75, fontSize: 36, bold: true, align: "left", color: C.background1, valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.5, y: 1.2, w: 12.3, h: 0.45, fontSize: 18, color: C.accent5, valign: "middle", margin: 0 }, text: "" } },
  ],
});

// ---------- small helpers ----------
const shadow = () => ({ type: "outer", color: "1A1B2E", opacity: 0.12, blur: 8, offset: 2, angle: 90 });
const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, fontSize: 12, color: C.text1, valign: "top" }, o));
const box = (s, o) => s.addShape(S.ROUNDED_RECTANGLE, Object.assign({ rectRadius: 0.08, line: { color: C.background1, width: 0 } }, o));
const tint = (color, t = 88) => ({ color, transparency: t });

function header(s, title, sub) {
  s.addText(title, { placeholder: "title" });
  s.addText(sub, { placeholder: "body" });
}

function columnLabels(s) {
  T(s, "WHAT THE STUDENT SEES", { x: 0.75, y: 1.45, w: 3.2, h: 0.28, fontSize: 11, bold: true, color: C.accent1, charSpacing: 1, objectName: "Label: student" });
  T(s, "WHAT THE TEACHER SEES", { x: 4.45, y: 1.45, w: 6, h: 0.28, fontSize: 11, bold: true, color: C.accent1, charSpacing: 1, objectName: "Label: teacher" });
}

// Phone: content area runs x 1.02..3.58, y 2.05..6.75
function phone(s, step, live = true) {
  s.addShape(S.ROUNDED_RECTANGLE, { x: 0.75, y: 1.8, w: 3.1, h: 5.15, rectRadius: 0.35, fill: { color: C.text1 }, line: { color: C.text1, width: 0 }, shadow: shadow(), objectName: "Phone frame" });
  s.addShape(S.ROUNDED_RECTANGLE, { x: 0.87, y: 1.92, w: 2.86, h: 4.91, rectRadius: 0.25, fill: { color: C.background1 }, line: { color: C.background1, width: 0 }, objectName: "Phone screen" });
  if (live) {
    box(s, { x: 1.02, y: 2.08, w: 0.62, h: 0.24, rectRadius: 0.12, fill: { color: C.accent2 }, objectName: "Live pill" });
    T(s, "● LIVE", { x: 1.02, y: 2.08, w: 0.62, h: 0.24, fontSize: 10, bold: true, color: C.background1, align: "center", valign: "middle" });
  }
  if (step) T(s, step, { x: 2.08, y: 2.08, w: 1.5, h: 0.24, fontSize: 10, color: C.text2, align: "right", valign: "middle" });
}

// Confusion toggle at the bottom of the phone; state "u" (understand) or "d" (don't understand)
function toggle(s, state) {
  const y = 6.3, h = 0.4, x = 1.02, w = 2.56;
  box(s, { x, y, w, h, rectRadius: 0.2, fill: { color: C.background2 }, objectName: "Confusion toggle" });
  const on = state === "u" ? { x, color: C.accent3 } : { x: x + w / 2, color: C.accent2 };
  box(s, { x: on.x, y, w: w / 2, h, rectRadius: 0.2, fill: { color: on.color }, objectName: "Toggle selected" });
  T(s, "Understand", { x, y, w: w / 2, h, fontSize: 10, bold: true, align: "center", valign: "middle", color: state === "u" ? C.background1 : C.text2 });
  T(s, "Don't understand", { x: x + w / 2, y, w: w / 2, h, fontSize: 10, bold: true, align: "center", valign: "middle", color: state === "d" ? C.background1 : C.text2 });
}

function tutor(s, y, h, label, text) {
  box(s, { x: 1.02, y, w: 2.56, h, fill: tint(C.accent1, 90), objectName: "Tutor bubble" });
  T(s, label, { x: 1.12, y: y + 0.08, w: 2.36, h: 0.22, fontSize: 10, bold: true, color: C.accent1 });
  T(s, text, { x: 1.12, y: y + 0.3, w: 2.36, h: h - 0.36, fontSize: 11 });
}

// Dashboard frame with header row; main area x 4.65..10.55, y 2.6..6.8
function dashboard(s, step) {
  s.addShape(S.ROUNDED_RECTANGLE, { x: 4.45, y: 1.8, w: 8.4, h: 5.15, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: C.background1, width: 0 }, shadow: shadow(), objectName: "Dashboard frame" });
  T(s, "Teacher dashboard", { x: 4.65, y: 1.93, w: 1.9, h: 0.36, fontSize: 13, bold: true, valign: "middle" });
  box(s, { x: 6.55, y: 1.99, w: 0.62, h: 0.24, rectRadius: 0.12, fill: { color: C.accent2 }, objectName: "Live pill" });
  T(s, "● LIVE", { x: 6.55, y: 1.99, w: 0.62, h: 0.24, fontSize: 10, bold: true, color: C.background1, align: "center", valign: "middle" });
  T(s, "1,284 students", { x: 7.27, y: 1.93, w: 1.4, h: 0.36, fontSize: 11, color: C.text2, valign: "middle" });
  for (let i = 1; i <= 6; i++) {
    const x = 8.75 + (i - 1) * 0.36, cur = i === step, done = i < step;
    s.addShape(S.OVAL, { x, y: 1.98, w: 0.27, h: 0.27, fill: cur ? { color: C.accent1 } : done ? tint(C.accent1, 80) : { color: C.background1 }, line: { color: C.accent1, width: 1 }, objectName: `Step ${i} dot` });
    T(s, String(i), { x, y: 1.98, w: 0.27, h: 0.27, fontSize: 10, bold: true, align: "center", valign: "middle", color: cur ? C.background1 : C.accent1 });
  }
  box(s, { x: 11.05, y: 1.95, w: 1.6, h: 0.34, rectRadius: 0.17, fill: { color: C.accent1 }, objectName: "Next step button" });
  T(s, step < 6 ? "Next step →" : "End class", { x: 11.05, y: 1.95, w: 1.6, h: 0.34, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle" });
  s.addShape(S.LINE, { x: 4.6, y: 2.45, w: 8.1, h: 0, line: { color: C.background2, width: 1.5 }, objectName: "Header divider" });
}

// Always-on confusion meter in the dashboard's right column
function meter(s, pct, alert) {
  const x = 10.75, y = 2.6, w = 1.95, h = 4.2;
  box(s, { x, y, w, h, fill: alert ? tint(C.accent2, 88) : { color: C.background2 }, objectName: "Confusion meter panel" });
  T(s, "Don't understand", { x: x + 0.15, y: y + 0.15, w: w - 0.3, h: 0.3, fontSize: 12, bold: true });
  T(s, `${pct}%`, { x: x + 0.15, y: y + 0.5, w: w - 0.3, h: 0.85, fontSize: 44, bold: true, color: alert ? C.accent2 : C.text1, valign: "middle" });
  T(s, `${Math.round(1284 * pct / 100)} students right now`, { x: x + 0.15, y: y + 1.38, w: w - 0.3, h: 0.25, fontSize: 10, color: C.text2 });
  const bx = x + 0.15, bw = w - 0.3, by = y + 1.8;
  box(s, { x: bx, y: by, w: bw, h: 0.16, rectRadius: 0.08, fill: { color: C.background1 }, line: { color: C.accent5, width: 0.75 }, objectName: "Meter track" });
  box(s, { x: bx, y: by, w: Math.max(0.16, bw * pct / 100), h: 0.16, rectRadius: 0.08, fill: { color: alert ? C.accent2 : C.accent3 }, objectName: "Meter fill" });
  s.addShape(S.LINE, { x: bx + bw * 0.3, y: by - 0.08, w: 0, h: 0.32, line: { color: C.text1, width: 1.25, dashType: "dash" }, objectName: "Alert threshold" });
  T(s, "Alert at 30%", { x: bx, y: by + 0.3, w: bw, h: 0.22, fontSize: 10, color: C.text2 });
  if (alert) {
    box(s, { x: bx, y: y + 2.75, w: bw, h: 1.25, fill: { color: C.accent2 }, objectName: "Alert box" });
    T(s, "Too many are lost.\nPause and explain again.", { x: bx + 0.1, y: y + 2.8, w: bw - 0.2, h: 1.15, fontSize: 12, bold: true, color: C.background1, valign: "middle" });
  } else {
    T(s, "Class is following.\nKeep going.", { x: bx, y: y + 2.75, w: bw, h: 0.6, fontSize: 12, bold: true, color: C.accent3 });
  }
}

function card(s, x, y, w, h, o = {}) {
  return box(s, Object.assign({ x, y, w, h, fill: { color: C.background2 } }, o));
}

const chartText = { catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", legendFontFace: "+mn-lt", titleFontFace: "+mn-lt" };

// ===================================================================
// 1. Title
// ===================================================================
pres.addSection({ title: "The idea" });
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "The idea" });
  s.addText("YouPass Live", { placeholder: "title" });
  s.addText("A free IELTS class for thousands, where every student still gets coached", { placeholder: "body" });
  const pills = [["1", "Tap, don't type", "Students answer in seconds"], ["2", "Anonymous", "No fear of looking silly"], ["3", "Coached one step at a time", "AI asks, the student fixes it"]];
  pills.forEach(([n, a, b], i) => {
    const x = 0.8 + i * 4.0;
    s.addShape(S.OVAL, { x, y: 4.75, w: 0.6, h: 0.6, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: `Principle ${n} circle` });
    T(s, n, { x, y: 4.75, w: 0.6, h: 0.6, fontSize: 20, bold: true, color: C.background1, align: "center", valign: "middle" });
    T(s, a, { x: x + 0.8, y: 4.72, w: 3.0, h: 0.35, fontSize: 18, bold: true, color: C.background1 });
    T(s, b, { x: x + 0.8, y: 5.07, w: 3.0, h: 0.35, fontSize: 14, color: C.accent5 });
  });
  T(s, "Vision prototype · Lesson 1: Writing Task 2, developing ideas", { x: 0.8, y: 6.7, w: 8, h: 0.3, fontSize: 12, color: C.accent5 });
  s.addNotes("The problem: a free class is huge, so one teacher can't look after everyone, and a talking-head stream is boring. The answer: the teacher teaches the crowd, every student answers with a tap, and AI coaches each student one step at a time. Three principles: tap don't type, anonymous, coached one step at a time.");
}

// ===================================================================
// 2. Big picture
// ===================================================================
{
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "The idea" });
  header(s, "One class, three moments", "Before, during and after every livestream");
  const col = (x, w, n, title, sub) => {
    s.addShape(S.ROUNDED_RECTANGLE, { x, y: 1.65, w, h: 5.2, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: C.background1, width: 0 }, shadow: shadow(), objectName: `${title} card` });
    s.addShape(S.OVAL, { x: x + 0.25, y: 1.9, w: 0.5, h: 0.5, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: `${title} number` });
    T(s, n, { x: x + 0.25, y: 1.9, w: 0.5, h: 0.5, fontSize: 18, bold: true, color: C.background1, align: "center", valign: "middle" });
    T(s, title, { x: x + 0.9, y: 1.88, w: w - 1.1, h: 0.32, fontSize: 20, bold: true });
    T(s, sub, { x: x + 0.9, y: 2.2, w: w - 1.1, h: 0.28, fontSize: 13, color: C.text2 });
  };
  col(0.5, 3.2, "1", "Before", "~10 minutes");
  col(4.2, 5.1, "2", "During", "~1 hour, live");
  col(9.8, 3.03, "3", "After", "automatic");
  const arrow = (x) => s.addShape(S.RIGHT_ARROW, { x, y: 4.05, w: 0.36, h: 0.4, fill: { color: C.accent5 }, line: { color: C.accent5, width: 0 }, objectName: "Flow arrow" });
  arrow(3.77); arrow(9.37);

  // Before
  card(s, 0.75, 2.75, 2.7, 3.85, { fill: tint(C.accent1, 92) });
  T(s, "Lesson builder", { x: 0.95, y: 2.9, w: 2.3, h: 0.32, fontSize: 16, bold: true, color: C.accent1 });
  T(s, [
    { text: "Teacher pastes a new essay prompt", options: { bullet: true, breakLine: true } },
    { text: "AI drafts the ideas, model sentences and likely mistakes", options: { bullet: true, breakLine: true } },
    { text: "Teacher checks and approves", options: { bullet: true } },
  ], { x: 0.95, y: 3.3, w: 2.35, h: 3.1, fontSize: 14, paraSpaceAfter: 8 });

  // During: a loop of four
  const node = (x, y, title, text, color) => {
    card(s, x, y, 2.15, 1.55, { fill: tint(color, 88) });
    T(s, title, { x: x + 0.15, y: y + 0.12, w: 1.9, h: 0.3, fontSize: 14, bold: true, color });
    T(s, text, { x: x + 0.15, y: y + 0.45, w: 1.9, h: 1.0, fontSize: 12 });
  };
  node(4.45, 2.75, "Teacher", "Teaches on the stream", C.accent1);
  node(6.95, 2.75, "Students", "Tap or write on their phone", C.accent6);
  node(6.95, 5.05, "AI tutor", "Coaches each student, one question at a time", C.accent4);
  node(4.45, 5.05, "Dashboard", "Shows the teacher what the class needs", C.accent2);
  const line = (o) => s.addShape(S.LINE, Object.assign({ line: { color: C.text2, width: 2, endArrowType: "triangle" }, objectName: "Loop arrow" }, o));
  line({ x: 6.62, y: 3.52, w: 0.31, h: 0 });
  line({ x: 8.02, y: 4.32, w: 0, h: 0.7 });
  line({ x: 6.64, y: 5.82, w: 0.29, h: 0, flipH: true });
  line({ x: 5.52, y: 4.32, w: 0, h: 0.7, flipV: true });

  // After
  card(s, 10.05, 2.75, 2.53, 3.85, { fill: tint(C.accent3, 90) });
  T(s, "Recap page", { x: 10.25, y: 2.9, w: 2.2, h: 0.32, fontSize: 16, bold: true, color: C.accent3 });
  T(s, [
    { text: "One page per student, by anh Đậu", options: { bullet: true, breakLine: true } },
    { text: "Their side, sentences and paragraph", options: { bullet: true, breakLine: true } },
    { text: "The one mistake to remember", options: { bullet: true } },
  ], { x: 10.25, y: 3.3, w: 2.2, h: 3.1, fontSize: 14, paraSpaceAfter: 8 });
  s.addNotes("Before class the teacher spends about ten minutes in the lesson builder. During class it's a loop: the teacher teaches, students respond on their phones, the AI tutor coaches each of them, and the dashboard tells the teacher what the class needs next. After class every student automatically gets their own recap page, built with the existing anh Đậu tool.");
}

// ===================================================================
// 3. Before class: lesson builder
// ===================================================================
pres.addSection({ title: "Before class" });
{
  const s = pres.addSlide({ masterName: "MOCK", sectionTitle: "Before class" });
  header(s, "Before class: the lesson builder", "Same teaching framework every class. Only the essay prompt changes, so prep takes ~10 minutes");
  s.addShape(S.ROUNDED_RECTANGLE, { x: 0.5, y: 1.55, w: 12.33, h: 5.35, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: C.background1, width: 0 }, shadow: shadow(), objectName: "Builder frame" });
  T(s, "1. Paste the essay prompt", { x: 0.8, y: 1.8, w: 3.9, h: 0.32, fontSize: 16, bold: true });
  card(s, 0.8, 2.25, 3.9, 2.3, { line: { color: C.accent5, width: 1 }, fill: { color: C.background1 } });
  T(s, "Some people think governments should spend more on public transport, while others think they should build more roads. Discuss both views and give your own opinion.", { x: 0.98, y: 2.4, w: 3.55, h: 2.0, fontSize: 14 });
  box(s, { x: 0.8, y: 4.75, w: 3.9, h: 0.5, rectRadius: 0.25, fill: { color: C.accent1 }, objectName: "Draft button" });
  T(s, "Draft the lesson →", { x: 0.8, y: 4.75, w: 3.9, h: 0.5, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle" });
  T(s, "The framework stays the same:\npick a side → topic sentence → benefits → Impact / Explain / Example → paragraph", { x: 0.8, y: 5.5, w: 3.9, h: 1.1, fontSize: 12, color: C.text2 });

  T(s, "2. Check what AI drafted, then approve", { x: 5.1, y: 1.8, w: 7.4, h: 0.32, fontSize: 16, bold: true });
  const items = [
    ["Two sides", "Public transport  ·  More roads", true],
    ["Gợi ý ideas", "4 per side, e.g. “cuts traffic jams”, “cleaner air”", true],
    ["Model topic sentences", "One per side, using the template", true],
    ["Accepted versions of X", "“spending more on public transport”, “investing in buses and trains” …", true],
    ["Model developments", "Impact · Explain · Example, for each side", false],
    ["Expected mistakes", "12 carried over from past classes + 3 new for this topic", false],
  ];
  items.forEach(([a, b, ok], i) => {
    const y = 2.25 + i * 0.73;
    card(s, 5.1, y, 7.45, 0.62, { fill: ok ? tint(C.accent3, 92) : { color: C.background2 } });
    s.addShape(S.OVAL, { x: 5.25, y: y + 0.16, w: 0.3, h: 0.3, fill: ok ? { color: C.accent3 } : { color: C.background1 }, line: { color: ok ? C.accent3 : C.accent5, width: 1.25 }, objectName: "Approve tick" });
    if (ok) T(s, "✓", { x: 5.25, y: y + 0.16, w: 0.3, h: 0.3, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle" });
    T(s, a, { x: 5.75, y: y + 0.08, w: 2.3, h: 0.46, fontSize: 14, bold: true, valign: "middle" });
    T(s, b, { x: 8.1, y: y + 0.08, w: 4.3, h: 0.46, fontSize: 12, color: C.text2, valign: "middle" });
  });
  s.addNotes("Streams run two or three times a week, so prep has to be fast. The teacher pastes a new prompt, the AI drafts all the lesson content, and the teacher only checks and approves. Mistakes carry over between lessons, for example 'in favor of + -ing' comes up every time.");
}

// ===================================================================
// 4-9. During class, step by step
// ===================================================================
pres.addSection({ title: "During class" });

// Step 1: pick a side
{
  const s = pres.addSlide({ masterName: "MOCK", sectionTitle: "During class" });
  header(s, "Step 1 · Pick a side", "One tap. The choice is saved, so the AI tutor knows what each student is writing about");
  columnLabels(s); phone(s, "Step 1 of 5"); dashboard(s, 1);
  T(s, "Which side do you favour?", { x: 1.02, y: 2.45, w: 2.56, h: 0.3, fontSize: 13, bold: true });
  card(s, 1.02, 2.82, 2.56, 1.25);
  T(s, "Study all subjects at school, or only the subjects you are good at or find interesting?", { x: 1.12, y: 2.9, w: 2.36, h: 1.1, fontSize: 11, valign: "middle" });
  box(s, { x: 1.02, y: 4.2, w: 2.56, h: 0.62, rectRadius: 0.12, fill: { color: C.accent1 }, objectName: "Side A (chosen)" });
  T(s, "✓  All subjects", { x: 1.17, y: 4.2, w: 2.3, h: 0.62, fontSize: 13, bold: true, color: C.background1, valign: "middle" });
  box(s, { x: 1.02, y: 4.92, w: 2.56, h: 0.62, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: C.accent1, width: 1.25 }, objectName: "Side B" });
  T(s, "Only subjects I'm good at or like", { x: 1.17, y: 4.92, w: 2.3, h: 0.62, fontSize: 12, bold: true, color: C.accent1, valign: "middle" });
  T(s, "Saved. Your tutor will help you write about this side.", { x: 1.02, y: 5.65, w: 2.56, h: 0.5, fontSize: 10, color: C.text2 });
  toggle(s, "u");

  T(s, "Which side did the class pick?", { x: 4.65, y: 2.6, w: 5.9, h: 0.32, fontSize: 15, bold: true });
  s.addChart(pres.charts.DOUGHNUT, [{ name: "Side", labels: ["All subjects", "Only good / interesting"], values: [62, 38] }], Object.assign({
    x: 4.65, y: 2.95, w: 3.3, h: 3.75, holeSize: 58, chartColors: [HX.accent1, HX.accent6], showPercent: true, showValue: false, showLegend: true, legendPos: "b", legendFontSize: 11, legendColor: HX.dk2,
    dataLabelColor: "FFFFFF", dataLabelFontSize: 13, dataLabelFontBold: true, showTitle: false, objectName: "Side split chart",
  }, chartText));
  T(s, "1,251", { x: 8.15, y: 3.0, w: 2.4, h: 0.7, fontSize: 40, bold: true, color: C.accent1 });
  T(s, "students picked a side in 40 seconds", { x: 8.15, y: 3.7, w: 2.3, h: 0.5, fontSize: 12, color: C.text2 });
  card(s, 8.15, 4.45, 2.4, 2.25, { fill: tint(C.accent1, 92) });
  T(s, "Say on stream", { x: 8.3, y: 4.55, w: 2.1, h: 0.28, fontSize: 11, bold: true, color: C.accent1 });
  T(s, "“62% of you want all subjects. Let's see if you can defend it!”", { x: 8.3, y: 4.88, w: 2.1, h: 1.7, fontSize: 13, italic: true });
  meter(s, 6, false);
  s.addNotes("Students tap a side. The teacher instantly sees the split and can put it on stream as an opening moment. The confusion meter on the right is always on, for the whole lesson.");
}

// Step 2: topic sentence
{
  const s = pres.addSlide({ masterName: "MOCK", sectionTitle: "During class" });
  header(s, "Step 2 · Topic sentence", "Students write one sentence. The tutor gives a hint, not the answer. The teacher sees the top mistake");
  columnLabels(s); phone(s, "Step 2 of 5"); dashboard(s, 2);
  T(s, "Write your topic sentence", { x: 1.02, y: 2.45, w: 2.56, h: 0.3, fontSize: 13, bold: true });
  card(s, 1.02, 2.8, 2.56, 0.78, { fill: tint(C.accent4, 85) });
  T(s, "I am personally in favor of X because it brings about many significant benefits.", { x: 1.12, y: 2.85, w: 2.36, h: 0.68, fontSize: 10, italic: true, valign: "middle" });
  card(s, 1.02, 3.68, 2.56, 0.95, { fill: { color: C.background1 }, line: { color: C.accent5, width: 1 } });
  T(s, [
    { text: "I am personally in favor of " },
    { text: "study", options: { bold: true, color: C.accent2, underline: { style: "wavy", color: C.accent2 } } },
    { text: " all subjects because it brings about many significant benefits." },
  ], { x: 1.12, y: 3.74, w: 2.36, h: 0.85, fontSize: 11, valign: "middle" });
  tutor(s, 4.75, 1.4, "Tutor · hint 1 of 2", "Look at the word right after “of”. What form does a verb take after a preposition?");
  toggle(s, "d");

  T(s, "Mistakes in 1,106 topic sentences", { x: 4.65, y: 2.6, w: 5.9, h: 0.32, fontSize: 15, bold: true });
  s.addChart(pres.charts.BAR, [{ name: "Students", labels: ["“in favor of study”", "Copied the whole prompt", "X doesn't match their side", "Left out “because”", "No mistake"], values: [41, 22, 9, 7, 21] }], Object.assign({
    x: 4.55, y: 2.95, w: 3.65, h: 3.85, barDir: "bar", catAxisOrientation: "maxMin", chartColors: [HX.accent2, HX.accent5, HX.accent5, HX.accent5, HX.accent3],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '0"%"', dataLabelColor: HX.dk1, dataLabelFontSize: 11, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    catAxisLabelColor: HX.dk2, catAxisLabelFontSize: 11, catAxisLineShow: false, barGapWidthPct: 45, showLegend: false, objectName: "Mistake chart",
  }, chartText));
  card(s, 8.3, 2.95, 2.3, 3.85, { fill: tint(C.accent2, 90) });
  T(s, "MOST COMMON", { x: 8.45, y: 3.07, w: 2.0, h: 0.25, fontSize: 10, bold: true, color: C.accent2, charSpacing: 1 });
  T(s, "41% wrote “in favor of study”", { x: 8.45, y: 3.35, w: 2.0, h: 0.8, fontSize: 15, bold: true });
  T(s, "Teach:", { x: 8.45, y: 4.3, w: 2.0, h: 0.25, fontSize: 11, bold: true, color: C.text2 });
  T(s, "in favor of + V-ing\n→ in favor of studying", { x: 8.45, y: 4.55, w: 2.0, h: 0.75, fontSize: 13 });
  T(s, "Example answers:\n“in favor of study all…”\n“in favor of learn…”", { x: 8.45, y: 5.45, w: 2.0, h: 1.2, fontSize: 11, color: C.text2 });
  meter(s, 34, true);
  s.addNotes("Each student writes one sentence. The AI tutor gives a Socratic hint, at most two rounds, then shows a model. The teacher doesn't read 1,000 sentences: the dashboard groups them and names the most common mistake. Here the confusion meter has crossed 30%, so the teacher pauses and explains again.");
}

// Step 3: ideas
{
  const s = pres.addSlide({ masterName: "MOCK", sectionTitle: "During class" });
  header(s, "Step 3 · Ideas", "Students type an idea or tap a Gợi ý. AI groups similar ideas so the teacher sees what the class thinks");
  columnLabels(s); phone(s, "Step 3 of 5"); dashboard(s, 3);
  T(s, "One benefit of studying all subjects?", { x: 1.02, y: 2.45, w: 2.56, h: 0.5, fontSize: 13, bold: true });
  card(s, 1.02, 3.0, 2.56, 0.85, { fill: { color: C.background1 }, line: { color: C.accent1, width: 1.25 } });
  T(s, "Students can find what they are really good at", { x: 1.12, y: 3.06, w: 2.36, h: 0.73, fontSize: 11, valign: "middle" });
  box(s, { x: 2.38, y: 3.95, w: 1.2, h: 0.36, rectRadius: 0.18, fill: { color: C.accent1 }, objectName: "Add idea button" });
  T(s, "Add idea", { x: 2.38, y: 3.95, w: 1.2, h: 0.36, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle" });
  T(s, "Gợi ý · tap to use", { x: 1.02, y: 4.45, w: 2.56, h: 0.26, fontSize: 11, bold: true, color: C.accent4 });
  ["Become well-rounded", "Basic knowledge for life", "Keep career options open"].forEach((t, i) => {
    const y = 4.78 + i * 0.47, picked = i === 0;
    box(s, { x: 1.02, y, w: 2.56, h: 0.38, rectRadius: 0.19, fill: picked ? { color: C.accent4 } : tint(C.accent4, 85), objectName: "Gợi ý chip" });
    T(s, (picked ? "✓  " : "") + t, { x: 1.15, y, w: 2.35, h: 0.38, fontSize: 11, bold: picked, color: picked ? C.background1 : C.text1, valign: "middle" });
  });
  toggle(s, "u");

  T(s, "Top ideas, grouped by AI", { x: 4.65, y: 2.6, w: 5.9, h: 0.32, fontSize: 15, bold: true });
  s.addChart(pres.charts.BAR, [
    { name: "Their own idea", labels: ["Discover hidden talents", "Become well-rounded", "Basic knowledge for life", "Keep career options open"], values: [241, 180, 77, 52] },
    { name: "Picked from Gợi ý", labels: ["Discover hidden talents", "Become well-rounded", "Basic knowledge for life", "Keep career options open"], values: [45, 132, 121, 98] },
  ], Object.assign({
    x: 4.55, y: 2.95, w: 3.85, h: 3.85, barDir: "bar", barGrouping: "stacked", catAxisOrientation: "maxMin", chartColors: [HX.accent1, HX.accent4],
    showValue: true, dataLabelPosition: "ctr", dataLabelColor: "FFFFFF", dataLabelFontSize: 10, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    catAxisLabelColor: HX.dk2, catAxisLabelFontSize: 11, catAxisLineShow: false, barGapWidthPct: 45, showLegend: true, legendPos: "b", legendFontSize: 10, legendColor: HX.dk2, objectName: "Idea groups chart",
  }, chartText));
  card(s, 8.5, 2.95, 2.1, 3.85, { fill: tint(C.accent1, 92) });
  T(s, "In their own words", { x: 8.62, y: 3.07, w: 1.9, h: 0.28, fontSize: 11, bold: true, color: C.accent1 });
  T(s, "“Kids don't know what they like until they try it.”\n\n“Maybe you are good at art but you never had an art class.”", { x: 8.62, y: 3.4, w: 1.9, h: 2.3, fontSize: 12, italic: true });
  box(s, { x: 8.62, y: 6.1, w: 1.86, h: 0.5, rectRadius: 0.25, fill: { color: C.accent1 }, objectName: "Pick idea button" });
  T(s, "Use in step 4", { x: 8.62, y: 6.1, w: 1.86, h: 0.5, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle" });
  meter(s, 12, false);
  s.addNotes("Students type their own idea or tap a suggestion. The AI groups similar ideas, and the teacher sees which ideas are most popular, split into ideas students came up with themselves and ones they picked from Gợi ý. The teacher picks one idea per side to develop in step 4.");
}

// Step 4: develop an idea
{
  const s = pres.addSlide({ masterName: "MOCK", sectionTitle: "During class" });
  header(s, "Step 4 · Develop the idea", "Is this benefit enough to justify the side? The answer decides the path: Impact, Explain or Example");
  columnLabels(s); phone(s, "Step 4 of 5"); dashboard(s, 4);
  card(s, 1.02, 2.45, 2.56, 0.7, { fill: tint(C.accent1, 90) });
  T(s, "Studying all subjects helps students become more well-rounded.", { x: 1.12, y: 2.5, w: 2.36, h: 0.6, fontSize: 11, bold: true, valign: "middle" });
  T(s, "Tutor: Is becoming well-rounded enough to justify studying every subject?", { x: 1.02, y: 3.25, w: 2.56, h: 0.6, fontSize: 11, bold: true, color: C.accent1 });
  [["Not enough → add IMPACT", true], ["Enough → EXPLAIN why", false], ["Not sure → give an EXAMPLE", false]].forEach(([t, on], i) => {
    const y = 3.92 + i * 0.44;
    box(s, { x: 1.02, y, w: 2.56, h: 0.36, rectRadius: 0.18, fill: on ? { color: C.accent1 } : { color: C.background1 }, line: { color: C.accent1, width: 1 }, objectName: "Path button" });
    T(s, t, { x: 1.15, y, w: 2.35, h: 0.36, fontSize: 11, bold: true, color: on ? C.background1 : C.accent1, valign: "middle" });
  });
  card(s, 1.02, 5.3, 2.56, 0.88, { fill: { color: C.background1 }, line: { color: C.accent5, width: 1 } });
  T(s, "Being well-rounded helps them adapt to many different jobs later.", { x: 1.12, y: 5.36, w: 2.36, h: 0.76, fontSize: 11, valign: "middle" });
  toggle(s, "u");

  T(s, "Which path did students take?", { x: 4.65, y: 2.6, w: 3.3, h: 0.32, fontSize: 15, bold: true });
  s.addChart(pres.charts.DOUGHNUT, [{ name: "Path", labels: ["Impact", "Explain", "Example"], values: [55, 30, 15] }], Object.assign({
    x: 4.65, y: 2.95, w: 3.0, h: 3.75, holeSize: 55, chartColors: [HX.accent1, HX.accent6, HX.accent4], showPercent: true, showValue: false, showLegend: true, legendPos: "b", legendFontSize: 11, legendColor: HX.dk2,
    dataLabelColor: "FFFFFF", dataLabelFontSize: 12, dataLabelFontBold: true, objectName: "Path split chart",
  }, chartText));
  T(s, "Common problems", { x: 7.85, y: 2.6, w: 2.7, h: 0.32, fontSize: 15, bold: true });
  [["27%", "“Impact” just repeats the idea in other words"], ["18%", "Circular: “well-rounded because they become well-rounded”"], ["11%", "The example doesn't show the benefit"]].forEach(([p, t], i) => {
    const y = 3.0 + i * 1.25;
    card(s, 7.85, y, 2.75, 1.12, { fill: i === 0 ? tint(C.accent2, 90) : { color: C.background2 } });
    T(s, p, { x: 7.98, y: y + 0.1, w: 0.75, h: 0.92, fontSize: 22, bold: true, color: i === 0 ? C.accent2 : C.text1, valign: "middle" });
    T(s, t, { x: 8.75, y: y + 0.1, w: 1.75, h: 0.92, fontSize: 11, valign: "middle" });
  });
  meter(s, 19, false);
  s.addNotes("The teacher's framework: does the idea support the central point yet? If the benefit isn't enough, add impact; if it is, explain why; if neither, give an example. The tutor asks this question, the student's answer decides the path, and the dashboard shows the path split and the most common problems.");
}

// Step 5: body paragraph
{
  const s = pres.addSlide({ masterName: "MOCK", sectionTitle: "During class" });
  header(s, "Step 5 · Write the body paragraph", "The tutor raises one problem at a time, most important first. Never a long list of mistakes");
  columnLabels(s); phone(s, "Step 5 of 5"); dashboard(s, 5);
  T(s, "Your body paragraph", { x: 1.02, y: 2.45, w: 1.8, h: 0.3, fontSize: 13, bold: true });
  T(s, "58 words", { x: 2.68, y: 2.45, w: 0.9, h: 0.3, fontSize: 10, color: C.text2, align: "right", valign: "middle" });
  card(s, 1.02, 2.82, 2.56, 1.95, { fill: { color: C.background1 }, line: { color: C.accent5, width: 1 } });
  T(s, [
    { text: "I am personally in favor of studying all subjects because it brings about many significant benefits. Firstly, it helps students become more well-rounded. " },
    { text: "This is because they become well-rounded.", options: { highlight: HX.accent4, bold: true } },
    { text: " As a result, they can adapt to many jobs." },
  ], { x: 1.1, y: 2.92, w: 2.4, h: 1.79, fontSize: 10, valign: "top" });
  tutor(s, 4.9, 1.3, "Tutor · 1 thing at a time", "Read the highlighted sentence. Does it explain why, or say the same thing again?");
  toggle(s, "u");

  T(s, "Paragraphs in", { x: 4.65, y: 2.6, w: 2.5, h: 0.32, fontSize: 15, bold: true });
  T(s, "903 / 1,284", { x: 4.65, y: 2.95, w: 2.6, h: 0.6, fontSize: 30, bold: true, color: C.accent1, valign: "middle" });
  box(s, { x: 4.65, y: 3.62, w: 2.6, h: 0.16, rectRadius: 0.08, fill: { color: C.background2 }, objectName: "Progress track" });
  box(s, { x: 4.65, y: 3.62, w: 2.6 * 903 / 1284, h: 0.16, rectRadius: 0.08, fill: { color: C.accent1 }, objectName: "Progress fill" });
  T(s, "Top problems", { x: 4.65, y: 4.0, w: 2.6, h: 0.3, fontSize: 13, bold: true });
  [["24%", "Circular explanation"], ["19%", "Idea not linked to impact"], ["8%", "“in favor of study” is back"]].forEach(([p, t], i) => {
    const y = 4.38 + i * 0.8;
    card(s, 4.65, y, 2.6, 0.68);
    T(s, p, { x: 4.77, y, w: 0.65, h: 0.68, fontSize: 16, bold: true, color: C.accent2, valign: "middle" });
    T(s, t, { x: 5.42, y, w: 1.75, h: 0.68, fontSize: 11, valign: "middle" });
  });
  card(s, 7.45, 2.6, 3.15, 4.2, { fill: tint(C.accent3, 90) });
  T(s, "STRONG PARAGRAPH", { x: 7.6, y: 2.72, w: 2.85, h: 0.25, fontSize: 10, bold: true, color: C.accent3, charSpacing: 1 });
  T(s, "Student #0417 · anonymous", { x: 7.6, y: 2.98, w: 2.85, h: 0.25, fontSize: 10, color: C.text2 });
  T(s, "“…Firstly, studying all subjects lets children discover talents they never knew they had. A child who is never taught music cannot know she loves it. As a result, more students end up in careers that truly suit them.”", { x: 7.6, y: 3.3, w: 2.85, h: 2.6, fontSize: 12, italic: true });
  box(s, { x: 7.6, y: 6.12, w: 2.85, h: 0.5, rectRadius: 0.25, fill: { color: C.accent3 }, objectName: "Show on stream button" });
  T(s, "Show on stream", { x: 7.6, y: 6.12, w: 2.85, h: 0.5, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle" });
  meter(s, 9, false);
  s.addNotes("Students put everything together into one body paragraph. The tutor raises one problem at a time, like a real teacher, never a long list. The teacher sees the most common problems across all paragraphs and can show a strong one on stream, anonymously.");
}

// Step 6: wrap-up and recap page
pres.addSection({ title: "After class" });
{
  const s = pres.addSlide({ masterName: "MOCK", sectionTitle: "After class" });
  header(s, "After class · Recap page and class summary", "Every student gets their own page. The teacher sees where the class got lost");
  columnLabels(s); phone(s, "After class", false); dashboard(s, 6);
  s.addShape(S.OVAL, { x: 1.02, y: 2.45, w: 0.45, h: 0.45, fill: { color: C.accent4 }, line: { color: C.accent4, width: 0 }, objectName: "Đậu avatar" });
  T(s, "Đ", { x: 1.02, y: 2.45, w: 0.45, h: 0.45, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle" });
  T(s, "anh Đậu: Your recap", { x: 1.57, y: 2.45, w: 2.0, h: 0.45, fontSize: 12, bold: true, valign: "middle" });
  const rows = [
    ["Your side", "All subjects", C.accent1],
    ["Topic sentence", "in favor of study → studying ✓", C.accent3],
    ["Your idea", "Discover hidden talents", C.accent1],
    ["Your paragraph", "Done, with 2 fixes ✓", C.accent3],
  ];
  rows.forEach(([a, b, col], i) => {
    const y = 3.02 + i * 0.6;
    card(s, 1.02, y, 2.56, 0.52);
    T(s, a, { x: 1.12, y: y + 0.04, w: 2.36, h: 0.2, fontSize: 10, color: C.text2 });
    T(s, b, { x: 1.12, y: y + 0.24, w: 2.36, h: 0.24, fontSize: 11, bold: true, color: col });
  });
  card(s, 1.02, 5.47, 2.56, 0.7, { fill: tint(C.accent2, 88) });
  T(s, "Remember: in favor of + V-ing", { x: 1.12, y: 5.47, w: 2.36, h: 0.7, fontSize: 12, bold: true, color: C.accent2, valign: "middle" });
  box(s, { x: 1.02, y: 6.3, w: 2.56, h: 0.4, rectRadius: 0.2, fill: { color: C.accent1 }, objectName: "Practise button" });
  T(s, "Practise this again", { x: 1.02, y: 6.3, w: 2.56, h: 0.4, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle" });

  T(s, "Where the class got lost", { x: 4.65, y: 2.6, w: 5.9, h: 0.32, fontSize: 15, bold: true });
  const mins = [], vals = [6, 7, 9, 12, 21, 34, 28, 15, 10, 11, 13, 12, 14, 19, 22, 16, 11, 9, 8, 7];
  vals.forEach((_, i) => mins.push(`${i * 3}`));
  s.addChart(pres.charts.LINE, [{ name: "Don't understand (%)", labels: mins, values: vals }], Object.assign({
    x: 4.55, y: 2.95, w: 6.05, h: 2.5, chartColors: [HX.accent2], lineSize: 2.5, lineDataSymbol: "none", showLegend: false,
    catAxisLabelColor: HX.dk2, valAxisLabelColor: HX.dk2, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, valAxisMaxVal: 40, valAxisMajorUnit: 10, valAxisLabelFormatCode: '0"%"',
    valGridLine: { color: "E4E2EE", size: 0.75 }, catGridLine: { style: "none" }, showCatAxisTitle: true, catAxisTitle: "minutes into class", catAxisTitleFontSize: 10, catAxisTitleColor: HX.dk2,
    objectName: "Confusion timeline chart",
  }, chartText));
  T(s, "▲ 34% at min 15: “in favor of + V-ing”", { x: 4.65, y: 5.5, w: 5.9, h: 0.25, fontSize: 11, bold: true, color: C.accent2 });
  [["91%", "joined in at least once"], ["1,106", "topic sentences"], ["903", "paragraphs"], ["1,198", "recap pages sent"]].forEach(([n, l], i) => {
    const x = 4.65 + i * 1.5;
    T(s, n, { x, y: 5.85, w: 1.4, h: 0.5, fontSize: 22, bold: true, color: C.accent1, valign: "middle" });
    T(s, l, { x, y: 6.35, w: 1.4, h: 0.4, fontSize: 10, color: C.text2 });
  });
  meter(s, 7, false);
  s.addNotes("After class each student gets a recap page from anh Đậu, built automatically from what they did in class: their side, their topic sentence before and after, their idea, their paragraph, and the one mistake to remember. The teacher gets a timeline of where the class got lost, which helps plan the next lesson.");
}

// ===================================================================
// 10. Roadmap
// ===================================================================
pres.addSection({ title: "Next" });
{
  const s = pres.addSlide({ masterName: "CLOSING_DARK", sectionTitle: "Next" });
  s.addText("From vision to every week", { placeholder: "title" });
  s.addText("Start small, get feedback from real students, then grow", { placeholder: "body" });
  const phases = [
    ["0", "Vision demo", "This deck. Show the idea and agree on it.", true],
    ["1", "First real class", "Lesson 1 live with real students: live AI, real screens, recap pages.", false],
    ["2", "Every week", "2–3 classes a week. The lesson builder keeps prep to ~10 minutes.", false],
    ["3", "Grow", "More Task 2 skills, then all four IELTS skills. Quizzes, teams, mistake clips.", false],
  ];
  phases.forEach(([n, t, d, here], i) => {
    const x = 0.5 + i * 3.13, y = 2.05, w = 2.9, h = 2.85;
    s.addShape(S.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: here ? { color: C.accent1 } : { color: C.background1, transparency: 90 }, line: { color: here ? C.accent1 : C.accent5, width: 1 }, objectName: `Phase ${n}` });
    s.addShape(S.OVAL, { x: x + 0.25, y: y + 0.25, w: 0.55, h: 0.55, fill: { color: C.background1 }, line: { color: C.background1, width: 0 }, objectName: `Phase ${n} number` });
    T(s, n, { x: x + 0.25, y: y + 0.25, w: 0.55, h: 0.55, fontSize: 18, bold: true, color: here ? C.accent1 : C.text1, align: "center", valign: "middle" });
    if (here) T(s, "WE ARE HERE", { x: x + 0.95, y: y + 0.38, w: 1.8, h: 0.3, fontSize: 11, bold: true, color: C.background1, charSpacing: 1, valign: "middle" });
    T(s, t, { x: x + 0.25, y: y + 1.0, w: w - 0.5, h: 0.45, fontSize: 20, bold: true, color: C.background1 });
    T(s, d, { x: x + 0.25, y: y + 1.5, w: w - 0.5, h: 1.6, fontSize: 14, color: here ? C.background1 : C.accent5 });
  });
  T(s, "To start Phase 1 we need:", { x: 0.5, y: 5.45, w: 12.3, h: 0.35, fontSize: 16, bold: true, color: C.background1 });
  T(s, "a go-ahead  ·  an AI API key  ·  how students log in on youpass.vn  ·  the speaking-intensive tutor rules", { x: 0.5, y: 5.85, w: 12.3, h: 0.4, fontSize: 16, color: C.accent5 });
  s.addNotes("Phase 0 is this deck. Phase 1 is one real class to get feedback. Phase 2 makes it sustainable at two or three classes a week. Phase 3 grows it to more skills and more interaction.");
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();
