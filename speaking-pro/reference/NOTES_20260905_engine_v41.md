# Engine v41 — ghi chú cho anh Nhất (05/09/2026)

Hai thay đổi trong `engine_v1.html`, đã build lại **toàn bộ 26 player** (1.1 → 6.5). Mọi player đợt này đều chứa cả hai.

## 1. Player nhúng trong LMS: chế độ gọn + nút "Toàn màn hình" ⛶

Trang "Chi tiết bài học" nhúng player bằng `<iframe srcdoc=…>` cùng origin, cao ~500–570px. Ở kích thước đó phần chat chỉ còn 1–2 dòng.

- Khi phát hiện đang nằm trong iframe (`window.self !== window.top`) → `<html class="yp-embedded">`: ẩn header riêng của player (LMS đã có tiêu đề), app-shell chiếm 100% chiều cao iframe.
- `@media (max-height: 640px)`: topbar / question card / answer-zone gọn lại, **mic 84px → 52px** (ẩn chữ "Nói"), padding video-col nhỏ hơn. Đo trên mock LMS cao 570px: vùng chat từ ~100px lên **364px**.
- Nút **⛶** ở góc phải thanh PRACTICE: vì iframe cùng origin, player set `position:fixed; inset:0; z-index max` lên chính `window.frameElement` và khoá scroll của trang cha → player phủ toàn bộ trang web (không cần Fullscreen API, không cần `allowfullscreen`). Bấm **✕** hoặc **Esc** trả lại nguyên trạng (khôi phục `style` cũ + overflow của body cha). Nếu chạy standalone (không trong iframe) → dùng Fullscreen API; nếu trình duyệt không cho phép thì nút tự ẩn.
- **Yêu cầu phía LMS**: iframe phải giữ **cùng origin** (srcdoc như hiện tại là đúng). Nếu sau này thêm `sandbox` thì phải có `allow-same-origin`, nếu không nút ⛶ rơi về Fullscreen API và cần `allow="fullscreen"` trên iframe.
- Test: `youpass_full_bundle/_mock_host.html?p=lesson_X_player.html` (dev only — mô phỏng header + iframe + thanh "Hoàn thành").

## 2. Lỗi API không còn hiện thô cho học viên

Hôm nay học viên thấy nguyên văn `OpenRouter HTTP 403: {"error":{"message":"Key limit exceeded (weekly limit). Manage it using https://openrouter.ai/…/keys/<id>"}}` trong chat. Đã đổi:

- Chat (`callAI`): mọi HTTP lỗi từ `/api/chat` → thông báo tiếng Việt chung theo nhóm mã (401/403 "hệ thống AI tạm gián đoạn — không phải lỗi của bạn", 429 "AI đang bận", 5xx "sự cố tạm thời") + tag `(mã lỗi: AI-<status>)` để triage từ ảnh chụp. **Body upstream không bao giờ hiện ra** — nó vẫn được proxy ghi vào `api_logs` (status + responseBody) và dashboard đã hiển thị ở mục "Upstream API errors" (PR #2).
- Speech-to-text: bỏ mọi nhắc tới ElevenLabs / trang quản lý key / body upstream → chỉ còn câu chung + `(mã lỗi: STT-<status>)`.
- Lỗi phía client không đi qua proxy (timeout mạng `NET-TIMEOUT`, AI trả rỗng `AI-EMPTY`, exception JS khi render lượt `AI-CLIENT`) → player POST lên `/api/feedback` với `vote: 'error'`, `msg` = chi tiết kỹ thuật, `comment` = stack. Chúng nằm trong `ai_feedbacks` cạnh 👍👎. **Đề xuất nhỏ cho dashboard**: lọc `vote = 'error'` thành một mục riêng (hoặc gộp vào banner lỗi hiện có).

## 3. Mic: trả lại micro cho hệ điều hành khi video chạy lại

Phản hồi 04/09 (Bảo Ngọc, 1.2.2): "mỗi lần luyện nói xong thì video sẽ bị mất tiếng". Nguyên nhân: player giữ `MediaStream` của mic mở suốt sau khi ghi âm (để không bị hỏi quyền lại). Khi mic đang được giữ, điện thoại / tai nghe Bluetooth chuyển sang chế độ thu âm → âm thanh video bị tắt hoặc rè. Sửa: `releaseMic()` dừng các track mỗi khi video phát lại (`player` event `play`). Nói lại nhiều lần trong cùng một điểm luyện vẫn dùng chung stream, không hỏi quyền lại; sang điểm luyện sau, trình duyệt nào không nhớ quyền (Safari iOS) sẽ hỏi lại — chấp nhận.

Phản hồi 05/09 (Thai, 2.2.1): "mic ko nhận". `api_logs` không có request speech-to-text nào của bạn này từ 08:03 đến 11:06 UTC → bản ghi âm chưa bao giờ rời trình duyệt (từ chối quyền / không thu được audio / trình duyệt không hỗ trợ). Từ bản này, ba trường hợp đó đều POST `/api/feedback` với `vote:'error'` kèm user-agent, và câu báo lỗi từ chối quyền có hướng dẫn bấm ổ khoá trên thanh địa chỉ. **Lưu ý cho LMS**: nếu sau này iframe có `sandbox` hoặc đổi sang khác origin thì phải thêm `allow="microphone"` lên `<iframe>`, nếu không mic sẽ bị chặn hoàn toàn.

## 4. Tuỳ chỉnh (06/09): thêm "Tốc độ feedback" + bỏ popup nhảy ra

- Phản hồi Đỗ Linh 06/09: "design phần AI tương tác ngắn gọn, ít phải bấm skip và chờ". Menu ⚙️ Tuỳ chỉnh có thêm nhóm **Tốc độ feedback**: 🍃 Từ tốn (mặc định, như cũ) / 🚀 Nhanh gọn — mọi bubble của một lượt hiện cùng lúc (không typing), nút "Xem tiếp video / Câu tiếp theo" tự bấm sau 1.4s, và prompt bảo AI chốt "done" ngay khi đạt, không hỏi "nói lại hay đi tiếp". Lưu trong `localStorage` `yp_prefs_v1.pace`.
- Câu hỏi tuỳ chỉnh lần đầu (sau điểm luyện thứ 3 của bài 1.1) không còn là modal bật lên giữa lúc học. Giờ: TA nhắn một câu trong chat ("À bạn ui, mình muốn tạo trải nghiệm tốt cho bạn í…"), màn hình tối dần và nút ⚙️ được chiếu sáng. Bấm ⚙️ → mở menu → đóng là video chạy tiếp; bấm chỗ khác → chạy tiếp luôn. Chỉ hỏi một lần mỗi trình duyệt (`yp_prefs_asked_v1`), kể cả khi học viên không lưu gì.

## 5. Việc cần làm ngay (không phải code)

- Key OpenRouter đang ở trạng thái **"Key limit exceeded (weekly limit)"** → toàn bộ lượt AI trả 403 cho đến khi nâng limit / đổi key trong proxy. Dashboard mục lỗi sẽ thấy đợt 403 này.

## 6. Ba downvote ngày 05/09 — kết luận sau khi đối chiếu api_logs

- **Thai (2.2.1, 11:03 UTC) và Oanh (2.2.1, 16:24 UTC): "mic không nhận"** — cả hai không có request speech-to-text nào trong lúc than phiền, rồi vài phút sau ghi âm bình thường. Đo trên player 2.2.1: sau khi điểm luyện mở, mic bị **disabled ~7.5 giây** trong lúc 3 bubble hướng dẫn "gõ" ra lần lượt (hướng dẫn bài này dài). Bấm vào nút mic mờ lúc đó không có phản hồi gì → học viên tưởng mic hỏng. Sửa: lớp `#mic-shield` trong suốt phủ hàng mic khi đang reveal; bấm vào → hiện hết bubble ngay (`flushReveal`) và bắt đầu ghi âm luôn. Ngoài ra `cancelReveal` giờ xoá dấu "đang gõ" bị kẹt.
- **Xuân Như (1.2.2, 16:14 UTC): "❌ HTTP 500:"** — bạn này sau đó nói vào mic "It has the bug with your AI practice… it can't transfer my long answer": câu ngắn ("Hi") đi qua, câu dài lỗi 500. Không có dòng nào trong `api_logs` vì 500 này phát ra từ `catch` của `/api/speech-to-text` (route chỉ ghi log khi ElevenLabs trả lỗi, không ghi khi chính proxy ném exception). **Đề nghị anh Nhất**: (1) trong `catch` của cả `/api/speech-to-text` và `/api/chat`, insert một dòng `api_logs` với `responseBody = error.message` (+ `requestMeta`/fileSize nếu đã parse được); (2) kiểm tra giới hạn body / timeout của reverse proxy với file audio 1–3 MB (câu Part 2 dài 1–2 phút). Từ bản này player cũng tự POST `vote:'error'` kèm kích cỡ audio + số giây khi STT trả 5xx/413, nên lần tới sẽ thấy ngay trong feedback.

## 7. Bốn downvote 08–09/09 — kết luận + sửa (bản build 10/09)

- **Linh Phương (1.1, 09/09 04:00 UTC) "Không thấy câu hỏi đính kèm"** — model trả `{"lines":[],"action":"chips",…}` (chips gợi ý, không có câu chữ). Parser cũ coi turn rỗng là lỗi → in "mình bị líu lưỡi… nói lại" cạnh mấy chip → khó hiểu. Sửa: turn rỗng nhưng có action hợp lệ → tự thêm một câu ("Bạn chọn một ý bên dưới nhé 👇" / "Bạn bấm 🎤 và nói nhé").
- **Đăng Nguyễn Hải (1.1, 08/09 17:57 UTC) "Không đưa ra từ vựng"** — tổng kết nói "Dưới đây là các từ vựng…" trong `lines` nhưng để danh sách ở key lạ `"vocabulary": [...]` → player bỏ qua. Sửa: mọi mảng chuỗi ở key ngoài schema được gộp vào `lines` (cả engine lẫn `qc_harness.normalise`).
- **Ghost Pepper (1.2.1, 08/09 11:46 UTC)** — bản ghi âm là tiếng Việt thật ("Dạ ơi, nó không phải là toastie…"), player từ chối đúng. **Ghost Pepper (1.1, 09:39)** — downvote không lời, lượt AI bình thường; không sửa gì.
- **Đổi hành vi (anh Khoa 10/09)**: học viên nói **tiếng Việt** không bị chặn nữa — coi là YÊU CẦU (bỏ qua bước, sửa kỹ hơn, giải thích) gửi cho AI kèm system note: làm theo nếu hợp lý, nhắc nhẹ trả lời bằng tiếng Anh, tuyệt đối không chấm/khen như câu trả lời; không lưu làm answer, không tính ngưỡng độ dài. Chỉ còn chặn trường hợp STT trả gibberish (language_probability < 0.5) với câu "nghe chưa rõ, nói lại rõ hơn".

## 8. Nhớ lỗi bài trước — nói thẳng (anh Khoa 10/09)

Trước đây TA được dặn dùng hồ sơ học viên "kín đáo" (không nhắc buổi trước). Đổi: ở **điểm luyện đầu tiên** của mỗi bài, JS in dòng "🔁 Bài trước bạn mắc lỗi **X** (vd: …). Hôm nay mình tập trung sửa lỗi này nhé!" (tối đa 2 lỗi đang mở, lỗi lặp nhiều nhất trước, lấy từ report card). Prompt digest đổi theo: lỗi xuất hiện lại → sửa TRƯỚC mọi lỗi khác và nói "đây là lỗi lần trước nè"; không mắc lại → khen 1 dòng. Không đăng nhập thì hồ sơ nằm trong localStorage của trình duyệt (QC mở file trực tiếp vẫn test được); trên web thì theo tài khoản qua `/api/recap`.

## 9. ⛶ trên youpass.vn không che thanh menu (14/09)

Nguyên nhân: header của site là `position: sticky` có `z-index`, còn player nằm trong một wrapper tạo stacking context riêng (transform / z-index) → `position: fixed; z-index: max` của iframe bị nhốt trong wrapper đó, thua header. Sửa trong engine: (1) ⛶ gọi `frameElement.requestFullscreen()` từ bên trong iframe — cùng origin và user activation lan lên parent nên được phép, không cần `allowfullscreen`; (2) nếu bị từ chối → fallback ghim, nhưng tạm set `position:static; transform:none; filter:none; z-index:auto; overflow:visible` lên mọi ancestor tới `<body>` (lưu và trả lại inline style khi thoát). Test bằng `_mock_host.html` đã mô phỏng đúng header sticky + wrapper transform.
