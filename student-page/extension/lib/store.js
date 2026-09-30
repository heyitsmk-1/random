/* Settings and drafts. Inside the extension: chrome.storage.local. Opened as a plain page
   (tests, or before installing): localStorage. */
const DEFAULTS = { teacher: "anh Khoa", zalo: "https://zalo.me/0838002910", apiKey: "", netlifyToken: "", netlifySiteId: "", published: [] };
const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

async function get(key) {
  if (hasChrome) return (await chrome.storage.local.get(key))[key];
  try { const v = localStorage.getItem("dau:" + key); return v ? JSON.parse(v) : undefined; } catch (e) { return undefined; }
}
async function set(key, value) {
  if (hasChrome) return chrome.storage.local.set({ [key]: value });
  try { localStorage.setItem("dau:" + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
}

export async function getSettings() { return { ...DEFAULTS, ...((await get("settings")) || {}) }; }
export async function setSettings(s) { return set("settings", { ...(await getSettings()), ...s }); }

/** The page copy handed over by the content script (session storage), if any. */
export async function takePage(id) {
  if (!id) return null;
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.session) return (await chrome.storage.session.get(id))[id] || null;
  return null;
}

export async function saveDraft(key, lesson) { return set("draft:" + key, { lesson, at: Date.now() }); }
export async function loadDraft(key) { return get("draft:" + key); }
export async function listDrafts() {
  if (hasChrome) {
    const all = await chrome.storage.local.get(null);
    return Object.entries(all).filter(([k]) => k.startsWith("draft:")).map(([k, v]) => ({ key: k.slice(6), ...v }));
  }
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("dau:draft:")) { try { out.push({ key: k.slice(10), ...JSON.parse(localStorage.getItem(k)) }); } catch (e) { /* skip */ } }
  }
  return out;
}
