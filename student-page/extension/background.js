/* Receives a copy of a grading page from the content script and opens the editor on it.
   The copy is kept in session storage (cleared when Chrome closes). */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === "dau:open-editor") {
    const id = "page-" + Date.now();
    chrome.storage.session.set({ [id]: { html: msg.html, url: msg.url, at: Date.now() } }).then(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") + "?page=" + encodeURIComponent(id) });
      reply({ ok: true });
    });
    return true;                               // reply asynchronously
  }
});

// the toolbar button opens the editor without a page (to open a saved lesson file)
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") }));
