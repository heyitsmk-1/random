/* On a grading page: a "Tạo bài ôn" button. It only reads the page (never edits the CRM):
   it copies the page, with the typed-in values of inputs written into the copy, and hands it
   to the extension. First it opens the "Bài gốc" tab for a moment to read her essay exactly as she
   sent it (the teacher's typing in the essay is not hers), then goes back to "Bài sửa của giáo viên":
   only the view changes, nothing is saved. */
(function () {
  // once per page; a leftover button (e.g. in a page saved while the extension was on) is replaced
  if (window.__dauButton) return;
  window.__dauButton = true;
  document.querySelectorAll("#dau-make-review").forEach(n => n.remove());
  const btn = document.createElement("button");
  btn.id = "dau-make-review";
  btn.type = "button";
  btn.textContent = "Tạo bài ôn Đậu";
  btn.title = "Mở trình soạn bài ôn cho học viên từ bài chấm này";
  Object.assign(btn.style, {
    position: "fixed", right: "18px", bottom: "18px", zIndex: 2147483647, padding: "10px 16px",
    borderRadius: "999px", border: "0", background: "#FF9800", color: "#3A1D00", font: "700 14px system-ui, sans-serif",
    boxShadow: "0 4px 14px rgba(0,0,0,.2)", cursor: "pointer",
  });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const tabNamed = t => [...document.querySelectorAll("div, button, a, span")].find(el => !el.children.length && el.textContent.trim() === t);
  // the Bài gốc text: the plain block in the page (not an editor, not the AI suggestions)
  const original = () => [...document.querySelectorAll("#main-scroll .whitespace-pre-line")]
    .find(el => !el.classList.contains("ielts-editor") && !el.closest(".writing-ai-note") && !el.querySelector(".codex-editor") && el.textContent.trim());
  const editorText = () => [...document.querySelectorAll("#lrgr .ce-paragraph")].map(p => p.textContent).join("\n");
  async function readBaiGoc() {
    const tab = tabNamed("Bài gốc"), back = tabNamed("Bài sửa của giáo viên");
    if (!tab || !back) return "";
    let text = "", switched = false;
    try {
      if (!original()) { tab.click(); switched = true; }
      for (let i = 0; i < 40 && !original(); i++) await sleep(100);
      const el = original();
      text = el ? el.textContent.trim() : "";
    } finally {
      // back to the teacher's version, and wait until its editors are there and settled
      if (switched || original() || !document.querySelector("#lrgr .ce-paragraph")) back.click();
      let last = "";
      for (let i = 0; i < 60; i++) {
        const now = editorText();
        if (now && now === last && !original()) break;
        last = now; await sleep(150);
      }
    }
    return text;
  }
  btn.addEventListener("click", async () => {
    btn.disabled = true; btn.textContent = "Đang đọc bài gốc…";
    let sent = "";
    try { sent = await readBaiGoc(); } catch (e) { sent = ""; }
    const copy = document.documentElement.cloneNode(true);
    // her essay as she sent it, for the reader (lib/extract.js reads #dau-bai-goc)
    if (sent) { const pre = document.createElement("pre"); pre.id = "dau-bai-goc"; pre.hidden = true; pre.textContent = sent; copy.querySelector("body").append(pre); }
    // input values typed on the page (the scores) are not in the HTML: write them into the copy
    const live = document.querySelectorAll("input, textarea"), cloned = copy.querySelectorAll("input, textarea");
    live.forEach((el, i) => {
      if (!cloned[i]) return;
      if (el.tagName === "TEXTAREA") cloned[i].textContent = el.value; else cloned[i].setAttribute("value", el.value);
    });
    copy.querySelectorAll("#dau-make-review").forEach(n => n.remove());
    btn.disabled = true; btn.textContent = "Đang mở…";
    chrome.runtime.sendMessage({ type: "dau:open-editor", html: "<!doctype html>" + copy.outerHTML, url: location.href }, () => {
      btn.disabled = false; btn.textContent = "Tạo bài ôn Đậu";
    });
  });
  document.body.appendChild(btn);
})();
