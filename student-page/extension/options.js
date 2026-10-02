import { getSettings, setSettings, listLogs, clearLogs } from "./lib/store.js";
const ids = ["teacher", "zalo", "apiKey", "netlifyToken", "netlifySiteId"];
const s = await getSettings();
for (const id of ids) document.getElementById(id).value = s[id] || "";
document.getElementById("save").addEventListener("click", async () => {
  const next = Object.fromEntries(ids.map(id => [id, document.getElementById(id).value.trim()]));
  await setSettings(next);
  document.getElementById("saved").textContent = "Đã lưu";
});

async function showCount() {
  const logs = await listLogs();
  document.getElementById("logCount").textContent = logs.length ? `${logs.length} bài ôn trong nhật ký.` : "Chưa có bài nào trong nhật ký.";
}
showCount();
document.getElementById("dlLog").addEventListener("click", async () => {
  const logs = (await listLogs()).sort((a, b) => (a.recorded_at || "").localeCompare(b.recorded_at || ""));
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), lessons: logs }, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `dau-nhat-ky-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a); a.click(); a.remove();
});
document.getElementById("clearLog").addEventListener("click", async () => {
  if (!confirm("Xóa toàn bộ nhật ký? Không lấy lại được.")) return;
  await clearLogs(); showCount();
});
