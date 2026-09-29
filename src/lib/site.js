export const base = import.meta.env.BASE_URL;
export const href = (path = '') => `${base}${path.replace(/^\//, '')}`;
export const stillSrc = (id) => href(`stills/${id}.webp`);

export function timeLabel(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value % 3600 / 60);
  const remainder = value % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function stampSeconds(timestamp) {
  if (typeof timestamp === 'number') return timestamp;
  const parts = String(timestamp || '').split(':').map(Number);
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0;
}

export function videoLink(videoUrl, seconds = 0) {
  return `${videoUrl}#t=${Math.floor(seconds)}s`;
}
