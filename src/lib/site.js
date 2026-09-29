export const base = import.meta.env.BASE_URL;
export const href = (path = "") => `${base}${path.replace(/^\//, "")}`;
export const stillSrc = (id) => href(`stills/${id}.webp`);
export { timeLabel, stampSeconds, videoLink, shortDate } from "./format.js";
