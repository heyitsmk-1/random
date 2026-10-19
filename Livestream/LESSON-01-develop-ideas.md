# Lesson 1: Developing ideas (Writing Task 2)

Draft lesson for the first prototype. Status: **being discussed. No code yet (Rule 1).**

## Topic

> Some people believe that children/students should study all subjects at school, while others think they should only study the subjects they are good at or find interesting. Discuss both views and give your own opinion.

## Framework (owner's)

Whichever view you take, you give the **benefits** of it.

## Lesson flow

The confusion meter (Understand / Don't understand) can run in the background for the whole lesson.

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
- **Teacher explains** that the body has to give benefits.
- Students get a **text box to type their own ideas** and a **"Gợi ý" button** with suggested ideas they can tap to choose.
- For ideas students write themselves, AI **summarises and groups them** with similar ideas where possible.
- The teacher sees the **most suggested ideas** and works on and explains them further.
- *Suggestions:*
  - **Risk: everyone just taps Gợi ý**, so the "most suggested" list just repeats the suggestions. Options: Gợi ý unlocks after ~60 seconds or after the student types one idea of their own; and the teacher's view shows "own ideas" and "picked from Gợi ý" separately.
  - The teacher sees each group with a count and 1–2 real example wordings.

### Step 4: Developing an idea
- The teacher **selects one idea for each side** and teaches how to develop it.
- *(Owner to fill in the rest; see open questions.)*

### End: Consolidation page
- Each student gets a personal recap page made with the **student feedback consolidation tool** (`student-page/` on the `claude/vibrant-hopper-bdqjun` branch of this repo, *to confirm*).
- It would include: the side they picked, their topic sentence attempts and the final fixed version, their ideas, and the teacher's developed example.

## Open questions
1. **Ideas for both sides, or only their side?** "Discuss both views" needs a paragraph on each side, but step 1 locks in one side. Do students brainstorm for both (tagged by side), with their chosen side as the opinion?
2. **Step 4:** what's the development framework? (E.g. idea → explain → example → result?) And do students write a developed idea too, with AI feedback?
3. **Consolidation tool:** is it `student-page/` on the `claude/vibrant-hopper-bdqjun` branch?
4. **Speaking feedback tool:** Claude can't see `youpassvn/speaking-intensive` yet (see NOTES.md).
