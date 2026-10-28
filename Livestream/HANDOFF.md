# Handoff: moving to youpassvn/live-stream (2026-10-28)

For the Claude Code instance running on anh Khoa's PC. Read this, then `CLAUDE.md` → `RULES.md` → `NOTES.md`.

## Where things came from
- Until now the project lived in `heyitsmk-1/random` (branch `claude/keen-edison-wg7nsd`, folder `Livestream/`), worked on from a Claude cloud session.
- From now on this repo (`youpassvn/live-stream`) is the home. `random` is the old copy.
- anh Khoa (the teacher in every doc) **is the project owner**.

## Rules that still apply
- **Rule 1 / Rule 2:** no code until the owner says **CLAUDE COOK**, and every round of coding needs a fresh one (see RULES.md).
- Document everything: owner's words + decisions go in NOTES.md (dated); lesson-building steps go in `lesson-building/BUILD-LOG-real-class-01.md`.
- Never ask for or accept passwords or API keys in chat.

## Status
- **Student prototype v4** (claude.ai artifact, shared by link): https://claude.ai/artifact/AbFNQCpDezdomNnZZMWVTF
  - Source: `prototype/student-live/index.src.html`.
  - Build: `python3 build.py <dau-assets.json> <out.html>`.
  - `dau-assets.json` (the anh Đậu mascot images) is **not** in the docs. anh Khoa has it as a separate file; put it in the repo only if it stays private.
  - **Keep the same link:** a new session can update this artifact by passing its URL (the Artifact tool `url`) after reading it first. Without the URL, a publish makes a new link.
  - Headless test scripts (Playwright walkthrough + full-screen checks) were in the cloud session's scratch folder, not in this repo. Ask for them if needed.
- **Decided, not built yet:**
  - **Teacher page + student page as 2 separate links that sync**; anh Khoa clicks the teacher side live.
  - First real test = **an online class on Google Meet** (boss approved).
  - Students keep Meet open; the student page has a "Meet mode" + a **pop-out floating panel** (document picture-in-picture). A Meet add-on comes later.
  - Teacher page: stream-deck buttons, live meter, answer charts grouped by wording with copy buttons, a separate board tab to share in Meet.
  - **Tracking on everything** (boss): see NOTES.md 2026-10-26 for the event list and privacy notes.
  - Real students don't have claude.ai accounts → the real class needs a **YouPass-hosted** version (class code + nickname, company AI gateway, key on the server).
  - **anh Đậu feedback style:** default **"direct"** (all errors + why → one check question → next / re-explain); "Socratic" = optional per task. Verdicts: ✓ / ✓ but… / ✗.
- **In progress: planning the real-class lesson (Writing Week 4)**: the plan is in `LESSON-W4-plan.md`; how it was built is in `lesson-building/`:
  - **Paraphrasing part: fully planned** (≤ 25 min).
  - **Type 3 / Type 4 part:** started (it's a Week 3 revision: To what extent / positive-negative / adv-disadv = the same question). Waiting for anh Khoa's next part.
  - Still open: the 6-aspect Idea Framework; the contradiction in his Type 3 model (steps say advantages win, model intro/conclusion say disadvantages win); the conclusion task; total class length + timing; the one-sentence goal.
- **Speech-to-text:**
  - For lesson planning: anh Khoa's dictation into chat keeps cutting out → record an audio file and transcribe it (faster-whisper, model large-v3-turbo; on his PC use the GPU).
  - For live class: LocalVocal OBS plugin / whisper.cpp with Vulkan on the 7900 XTX (to test).

## Next steps
1. Finish the lesson plan (Type 3/4, conclusion, timing, goal) → write the lesson file.
2. Then, on CLAUDE COOK: build the teacher + student pages (2 synced links, Meet mode, pop-out, tracking).
3. Plan the YouPass-hosted version with the devs (hosting, AI gateway, PostHog / Clarity).
