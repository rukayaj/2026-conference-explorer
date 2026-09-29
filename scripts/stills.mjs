// Grab one still frame per talk from the Vimeo recordings.
// Needs yt-dlp, ffmpeg and cwebp on PATH (or YTDLP / FFMPEG / CWEBP env vars).
// Usage: node scripts/stills.mjs [--force] [id-or-video-substring ...]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "stills");
const overridesFile = path.join(root, "curation", "still-times.json");
fs.mkdirSync(outDir, { recursive: true });

const ytdlp = process.env.YTDLP || "yt-dlp";
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const cwebp = process.env.CWEBP || "cwebp";
const framePng = path.join(os.tmpdir(), `tdwg-still-${process.pid}.png`);
const args = process.argv.slice(2);
const force = args.includes("--force");
const filters = args.filter((arg) => !arg.startsWith("--"));

const items = JSON.parse(
  fs.readFileSync(path.join(root, "public", "data", "items.json"), "utf8"),
);
// Hand-picked frame times ("HH:MM:SS" or seconds, recording time) for talks where the default frame is poor.
const overrides = fs.existsSync(overridesFile)
  ? JSON.parse(fs.readFileSync(overridesFile, "utf8"))
  : {};

function toSeconds(value) {
  if (typeof value === "number") return value;
  return String(value)
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

// Skip the introduction so the frame usually lands on a slide, without passing the middle of short items.
function frameTime(item) {
  if (overrides[item.id] != null) return toSeconds(overrides[item.id]);
  return Math.min(item.start + 45, (item.start + item.end) / 2);
}

// Unlisted videos only resolve through the player URL with the privacy hash.
function streamUrl(videoUrl) {
  const [id, hash] = new URL(videoUrl).pathname.split("/").filter(Boolean);
  const player = `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`;
  const output = execFileSync(
    ytdlp,
    [
      "-q",
      "--no-warnings",
      "-g",
      "-f",
      "bestvideo[height<=720][format_id*=akfire]/bestvideo[height<=720]",
      player,
    ],
    { encoding: "utf8" },
  );
  return output.trim().split("\n")[0];
}

const selected = items.filter(
  (item) =>
    !filters.length ||
    filters.some(
      (filter) => item.id.includes(filter) || item.videoUrl.includes(filter),
    ),
);
const byVideo = Map.groupBy(selected, (item) => item.videoUrl);
let written = 0;
let failed = 0;

for (const [videoUrl, videoItems] of byVideo) {
  const todo = videoItems.filter(
    (item) => force || !fs.existsSync(path.join(outDir, `${item.id}.webp`)),
  );
  if (!todo.length) continue;
  console.log(`${videoUrl}: ${todo.length} stills`);
  const stream = streamUrl(videoUrl);
  for (const item of todo) {
    const target = path.join(outDir, `${item.id}.webp`);
    try {
      execFileSync(ffmpeg, [
        "-loglevel",
        "error",
        "-y",
        "-ss",
        String(frameTime(item)),
        "-i",
        stream,
        "-frames:v",
        "1",
        "-vf",
        "scale=640:-2",
        framePng,
      ]);
      execFileSync(cwebp, ["-quiet", "-q", "72", framePng, "-o", target]);
      written += 1;
    } catch (error) {
      failed += 1;
      console.error(`  ${item.id}: ${error.message.split("\n")[0]}`);
    }
  }
}

console.log(`Wrote ${written} stills${failed ? `, ${failed} failed` : ""}.`);
