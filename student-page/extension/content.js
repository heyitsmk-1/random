/* On a grading page: a "Tạo bài ôn" button. It only reads the page (never edits the CRM):
   it copies the page, with the typed-in values of inputs written into the copy, and hands it
   to the extension. */
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
  btn.addEventListener("click", () => {
    const copy = document.documentElement.cloneNode(true);
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
