export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

export function timeLabel(seconds) {
  const number = Number(seconds);
  const value = Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = String(value % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}

export function stampSeconds(timestamp) {
  const value =
    typeof timestamp === "number"
      ? timestamp
      : String(timestamp || "")
          .split(":")
          .reduce((total, part) => total * 60 + Number(part), 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function videoLink(videoUrl, seconds = 0) {
  const url = new URL(videoUrl);
  url.hash = `t=${Math.floor(stampSeconds(seconds))}s`;
  return url.toString();
}

export function shortDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function scheduleTime(item) {
  if (!item.scheduledStart) return "";
  // The word joiner stops a narrow screen breaking the range after the dash.
  return item.scheduledEnd
    ? `${item.scheduledStart}–\u2060${item.scheduledEnd}`
    : item.scheduledStart;
}

export function whenWhere(item) {
  return [shortDate(item.date), scheduleTime(item), item.room]
    .filter(Boolean)
    .join(" · ");
}
