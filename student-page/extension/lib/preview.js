/* Show a built student page in the editor's preview frame (see preview.js for why it is a sandbox).
   Every call reloads the frame: the page's script can only run once per document. */
let seq = 0;
export function showInPreview(frame, html) {
  const n = String(++seq);
  frame.dataset.seq = n;
  return new Promise(resolve => {
    const onMsg = e => {
      if (e.source !== frame.contentWindow || !e.data || e.data.type !== "dau-preview-ready") return;
      removeEventListener("message", onMsg);
      if (frame.dataset.seq !== n) return resolve(false);          // a newer preview took over
      frame.contentWindow.postMessage({ type: "dau-preview", html }, "*");
      resolve(true);
    };
    addEventListener("message", onMsg);
    frame.removeAttribute("srcdoc");
    frame.src = "preview.html?" + n;
  });
}
