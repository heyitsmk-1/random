/* The phone preview. The student page runs its own inline script, which Chrome never allows on an
   extension page, so the preview lives on a sandboxed page (manifest "sandbox": no extension APIs,
   no storage, scripts allowed). The editor loads this page in its frame and posts the built page here. */
addEventListener("message", e => {
  if (!e.data || e.data.type !== "dau-preview") return;
  document.open();
  document.write(e.data.html);
  document.close();
}, { once: true });
parent.postMessage({ type: "dau-preview-ready" }, "*");
