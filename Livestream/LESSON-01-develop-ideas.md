# Lesson 1: Developing ideas (Writing Task 2)

Draft lesson for the first prototype. Status: **being discussed. No code yet (Rule 1).**

## Topic

> Some people believe that children/students should study all subjects at school, while others think they should only study the subjects they are good at or find interesting. Discuss both views and give your own opinion.

## Framework (owner's)

Whichever view you take, you give the **benefits** of it.

## Core principles

See README.md: students respond with **taps, not long typing**; responses are **anonymous**; AI feedback is **one thing at a time, Socratic**, never a big list of mistakes. Typing is only for when the writing *is* the practice (steps 2, 4, 5).

## Lesson flow

The **confusion meter** (Understand / Don't understand) runs in the background for the whole lesson (confirmed by owner, 2026-10-19).

### Step 1: Pick a side (interaction 1)
- Students choose which side they favour: **All subjects** or **Only subjects they're good at / interested in**.
- Their choice stays on their screen and is **logged**, so the AI tutor knows which side they're writing about.
- *Suggestion:* the teacher sees the live split (e.g. "62% / 38%"), which can go up on stream as an opening moment.

### Step 2: Topic sentence
- **Teacher teaches** the template: *"I am personally in favor of X because it brings about many significant benefits."*
- **Students write** their own topic sentence.
- **AI gives Socratic feedback** (hints so the student fixes it themselves, without giving the answer), based on the existing speaking feedback tool (`youpassvn/speaking-intensive`).
- **AI reports to the teacher** what mistakes students made, and automatically shows **the most common mistake**.
- **Teacher teaches** the correction.
- *Suggestions:*
  - **Check X against the side they picked in step 1.** If someone picked "only interesting subjects" but writes in favour of all subjects, the AI catches it.
  - **Give the AI a list of expected mistakes**, so the counts group cleanly. Likely ones:
    - "in favor of **study**" → "in favor of **studying**" (gerund after *of*), probably the #1 mistake;
    - copying the whole prompt instead of a short X;
    - missing or wrong article/plural ("child study", "the students");
    - leaving out "because…";
    - spelling (*favor/favour* are both fine, *favorite* is wrong).
  - **Cap the Socratic hints at about 2 rounds**, then show a model answer, so no one gets stuck while the class moves on.

### Step 3: Core ideas (benefits)
- It's a mini lesson, so students **only brainstorm ideas for the side they picked** (owner, 2026-10-19).
- **Teacher explains** that the body has to give benefits.
- Students get a **text box to type their own ideas** and a **"Gợi ý" button** with suggested ideas they can tap to choose.
- For ideas students write themselves, AI **summarises and groups them** with similar ideas where possible.
- The teacher sees the **most suggested ideas** and works on and explains them further.
- *Suggestions:*
  - **Risk: everyone just taps Gợi ý**, so the "most suggested" list just repeats the suggestions. Options: Gợi ý unlocks after ~60 seconds or after the student types one idea of their own; and the teacher's view shows "own ideas" and "picked from Gợi ý" separately.
  - The teacher sees each group with a count and 1–2 real example wordings.

### Step 4: Developing an idea
- The teacher **selects one idea for each side** and teaches how to develop it.

**Core premise (owner's):** *does the core idea support the central point of the paragraph yet?*

Ask: **"Is this benefit enough to justify [the side]?"**

| Answer | What to do |
|---|---|
| **Not enough** | Add more **IMPACT** (what bigger result does this benefit lead to?) |
| **Enough** | **Explain** why/how it leads to the benefit |
| **Can't do either** | Give **examples** |

Worked example (owner's):
- Idea: *"Studying all subjects will allow students to become more well-rounded individuals."*
- Question: is becoming well-rounded enough to justify having to study all subjects?
  - If not → give more impact (e.g. what being well-rounded leads to).
  - If yes → explain *why* studying all subjects makes them well-rounded.
  - If neither → give examples.

This is only how to **start** developing the idea. After that, students are free to develop it in a different way.

*Suggestions for the interaction:*
- Each student develops the teacher's selected idea **for their side**.
- The AI tutor asks the core question Socratically ("Is this enough to justify studying every subject?"), and the student's answer decides the path: Impact / Explain / Example.
- The student writes 1–2 sentences down that path. The AI gives Socratic feedback with the same ~2-round cap.
- The teacher sees **which path students chose** (e.g. 55% Impact / 30% Explain / 15% Example) and the most common problems, e.g.:
  - "impact" that just repeats the idea in other words;
  - circular explanations ("it makes them well-rounded because they become well-rounded");
  - examples that don't actually show the benefit.

### Step 5: Write the whole body paragraph (final step)
- **Owner's flow (2026-10-19):** after students have been taught how to develop ideas, and have checked that their ideas make sense, they **write the whole body paragraph**.
- **AI checks their writing Socratically** (hints, not answers).
- This is the student's **end product** for the lesson, and the "final version" on their consolidation page.

*Suggestions:*
- **What the AI checks, in order** (logic before language, like the Đậu page's Logic → Language). Per core principle 3, the student never sees this as a list: the AI raises **one issue at a time**, most important first, and only moves on once it's fixed.
  1. Topic sentence follows the template and matches the side they picked.
  2. The idea supports the central point (the core premise from step 4).
  3. The development follows a path: Impact / Explain / Example, and isn't circular or just repeating the idea.
  4. Linking between sentences.
  5. Grammar and vocabulary, focused on the mistakes already taught in this lesson.
- Same **~2-round hint cap**, then show what a fixed version could look like.
- **Teacher report:** the most common problems across all paragraphs, plus a strong paragraph the teacher can show on stream.
- **Questions for the owner:**
  - Which idea goes in the paragraph: the one the teacher developed in step 4, or the student's own idea from step 3? (Using their own would give step 3's work a purpose.)
  - One developed idea, or more?
  - Rough length and writing time (e.g. ~100–150 words, ~10 minutes)?

### End: Consolidation page
- Each student gets a personal recap page made with the **student feedback consolidation tool**: `student-page/` on the `claude/vibrant-hopper-bdqjun` branch of this repo (confirmed by owner, 2026-10-19).
- What that tool is today (from its README and `build.py`):
  - It makes **anh Đậu's review page**: one self-contained HTML page per student, built from a lesson JSON file (`build.py data/<lesson>.json`).
  - Its input is a **marked writing homework** from the CRM (`admin.ielts1984.vn/writing/*`), read by a Chrome extension.
  - The **teacher decides** (framework checklist ✓ / ~ / ✗, idea verdicts and fix types, up to 3 systematic mistakes, rewrite task) and **Claude writes little** (Đậu's words around those decisions).
- **What changes for the livestream:** the teacher can't make decisions for thousands of students, so the **lesson data has to come from the class itself**: the side picked, topic sentence attempts and AI feedback, the ideas and the development path. The AI tutor fills in what the teacher normally decides. The page design and builder can be reused.
- It would include: the side they picked, their topic sentence attempts and the final fixed version, their ideas, the teacher's developed example, and **their body paragraph from step 5** with the AI's feedback.

## Open questions
1. ~~Ideas for both sides, or only their side?~~ **Answered:** only the side they choose (it's a mini lesson).
2. ~~Step 4 framework?~~ **Answered:** see the Step 4 decision table.
3. ~~Consolidation tool?~~ **Answered:** `student-page/` on `claude/vibrant-hopper-bdqjun`.
4. **Speaking feedback tool:** Claude can't see `youpassvn/speaking-intensive` yet (see NOTES.md).
5. **Prototype AI:** scripted or live? Live needs an API key.
6. More open items for this lesson are in [GAPS.md](GAPS.md) (sections A and B).
