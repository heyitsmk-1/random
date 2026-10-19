# Livestream: Ideas

Brainstorm of ways to solve the two problems. Nothing here is decided yet.
When an idea is picked, it moves into the plan and gets noted in [NOTES.md](NOTES.md).

## The two problems

1. **Too many students to manage.** The class is free and open to everyone, so it's too big for one teacher to handle each person: the chat moves too fast, the same questions repeat, and nobody gets individual attention.
2. **A talking-head stream is boring.** Watching one person talk to a camera doesn't keep people engaged.

## Core idea

The class plays together, AI looks after each student, and the teacher looks after the whole crowd.

Instead of trying to manage every student, the teacher only ever sees **summaries** of the class: poll results, the top-voted questions, the most common mistakes. Individual help is handled by software. The things the class produces (votes, answers, scores) go back onto the stream, so it stops being a talking head.

## Owner's ideas (the main direction, as of 2026-10-19)

The focus is **interactivity that makes this class feel different from every other livestream**. The technical side of streaming is parked for now.

### 1. Understand / Don't understand button ("confusion meter")

**What the owner described:**
- Each student has a button on their screen (e.g. "press Space") that switches their mood between **Understand** and **Don't understand**.
- The teacher sees a live **% of students who don't understand**.
- If that % gets too high, the teacher pauses and explains again until it drops.
- AI takes the **transcript of that moment** plus **the students' questions** and turns it into a **note sent to students**.

**Design details to work out (Claude's suggestions):**
- **Phones:** many students will watch on a phone, where there's no Space key. Needs a big tap button too. (Space also usually pauses video, so it may need a different key on desktop.)
- **People forget to switch back.** Someone presses "Don't understand", gets it 30 seconds later, and never presses again, so the % stays high. Options:
  - the state expires after a minute or so unless pressed again, or
  - after the teacher re-explains, students get a "Got it now?" prompt, or
  - the teacher has a "reset" button.
- **Self-report isn't always honest.** Students often *think* they understand when they don't. Pair the button with a quick check question after a re-explanation (links to idea 2), so the teacher sees real understanding and not just feelings.
- **What's the % out of?** Out of everyone watching, or only students who've pressed the button? Showing both the % and the number (e.g. "34%, 210 students") avoids a few people looking like a crisis.
- **An alert instead of staring.** The teacher sets a threshold (e.g. 30%) and gets a clear signal when it's crossed, so they don't have to watch a number while teaching.
- **Optional "what's confusing?"** When a student presses "Don't understand", they can type a short question. AI groups similar questions, so the teacher sees "most people are stuck on X".
- **Timing:** livestreams run a few seconds behind, so the confusion should be matched to *what the student was watching*, not the exact clock time. Matters for picking the right transcript moment. (Technical detail for later.)
- **Should students see the %?** Seeing "28% don't understand either" can make shy students feel safe pressing the button. Owner to decide.

**Extra ideas built on this:**
- **Confusion note:** transcript of the confusing part + the teacher's re-explanation + the grouped questions → a short AI-written note with a quick practice question. Send it only to students who pressed the button, or to everyone.
- **Confusion map:** after class, the teacher gets a timeline of the lesson showing where confusion spiked. Useful for improving the next class.
- **Smart replay:** the class recording gets chapter markers at the confusing moments, so students can jump straight to the re-explanation.

### 2. Kahoot / Quizizz style questions

**What the owner described:**
- An easy interaction screen with **multiple choice (Kahoot style)** and **fill in the blanks (Quizizz style)**.

**Claude's suggestions:**
- **AI writes the questions from what was just taught** (using the transcript). The teacher approves with one click and fires it. No need to prepare everything beforehand.
- **Wrong answers feed the confusion data.** If 40% choose the same wrong answer, the teacher knows exactly what to fix.
- **The question shows on the student's screen, not in the video**, and the timer starts when *they* see it. That keeps it fair even though the video runs behind.
- More question types later: true/false, put-in-order, word cloud, short answer.
- Points, streaks, a leaderboard, and team mode (links to idea E below).

### 3. AI Socratic tutor during practice

**What the owner described:**
- While students practise, each one works with an **AI Socratic tutor** (it asks guiding questions instead of giving the answer).
- The AI **reports the main mistakes back to the teacher**, and the teacher corrects them live.
- Maybe even show each student a **personalised video about a mistake they made**.

**Claude's suggestions:**
- **Teacher report is grouped, not per student:** e.g. "38% mixed up X and Y, here are 3 example answers". The teacher fixes the top 2–3 live.
- **Close the loop:** after the teacher's correction, a quick check question shows whether it worked.
- **Personalised video, cheaper option:** generating a brand-new video for each student is slow and expensive. Instead, build a **mistake video library**:
  - when the teacher corrects a common mistake live, that part of the stream is **automatically clipped** and tagged with the mistake;
  - next time any student makes that mistake (in any class), the AI tutor shows them that clip;
  - the library grows by itself every class, and it's the teacher's own face and voice.
- AI-generated avatar videos are possible later if wanted.

### How the three ideas fit together

One loop that runs again and again during a class:

1. **Teach.** The teacher explains.
2. **Sense.** The confusion meter shows who's lost, in real time.
3. **Check.** Quick quiz questions confirm who really understands.
4. **Practise.** Each student works with the AI Socratic tutor.
5. **Report.** AI tells the teacher the top mistakes.
6. **Fix.** The teacher corrects them live, and it's clipped.
7. **Follow up.** Each student gets their own recap: confusion notes, quiz results, their mistakes, and the clips that explain them.

The teacher only ever deals with **summaries** of the class, while every student still gets **individual** help. That solves both problems: the class is too big to manage, and talking heads are boring.

---

## Earlier brainstorm (2026-10-07)

## Idea list

Each idea is tagged with which problem it solves: **[Manage]**, **[Boring]**, or both.

### A. Live quizzes and polls: [Manage] [Boring]
The teacher fires a question and everyone answers on their phone or in a panel next to the stream. Results show up live on the stream as a bar chart.
- The teacher sees "62% picked B" instead of 2,000 separate chat messages.
- Gives students something to *do* every few minutes.

### B. Question queue with upvotes: [Manage]
Students submit questions into a queue instead of the chat, and upvote the ones they also want answered. The teacher answers the top few.
- Duplicate questions collapse into one.
- The loudest people in chat stop drowning out everyone else.

### C. AI teaching assistant: [Manage]
An AI assistant sits in the chat or side panel and:
- answers simple, repeated questions instantly ("what page are we on?", "what does this word mean?"),
- groups similar questions together and passes the important ones to the teacher,
- writes a short summary of what the class is confused about.

### D. Instant individual feedback on exercises: [Manage] [Boring]
Students do a short task during class (e.g. write a sentence or a paragraph). AI gives each student personal feedback within seconds. The teacher gets a summary of the **most common mistakes** and goes over those on stream.
- Every student gets personal feedback, which a teacher alone can't give to a big class.
- The teacher's part becomes reacting to real student work, which is more interesting to watch.

### E. Teams, points, and leaderboard: [Boring]
Students are put into teams (houses). Correct answers earn points for the student and their team. A live leaderboard shows on stream.
- Competition and a reason to stay till the end.

### F. Class votes on what happens next: [Boring]
At set points, the class votes on the next topic, the next example, or the difficulty level.
- The audience shapes the class, so it feels live.

### G. Stream overlay: [Boring]
A graphics layer on top of the video (added through streaming software like OBS) that shows the live poll results, leaderboard, top question, word clouds, and student shout-outs.
- This is what turns the stream from a talking head into a show.

### H. Student helpers / moderators: [Manage]
Trusted or top students get a helper role: they can answer questions, pin good answers, and remove spam.
- Spreads the work of managing the crowd.

### I. Auto-moderation: [Manage]
Filter spam, links, and abuse automatically, and slow the chat down when it's too fast.
