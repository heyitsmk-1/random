import { getSettings, setSettings } from "./lib/store.js";
const ids = ["teacher", "zalo", "apiKey", "netlifyToken", "netlifySiteId"];
const s = await getSettings();
for (const id of ids) document.getElementById(id).value = s[id] || "";
document.getElementById("save").addEventListener("click", async () => {
  const next = Object.fromEntries(ids.map(id => [id, document.getElementById(id).value.trim()]));
  await setSettings(next);
  document.getElementById("saved").textContent = "Đã lưu";
});
