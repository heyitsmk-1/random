# Student prototype: Lớp Phát triển ý

Live page: https://claude.ai/artifact/AbFNQCpDezdomNnZZMWVTF (private to the owner until shared)

The student's side of the YouPass livestream, on desktop. anh Khoa's lesson auto-plays; you play the student.

## What it does

- **Left: the "stream".** anh Khoa's screen-share board, his captions line by line, and a webcam mock-up in the corner. Controls: pause, next line (or click the caption, or →), speed 1x / 1.5x / 2x.
- **Top right: Hiểu / Chưa hiểu.** Click it or press **Space**. What happens depends on the demo switch under the stream (see version 2 below).
- **Right: Bảng của em.** CCQs on the hard parts, ICQs before each task, and the tasks: pick a side → topic sentence → ideas (own idea or Gợi ý, unlocks after 20 s) → impact / explain / example → body paragraph.
- **anh Đậu (AI tutor)** coaches the three writing tasks one issue at a time, with chips, using speaking-intensive's rules. **Live AI** runs on Claude through the claude.ai page (the viewer approves it once). If that isn't available, a small scripted version takes over (badge says "chế độ offline").
- **Recap** at the end, anh Đậu style: side, topic sentence before → after, idea and path, the paragraph, "Điều cần nhớ" (anh Đậu's notes), and every "Chưa hiểu" moment.
- Fake classmates: viewer count, "62% chọn giống em", submissions counter, top ideas.

## Files

- `index.src.html`: the page (content and lesson script are in the `BOARDS`, `Q` and `SECTIONS` objects).
- `build.py`: puts the anh Đậu images in and writes the final page.

The anh Đậu images are **not** in this repo (same rule as `student-page/`). They are taken from a published anh Đậu recap page. Without them the page still works with a plain "Đ" avatar.

```
python3 build.py <dau-assets.json> <out.html>
```

## Version 2 (built 2026-10-21)

1. **Writing box pinned to the bottom of the panel**, like a chat app. When anh Đậu asks for a rewrite, it lights up under his last message with the student's text already in it.
2. **Question notice.** Before every CCQ / ICQ: anh Khoa says "Oke, anh check mọi người hiểu không nè" (ICQ: "…hiểu cần làm gì không nè"), the stream flashes "Câu hỏi mới · trả lời ở bảng bên phải →", and the panel card glows.
3. **The stream is the same for everyone.** Remove personal things from the boards (the "Phe của em" tag, X filled with the student's side, "Ý của em" on top ideas). The boards show both sides, or the side anh Khoa picks. The student's own version shows in the panel.
4. **Hybrid "Chưa hiểu", tied to the exact moment:**
   - A class bar on the stream: "Chưa hiểu: 6%".
   - A demo switch under the stream: **Kịch bản: ít bạn / nhiều bạn chưa hiểu**.
   - **Few confused:** the bar rises a little and stays under 30%. **anh Đậu** opens in the panel: "Em chưa rõ chỗ nào nè?" + 2 options for that moment + "Chỗ khác…" (typed, answered by live AI from the recent captions). Short explanation + CCQ. The stream keeps playing.
   - **Many confused:** the bar climbs past 30% → flash → anh Khoa stops: "Ơ, khoan đã. Anh thấy nhiều bạn chưa hiểu chỗ này." → poll "Mọi người chưa hiểu chỗ nào nè?" (results fill in; the student's pick wins) → he explains that point → "Oke, anh check mọi người hiểu không nè" → CCQ → the bar drops → "Ok, mình đi tiếp."
   - **During writing tasks:** always anh Đậu, privately.
   - The toggle goes back to Hiểu after the CCQ.
5. **Content:** 10 confusion spots (see NOTES.md), each with 2 options, an explanation per option and a CCQ. Written into LESSON-01-script.md.

Not in version 2: the teacher's side, the prep phase, any transcript, real streaming.

## Version 3 (built 2026-10-21)

1. **Timers** on anh Khoa's questions (CCQ 15 s, ICQ 10 s) and the class poll (15 s): a countdown ring on the card, "Câu hỏi · còn 12s" on the stream. When it ends: the answer + class result appear on the stream; the panel shows right / wrong / "Em chưa trả lời". If the student answers early, the demo skips ahead to 3 s.
2. **anh Khoa's buttons** (demo, under the stream): **Hiện đáp án** ends the open question now; **Chốt** ends the open task with a 30 s warning ("anh Khoa sắp chốt"). Tasks also have a timer (demo: side 25 s, topic 2 min, ideas 1.5 min, develop 2 min, paragraph 5 min; follows the speed control). When time's up anh Đậu wraps up in one line and saves the work.
3. **Rare typed questions go private:** "Chỗ khác…" in a class poll is answered by anh Đậu in the student's panel while anh Khoa explains what most of the class picked.
4. **Earlier slides:** in private help the student first picks which part they mean (the current one + the 2 before). Their typed questions and answers are kept and shown on the recap ("Câu hỏi của em").
5. **Accepted X's are canon** in anh Đậu's instructions; a fixed order of issues; one issue per turn.
6. **Auto-applied fixes:** when a fix is chosen, anh Đậu shows "Câu của em giờ là:" with old words crossed out → new ones popping in, and puts the fixed text in the writing box. The student just reads it and presses "Gửi bản này".
7. **Early finishers:** "Em xong rồi 🎉" + live submissions + time until anh Khoa wraps up, and two tabs: **Ôn nhanh** (tap-to-flip cards of what's been taught) and **Tìm lỗi của các bạn** (tap the mistake in a classmate's anonymous sentence; streak counter).
8. **Voice:** anh Khoa's lines are read by the browser's Vietnamese voice, English phrases by an English voice. "Giọng: bật / tắt" button. No Vietnamese voice on the computer → captions only.

## Version 4 (built 2026-10-21)

- Top bar: just the red student-count pill + Hiểu / Chưa hiểu. Logo and lesson title sit under the stream.
- Demo controls are in a closed "Điều khiển demo" drawer, with a voice check ("Thử giọng" + which voice was found).
- Panel header removed; AI status only shows as "bản offline" under anh Đậu when offline.
- Full screen (caption bar button, Esc to exit): the stream fills the screen, the panel floats on the right, opens itself for questions / tasks / chat, folds to a tab when idle.
- `TEACHER_RULES`: what anh Khoa accepts + his error order for each writing step; anh Đậu fixes one error per turn in that order, accepts correct paraphrases, makes minimal edits.

