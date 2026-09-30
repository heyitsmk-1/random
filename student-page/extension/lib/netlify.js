/* Publish a student page to Netlify as a link, using Netlify's file-digest deploy:
   1. POST /sites/{id}/deploys with { files: { "/path": sha1 } } for EVERY file the site should have
   2. PUT /deploys/{deploy_id}/files/{path} for each file Netlify says it doesn't have yet
   A deploy replaces the whole site, so each new deploy re-lists every page already published
   (Netlify only asks us to upload the new one). Pages are never removed or overwritten:
   every publish gets a new random address, and we refuse to deploy if the list of existing
   pages looks incomplete. */

const API = "https://api.netlify.com/api/v1";
export class PublishError extends Error {}

const ROBOTS = "User-agent: *\nDisallow: /\n";
const HEADERS = "/*\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n";
const ROOT = '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Đậu</title>\n';

async function sha1(text) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export function randomSlug(n = 10) {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";    // no look-alikes (l, o, 0, 1)
  return Array.from(crypto.getRandomValues(new Uint8Array(n)), b => abc[b % abc.length]).join("");
}
export function noindex(html) {
  return html.includes('name="robots"') ? html : html.replace(/<head>/i, '<head><meta name="robots" content="noindex, nofollow">');
}

function client(token, fetchImpl = fetch) {
  return async function call(method, path, body, { raw = false } = {}) {
    let res;
    try {
      res = await fetchImpl(API + path, {
        method,
        headers: { Authorization: "Bearer " + token, "Content-Type": raw ? "application/octet-stream" : "application/json" },
        body: body == null ? undefined : raw ? body : JSON.stringify(body),
      });
    } catch (e) { throw new PublishError("Không kết nối được tới Netlify. Kiểm tra mạng rồi thử lại."); }
    if (res.status === 401) throw new PublishError("Netlify token không đúng. Kiểm tra lại trong phần Cài đặt.");
    if (res.status === 403) throw new PublishError("Netlify token này không có quyền với site này.");
    if (res.status === 404 && path.startsWith("/sites/")) throw new PublishError("SITE_GONE");
    if (res.status === 429) throw new PublishError("Netlify đang giới hạn lượt gọi. Đợi một chút rồi thử lại.");
    if (!res.ok) throw new PublishError(`Lỗi từ Netlify (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  };
}

/** Every file on the site's current deploy, as { "/path": sha1 }. */
async function currentFiles(call, siteId) {
  const out = {};
  for (let page = 1; page < 200; page++) {
    const list = await call("GET", `/sites/${siteId}/files?page=${page}&per_page=100`);
    if (!Array.isArray(list)) throw new PublishError("Netlify trả về danh sách file không đúng.");
    for (const f of list) {
      const p = f.path || f.id;
      if (!p || !f.sha) throw new PublishError("Netlify trả về danh sách file thiếu thông tin, nên không đăng để khỏi mất link cũ.");
      out[p.startsWith("/") ? p : "/" + p] = f.sha;
    }
    if (list.length < 100) return out;
  }
  throw new PublishError("Danh sách file trên Netlify dài bất thường, nên không đăng.");
}

/**
 * Publish one page. `known` is the list of paths this browser has published before (a
 * safety net: if any is missing from the site's file list, nothing is deployed).
 * Returns { url, siteId, path, siteUrl }.
 */
export async function publishPage({ token, html, siteId = null, known = [], fetchImpl, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
  if (!token) throw new PublishError("Chưa có Netlify token. Thêm trong phần Cài đặt.");
  const call = client(token, fetchImpl);

  let site = null;
  if (siteId) {
    try { site = await call("GET", `/sites/${siteId}`); }
    catch (e) {
      if (e.message !== "SITE_GONE") throw e;
      throw new PublishError("Không tìm thấy site Netlify đã dùng trước đây. Nếu anh đã xóa site đó, xóa Site ID trong phần Cài đặt rồi đăng lại.");
    }
  } else {
    site = await call("POST", "/sites", {});     // Netlify picks a random name
  }
  siteId = site.id;
  const siteUrl = (site.ssl_url || site.url || "").replace(/\/$/, "");

  const files = site.published_deploy || known.length ? await currentFiles(call, siteId) : {};
  const missing = known.filter(p => !(p in files));
  if (missing.length) throw new PublishError(`Không thấy ${missing.length} trang đã đăng trước đây trên site, nên không đăng để khỏi mất link cũ. Nhắn Claude kiểm tra nha.`);

  let slug, path;
  do { slug = randomSlug(); path = `/r/${slug}/index.html`; } while (path in files);
  const page = noindex(html);
  const add = { [path]: page, "/robots.txt": ROBOTS, "/_headers": HEADERS, "/index.html": ROOT };
  const want = { ...files };
  for (const [p, body] of Object.entries(add)) if (p === path || !(p in files)) want[p] = await sha1(body);
  const bodies = Object.fromEntries(await Promise.all(Object.entries(add).filter(([p]) => p in want).map(async ([p, b]) => [await sha1(b), [p, b]])));

  const deploy = await call("POST", `/sites/${siteId}/deploys`, { files: want });
  for (const sha of deploy.required || []) {
    const hit = bodies[sha];
    if (!hit) throw new PublishError("Netlify cần một file cũ mà máy này không có. Không đăng tiếp để khỏi làm hỏng site.");
    await call("PUT", `/deploys/${deploy.id}/files${encodeURI(hit[0])}`, new TextEncoder().encode(hit[1]), { raw: true });
  }
  for (let i = 0; i < 30; i++) {
    const d = await call("GET", `/deploys/${deploy.id}`);
    if (d.state === "ready") break;
    if (d.state === "error") throw new PublishError("Netlify báo lỗi khi đăng: " + (d.error_message || ""));
    if (i === 29) throw new PublishError("Netlify đăng lâu quá. Mở lại sau vài phút xem link đã chạy chưa.");
    await sleep(1000);
  }
  return { url: `${siteUrl}/r/${slug}/`, siteId, path, siteUrl };
}
