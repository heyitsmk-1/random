# Student prototype: Lớp Phát triển ý

Live page: https://claude.ai/artifact/AbFNQCpDezdomNnZZMWVTF (private to the owner until shared)

The student's side of the YouPass livestream, on desktop. anh Khoa's lesson auto-plays; you play the student.

## What it does

- **Left: the "stream".** anh Khoa's screen-share board, his captions line by line, and a webcam mock-up in the corner. Controls: pause, next line (or click the caption, or →), speed 1x / 1.5x / 2x.
- **Top right: Hiểu / Chưa hiểu.** Click it or press **Space**. The lesson stops, anh Khoa re-explains that part (a "Đang giảng lại cho em" tag on the board), then a CCQ in the panel. Wrong → one hint + a second CCQ. Then it carries on and the moment goes into the recap.
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
