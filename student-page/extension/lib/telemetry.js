/* The editing log ("nhật ký"): what the teacher kept, changed, deleted or added compared with
   Claude's draft, plus the actions a before/after can't show (drags, roles, ✓/~/✗, approvals,
   picks, optional reason chips). One record per lesson, written when it is exported or published,
   kept only in this Chrome until the teacher downloads it (Cài đặt → Tải nhật ký).
   Student names are replaced by codes (HV1, HV2, ...). */

// the page's own data: never Claude's, so not part of the comparison
const PAGE = new Set(["essay", "corrections", "task_comments", "scores", "word_count", "student", "teacher", "zalo",
  "homework", "prompt", "essay_type", "overall", "word_target", "version", "praise_status"]);

function leaves(obj, base, out = {}) {
  if (obj == null) return out;
  if (typeof obj !== "object") { out[base] = obj; return out; }
  if (Array.isArray(obj)) obj.forEach((x, i) => leaves(x, `${base}.${i}`, out));
  else for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("__") || (!base && PAGE.has(k))) continue;
    leaves(v, base ? `${base}.${k}` : k, out);
  }
  return out;
}
const fieldOf = path => path.replace(/\.\d+(?=\.|$)/g, ".*");
const moduleOf = path => path.split(".")[0];

/** Claude's draft vs the final lesson, leaf by leaf. */
export function diffLesson(ai, final) {
  const a = leaves(ai, ""), b = leaves(final, "");
  const changes = [], kept = {}, summary = {};
  const count = (path, status) => {
    const m = moduleOf(path);
    summary[m] = summary[m] || { kept: 0, edited: 0, deleted: 0, added: 0 };
    summary[m][status]++;
  };
  for (const [p, v] of Object.entries(a)) {
    if (!(p in b)) { changes.push({ path: p, field: fieldOf(p), status: "deleted", ai: v }); count(p, "deleted"); }
    else if (b[p] !== v) { changes.push({ path: p, field: fieldOf(p), status: "edited", ai: v, final: b[p] }); count(p, "edited"); }
    else { kept[fieldOf(p)] = (kept[fieldOf(p)] || 0) + 1; count(p, "kept"); }
  }
  for (const [p, v] of Object.entries(b)) if (!(p in a)) { changes.push({ path: p, field: fieldOf(p), status: "added", final: v }); count(p, "added"); }
  for (const s of Object.values(summary)) {
    const total = s.kept + s.edited + s.deleted;
    s.changed_pct = total ? Math.round((s.edited + s.deleted) / total * 100) : 0;
  }
  return { changes, kept, summary };
}

/* mistake groups side by side: what Claude grouped vs what the teacher ended with */
const groupsOf = L => L && L.mistakes ? [
  ...L.mistakes.main.map(g => ({ title: g.title, tab: g.tab, cids: g.cids, notes: (g.points || []).length })),
  ...L.mistakes.others.map(o => ({ title: o.label, tab: o.tag, cids: o.cids, notes: (o.points || []).length, other: true })),
] : [];

/** Replace the student's names by a code everywhere in a record. */
export function anonymize(value, names, code) {
  const list = [...new Set(names.filter(n => n && n.trim().length > 1))].sort((x, y) => y.length - x.length);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = list.length ? new RegExp(list.map(n => `(?<![\\p{L}])${esc(n)}(?![\\p{L}])`).join("|"), "gu") : null;
  const walk = v => typeof v === "string" ? (re ? v.replace(re, code) : v)
    : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v;
  return walk(value);
}

/** One lesson's record. */
export function buildRecord({ key, code, names, meta, ai, final, events, usage, draftAt, how, page }) {
  const { changes, kept, summary } = diffLesson(ai, final);
  const C = page.corrections || {};
  const essay = page.essay.paragraphs.map(p => p.sentences.map(s => ({ id: s.id,
    text: s.segs.map(g => typeof g === "string" ? g : C[g.c].orig).join("") })));
  return anonymize({
    v: 1, lesson: key, student: code, week: meta.week, homework: meta.homework, essay_type: meta.essay_type,
    recorded_at: new Date().toISOString(), how, minutes_since_draft: draftAt ? Math.round((Date.now() - draftAt) / 60000) : null,
    model: usage && usage.model, usage: usage ? { input: usage.input_tokens, output: usage.output_tokens, cache_read: usage.cache_read_input_tokens } : null,
    summary, kept, changes, groups: { ai: groupsOf(ai), final: groupsOf(final) },
    praise: { candidates: ((ai && ai.__candidates && ai.__candidates.praise) || []).map(p => p.line), chosen: (final.praise || []).map(p => p.line) },
    takeaways: { candidates: (ai && ai.__candidates && ai.__candidates.takeaways) || [], chosen: (final.finish && final.finish.takeaways) || [] },
    events, essay, corrections: Object.fromEntries(Object.entries(C).map(([id, c]) => [id, { orig: c.orig, fix: c.fix, comment: c.comment }])),
  }, names, code);
}
