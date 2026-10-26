# Build log: lesson for the first real class (Google Meet)

Every step of building this lesson, as it happens in chat. Used to write [PIPELINE.md](PIPELINE.md).
For each step: what we did, what anh Khoa decided, how long it took, what was hard.

---

## Step 0: Brief (started 2026-10-26)

Context already known:
- Boss greenlit a test in a **real online class on Google Meet** (not a livestream).
- Students keep Meet open; our student panel floats on top (pop-out). anh Khoa runs the teacher page and shares a board tab in Meet.
- Teacher: anh Khoa (= the project owner).
- Existing material: Lesson 1, Writing Task 2 "Phát triển ý" ([../LESSON-01-script.md](../LESSON-01-script.md)), a 20-minute mini-lesson built for the demo.
- Boss: add tracking to everything (what students look at, what they tried to press, …).

Questions asked to anh Khoa (answers go here):
1. Same lesson (Lesson 1 "Phát triển ý") made longer, or a new topic?
2. How long is the class?
3. How many students, and roughly what band (e.g. 5.0–6.0)?
4. Are they an existing YouPass class (they know you), or new?
5. What have they already learned (e.g. Task 2 structure, topic sentences)?
6. Laptops or phones?
7. When is the class?
8. What do you most want to find out from this test? (Drives the tracking plan.)

Time spent: …
What was hard: …

## Step 0b: anh Khoa's existing worksheet (2026-10-26)

What anh Khoa did: uploaded his existing class worksheet, **Writing Week 4** (.docx), and said "ask me questions to do it".

Note: the `random` repo looks **public**, so the worksheet text is **not** copied here (only a summary) until anh Khoa says it's OK.

What's in it (summary):
1. Homework revision
2. Paraphrasing: how to avoid repeating words (a model paragraph with the same idea said 5 ways); Exercise 1: replace a repeated phrase in a second sentence (6 items); Exercise 2: translate Vietnamese passages using "this / việc này / nhờ vậy" style references (3 items, with collocations)
3. Type 3 essay (advantages vs disadvantages): one topic, the steps to write an essay, the "40/60" essay structure, brainstorm with the "6-aspect Idea Framework"
4. Type 4 essay (positive or negative development): one topic, brainstorm
5. How to write a conclusion: summarise both bodies (40/60) + re-answer the question by essay type; 3 model intro + conclusion pairs

Lesson-building insight: lessons **start from an existing worksheet**, not from zero. Pipeline stage 0 should be "upload the worksheet", and Claude turns it into the lesson file.

Questions sent to anh Khoa: see Step 1.

## Step 1: Questions to anh Khoa (2026-10-26)

- anh Khoa: "You can copy, I don't care." → the worksheet is now in [source/Writing-Week-4.md](source/Writing-Week-4.md).
- anh Khoa is going to describe **how he usually runs this class** (by voice, it's quicker). Lesson-building insight: the fastest input is anh Khoa **talking through the class as he normally teaches it**; Claude turns that into the lesson. The pipeline should allow voice input.
- Questions still open (from Claude's list): class length and parts; class size/band; homework revision; the "6-aspect Idea Framework"; "40/60"; essay-writing steps; accepted answers in Exercise 1; Exercise 2 in English?; error order for conclusions; the one-sentence goal.

## Step 2: anh Khoa talks through the class, part 1: Paraphrasing (2026-10-26)

How: two dictation attempts failed (the mic cut out after ~10 minutes, and once only "bruh" arrived). The third attempt worked: anh Khoa dictated into the chat. **Pipeline lesson: talking through the class works, but input needs to be reliable** (record an audio file → Claude transcribes it, or dictate in short chunks).

What anh Khoa said (condensed, his order):
- **Homework revision: usually skipped.** Maybe sometimes.
- **Paraphrasing, theory:**
  1. Ask what paraphrasing means. Students think "synonyms". Point: synonyms are **not the only way and not reliable**.
  2. Examples of poor paraphrasing (from the week 3 topic, free housing): "housing" → "houses" (houses don't cover what housing means); "building" → "structure" / "construction" (misses the main topic). Show poor paraphrases and ask "where does this go wrong?" → **anh Khoa: good spot for an interactive activity.**
  3. Three ways that do work: (1) **pronouns**, (2) **reference** words: this, so, such, (3) **generalisation**: "providing free housing" → "this policy".
  4. Stress at the end: students won't be tested on naming the method. It's about knowing the tools they have.
- **Exercise 1 (6 items):** for each item, "how do you paraphrase the bold phrase in the next sentence?"
  - Many right answers. **Students type their answer (no multiple choice).** **AI corrects immediately.** **The teacher sees how many students chose which words.** (anh Khoa: "just a suggestion")
  - The key teaching moment: explaining **why a word doesn't work in a given place**. E.g. item 3 (plastic bags): "using them" is wrong because "them" could mean the other kinds of bags, not single-use ones → the moment to teach **"the former / the latter"**.
- **Exercise 2: usually skipped.** Next: the essay question types (Type 3, Type 4), not covered yet.

Claude's follow-up questions: see the chat (Step 3).

## Step 3: anh Khoa's answers on paraphrasing + his filled worksheet (2026-10-26)

anh Khoa uploaded **his own filled-in worksheet** (answers, accepted paraphrases, essay steps, brainstorm, model sentences): [source/Writing-Week-4-filled.md](source/Writing-Week-4-filled.md).
**Pipeline lesson: anh Khoa's filled worksheet is the prep he already does.** Claude should extract the lesson from it instead of asking him to fill in new forms.

Decisions:
- **Warm-up poll:** "what is paraphrasing?" with fixed answers; students just pick one.
- **Bad paraphrases:** only 1–2 examples, as a warm-up (from his notes: free housing → "free houses" = synonym = risky). Students vote **right / wrong**, then anh Khoa corrects it by talking. Short.
- **Model paragraph (free housing):** anh Khoa goes through it himself. No tool needed. His notes give the 3 methods: (1) pronouns (it / they; "red bag / blue one"), (2) reference: this / so / such + noun / do so ("such = this kind of"), (3) generalisation (this practice / this policy).
- **"Not tested on the method names":** anh Khoa just says it. No check question.
- **Exercise 1:**
  - Students type; anh Đậu answers **yes / no + a quick explanation**, no back-and-forth.
  - The teacher sees answers grouped by wording, with a **copy button** next to each, so anh Khoa can paste one onto his board himself.
  - "The former / the latter" (and "the first / the second / the last" for 3 things) is taught at item 3 / 4.
- **Exercise 2: skipped.** **Homework revision: skipped.**
- **Timing: paraphrasing ≤ 25 minutes.**

**Big change from the boss: tone down the Socratic method.** New default for anh Đậu:
1. Show **all** the wrong parts at once, each with why it's wrong.
2. One simple check question.
3. Right → next. Wrong → re-explain.

**Accepted answers, anh Khoa's view:**
- "It" is fine (e.g. "it" = the importation) **unless the thing is plural**.
- Writing out accepted / wrong lists for every item is **too much prep** → "we need a better way". Claude's proposal: see the chat (Step 4).

Things in the filled worksheet to check later:
- Type 3 model: the steps say "lợi >>> hại" and Body 2 = "lợi đáng kể hơn", but the model intro says "benefits… far outweighed by the associated drawbacks" and the conclusion says "the challenges… are far more significant". These contradict each other; check when we plan Type 3.
- Typos: "use single-use plastic bags" (→ using), "candicate's", "athough", "outweight".
- anh Khoa: the "?" marks in his filled worksheet are **leftovers from the blank template**, not doubts. **Every answer he wrote is accepted.** (Pipeline lesson: when extracting answers from a filled worksheet, ignore the template's own punctuation.)
- Still open: item 6 "it" (plural "foods": wrong?), and whether "less Socratic" applies to writing tasks too.
- Item 6: ~~"they" accepted, "it" rejected~~ **Corrected by anh Khoa:** "it" and "such food" are right, because the sentence before says "some imported **food**" (uncountable, singular).
  - Claude had misread it: the number must match **what the reference points back to in the sentence before**, not the bold phrase being replaced.
  - This becomes anh Đậu's rule: "check the singular / plural of the thing the reference points back to".
  - Open: is "they" wrong here (it points back to singular "food")?
- **Feedback style setting** (per task, chosen by the teacher): **"Thẳng" (direct) = default**: all errors + why → one check question → next / re-explain. **"Socratic" = the previous version**: one error at a time, guiding questions, chips.
- Item 6, "they": anh Khoa would **let it pass but explain why** ("food" is uncountable → "it" is more accurate).
  - This adds a third verdict for anh Đậu, besides ✓ and ✗: **"✓ but…"** = accepted, with a short note on the better choice.

## Step 4: Type 3 / Type 4 (2026-10-26, dictated; parts garbled)

- Another dictation was lost. The next one arrived partly garbled; Claude's reading:
  - **Type 3 (advantages vs disadvantages), Type 4 (positive vs negative) and "To what extent (agree)" are the same underlying question:** what are the advantages and the disadvantages?
    - Agree = the advantages outweigh the disadvantages.
    - Positive development = the advantages outweigh the disadvantages.
    - Disagree / negative = the disadvantages outweigh the advantages.
  - So the 40/60 framework (small side in Body 1, bigger side in Body 2) works for all of them, which matches his notes: "To what extent → lập luận 40/60 → dùng cho tất cả các dạng câu hỏi yêu cầu opinion".
  - Pipeline lesson: dictation into chat keeps failing. Use audio files or short chunks.
