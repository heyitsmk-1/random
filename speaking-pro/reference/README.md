# Bàn giao — YouPass Speaking (05/09/2026 — đợt 2)

Gửi anh Nhất. Có 2 phần: **thay 12 file HTML** và **merge 3 PR**. Làm được độc lập, nhưng
PR #3 chỉ có dữ liệu sau khi file HTML mới lên (lý do ở mục ⚠️ bên dưới).

> **Đợt 2 (05/09)** — thay lại 12 file player như cũ, và merge thêm
> [PR #4](https://github.com/youpassvn/speaking-intensive/pull/4) (nút "Tải toàn bộ" hội thoại
> của một học viên). Có gì mới trong player:
> - Gợi ý "Trong lúc chờ" tắt ở bài Part 1, chỉ còn ở Part 2 (1.4 / 1.5 / 2.3 / 2.4) và hiện sau 7 giây.
> - Gia sư không sửa cụm anh Khoa dùng trong sample nữa (canon), không chê general example ở bài 1.1,
>   bớt tán ("Tuyệt vời!", "cực kỳ"...), định nghĩa vocab bằng tiếng Anh, không fact-check người thật,
>   không bịa số band khi nhận xét tốc độ nói, chỉ Direct Answer mới được đọc chép.
> - Bài 1.4 giờ mới đúng ngưỡng 50 từ của Part 2 (trước đây chạy ngưỡng 25 của Part 1).
> - Marker `[CHIPS: ...]` không lộ vào bubble nữa; dòng lặp trong một turn được gộp.
> - **Bài 2.4 có 5 điểm dừng trong video** theo timestamp anh Khoa (5:42 / 6:40 / 7:02 / 8:18 / 10:05); điểm culture
>   là tuỳ chọn — có nút *Làm thử / Bỏ qua*; sau video chỉ còn tổng kết.
> - Bài nào không còn câu luyện sau video (2.1 / 2.2.1 / 2.2.2 / 2.4): **tổng kết hiện ngay khi điểm luyện
>   cuối xong**, không đợi video chạy hết đoạn chào — video vẫn chạy tiếp để nghe anh Khoa chào.
> - **Mastery rõ ràng** (yêu cầu quản lý): xong mỗi điểm luyện, JS hiện dòng *"✅ Bạn đã nắm được: …"*; tổng kết cuối bài mở
>   bằng danh sách đó, rồi giải thích lại các lỗi bằng cách diễn đạt khác so với trong buổi.

---

## 1. Thay 12 file player (thư mục `players/`)

Thay đúng chỗ các file cũ đang chạy, tên file giữ nguyên. Không có bước build,
không có dependency — mỗi file là một trang HTML tự chứa.

| Bài | File |
|---|---|
| 1.1 | `lesson_1_1_player.html` |
| 1.2.1 | `lesson_1_2_1_player.html` |
| 1.2.2 | `lesson_1_2_2_player.html` |
| 1.2.3 | `lesson_1_2_3_player.html` |
| 1.4 | `lesson_1_4_player.html` |
| 1.5 | `lesson_1_5_player.html` |
| 2.1 | `lesson_2_1_player.html` |
| 2.2.1 | `lesson_2_2_1_player.html` |
| 2.2.2 | `lesson_2_2_2_player.html` |
| 2.2.3 | `lesson_2_2_3_player.html` |
| 2.3 | `lesson_2_3_player.html` |
| 2.4 | `lesson_2_4_player.html` |

**Bài 2.2.1 → 2.4 là bài mới**, chưa từng có trên hệ thống. Video Spotlightr đã upload sẵn,
ID đã nhúng trong file.

### Có gì thay đổi trong bản này

- **Sửa lỗi học viên báo ở bài 1.1**: mất nút bấm giữa chừng, và câu hỏi cuối bài bị bỏ qua /
  mic bị khoá. Nguyên nhân là thanh nút bị gỡ hẳn khỏi DOM sau lượt đầu.
- **Ép độ dài câu trả lời**: Part 1 tối thiểu 25 từ (~15-20 giây), Part 2 là 50 từ (30-45 giây).
  Một số bước luyện lẻ có ngưỡng riêng thấp hơn.
- **Học viên trả lời bằng tiếng Việt** thì được nhắc nói lại bằng tiếng Anh, thay vì được khen.
- **Nút ⚙️ Tuỳ chỉnh** cạnh nút Báo lỗi: học viên tự chọn mức độ sửa lỗi và độ dài câu trả lời
  của gia sư.
- **Gia sư không còn kẹt giữa lượt**: khi model quên phát `action`, JS tự suy ra từ nội dung
  (chốt bài / mời nói lại).
- **Gửi token YouPass thật khi gọi `/api/chat`** — xem mục ⚠️.

---

## 2. Ba PR trên `github.com/youpassvn/speaking-intensive`

| PR | Nhánh | Nội dung |
|---|---|---|
| [#1](https://github.com/youpassvn/speaking-intensive/pull/1) | `feat/report-cards` | Bảng `report_cards` + `/api/recap` (GET/POST) |
| [#2](https://github.com/youpassvn/speaking-intensive/pull/2) | `feat/dashboard-errors` | Banner cảnh báo lỗi API + bảng lỗi gần đây trên dashboard |
| [#3](https://github.com/youpassvn/speaking-intensive/pull/3) | `feat/student-transcript` | Xem lại toàn bộ hội thoại của một học viên |

Ba nhánh đều tách từ `main`, không đụng nhau, merge thứ tự nào cũng được.

**PR #1** là phần duy nhất cần **migration** (thêm bảng `report_cards`). Player sẽ tự gọi
`/api/recap` để nhớ học viên đã học bài nào, hay mắc lỗi gì, mạnh ở đâu — kể cả khi đổi
máy/đổi trình duyệt. Chưa merge thì player vẫn chạy bình thường, chỉ là không nhớ được.

**PR #3** thêm nút **"Xem hội thoại"** trong popup thông tin học viên trên dashboard: chọn bài →
đọc lại đúng như trên player (học viên bên phải, gia sư bên trái, mỗi điểm luyện tập là một
tiêu đề, mỗi lỗi được sửa là một dòng riêng). **Không cần đổi schema** — player vốn gửi toàn
bộ lịch sử chat mỗi lần gọi `/api/chat` và route chat đã lưu nguyên `request_body`, nên chỉ
cần đọc lại là dựng được.

---

## ⚠️ Một việc quan trọng: log chat đang không gắn được học viên

Hiện gần như mọi dòng `/api/chat` trong `api_logs` có `student_id = NULL`, nên dashboard
không biết cuộc hội thoại đó là của ai.

Số liệu tháng 8:

| endpoint | tổng | gắn được học viên |
|---|---|---|
| `/api/speech-to-text` | 3.659 | 3.570 (≈97%) |
| `/api/chat` | 4.512 | 1.636 (≈36%) |
| `/api/chat` **có gắn mã bài** | 2.848 | **0** |

Nguyên nhân nằm ở player, không phải backend: hàm gọi speech-to-text gửi token YouPass thật
từ cookie `auth_token`, còn hàm gọi chat gửi chuỗi placeholder `Bearer proxy`, nên
`getStudentFromToken` luôn trả về `null`.

**Bản player trong `players/` đã sửa**: gửi `getAuthToken() || 'proxy'`. Backend không phải đổi
gì — nó vốn gọi OpenRouter bằng key riêng của server, header `Authorization` chỉ dùng để nhận
diện học viên.

Nhờ anh xác nhận giúp một điều: các file player có được phục vụ từ domain `*.youpass.vn`
không? Nếu khác domain, hoặc cookie `auth_token` là `HttpOnly`, thì JS không đọc được cookie và
vẫn không gắn được học viên — lúc đó cần cách khác (ví dụ trang nhúng set
`window.YOUPASS_USER`, player đã hỗ trợ sẵn biến này).

---

## Bài 1.5 — đã dựng lại

Bài 1.5 giờ **có trong đợt này**. File nguồn mất theo ổ cứng nên em lấy ngược cấu hình ra từ
chính bản HTML đang deploy rồi build lại trên engine mới. Nội dung giữ nguyên 100%: vẫn 4 điểm
dừng trong video (401s / 537s / 661s / 754s), vẫn 4 đề luyện cuối bài, cùng video Spotlightr,
cùng framework 3 khía cạnh (appearance / personality / career).

Nhân dịp dựng lại bài này em phát hiện và sửa luôn một lỗi: điểm dừng cuối của 1.5 nằm ở giây
754 trong khi video dài 762 giây. Cơ chế "video đứng hình gần cuối thì tự chạy phần tổng kết"
không phân biệt được giữa *video đứng vì lỗi* và *video dừng vì học viên đang luyện tập*, nên
phần tổng kết sẽ nhảy vào giữa lúc học viên đang trả lời. Đã sửa, và đã test cả hai chiều.

---

> **Đợt 3 (07/09)** — thay **toàn bộ 26 file** trong `players/` (1.1 → 6.5; bài 4–6 là bản mới để anh Khoa
> duyệt, có thể lên sau). Đây là bản gấp vì ba lỗi học viên đang gặp trên bản cũ:
> - **"mic không nhận"** (Thai, Oanh, Khuê 05–07/09): mic bị mờ ~7 giây trong lúc TA gõ hướng dẫn, bấm không phản
>   hồi → giờ bấm là hiện hết chữ và ghi âm luôn. Mic bị từ chối / không thu được audio giờ tự báo về `/api/feedback`
>   (`vote: 'error'`) kèm user-agent.
> - **Video mất tiếng sau khi ghi âm** (Bảo Ngọc 04/09): player trả mic cho hệ điều hành mỗi khi video chạy lại.
> - **Lỗi API hiện thô** (OpenRouter 403 kèm link quản lý key; ElevenLabs "Invalid API key"): chỉ còn câu chung + mã lỗi.
> Chi tiết kỹ thuật: `NOTES_20260905_engine_v41.md`. Không cần đổi gì phía backend để lên bản này; hai đề nghị
> backend (ghi log `catch` của proxy, badge riêng cho `vote='error'`) làm sau cũng được.

---

> **Đợt 4 (12/09) — QC xong, lên toàn bộ.** Thay **26 file** trong `players/` (1.1 → 6.5; bài 3.3 → 6.5 đã qua QC).
> Backend: merge [PR #4](https://github.com/youpassvn/speaking-intensive/pull/4) (nút "Tải toàn bộ") và
> [PR #5](https://github.com/youpassvn/speaking-intensive/pull/5) (ghi log lỗi phía proxy vào `api_logs` + badge "⚠️ Lỗi"
> cho `vote='error'`). Player không phụ thuộc hai PR này — lên file trước cũng được.
> Có gì mới so với đợt 01/09 (chi tiết `NOTES_20260905_engine_v41.md`):
> - Bài 3.3 → 6.5 (12 bài mới).
> - Nhúng LMS: giao diện gọn khi iframe thấp, nút ⛶ toàn màn hình (iframe phải giữ cùng origin).
> - Lỗi API không hiện thô nữa (mã AI-xxx / STT-xxx); lỗi phía trình duyệt tự POST `/api/feedback` với `vote:'error'`.
> - Mic: trả mic cho hệ điều hành khi video chạy lại (hết mất tiếng); bấm mic lúc TA đang gõ → hiện hết chữ và ghi âm luôn.
> - ⚙️ Tuỳ chỉnh thêm "Tốc độ feedback"; câu hỏi tuỳ chỉnh lần đầu là dòng chat + chiếu sáng nút, không còn popup.
> - Nói tiếng Việt → coi là yêu cầu gửi cho TA, không chặn. Turn AI rỗng / từ vựng để sai key → vẫn hiện đủ.
> - Nhớ lỗi bài trước, nói thẳng ở điểm luyện đầu ("🔁 Bài trước bạn mắc lỗi …"); dòng "✅ Bạn đã nắm được" ở mọi bài.
> - **Cần anh Nhất kiểm tra**: giới hạn body / timeout của reverse proxy với audio 1–3 MB (câu Part 2 dài) — nghi là nguồn "HTTP 500" học viên gặp 05/09. Sau khi merge PR #5 sẽ thấy rõ trong bảng lỗi.
>
> **Bổ sung 14/09 — nút ⛶ trên site thật không che được thanh menu.** Thay lại 26 file `players/` (bản 14/09). Nút ⛶ giờ gọi Fullscreen API thật lên chính iframe (cùng origin nên gọi được từ bên trong) → che toàn bộ trang, Esc thoát. Nếu trình duyệt từ chối thì rơi về cách "ghim" cũ, nhưng có làm phẳng chuỗi ancestor (bỏ transform / z-index tạm thời) để header sticky không đè lên nữa. Không cần đổi gì phía LMS.
