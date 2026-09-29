import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(root, "public", "data");
const cueDir = path.join(dataDir, "cues");
fs.mkdirSync(cueDir, { recursive: true });

const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(root, "derived", name), "utf8"));
const items = readJson("content_items.json");
const themes = readJson("themes.json");
const recordings = readJson("recordings.json");
const recordingById = new Map(
  recordings.map((recording) => [recording.id, recording]),
);
const programme = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "source", "program-data.js"), "utf8"),
  programme,
);
const programmeEvents = new Map(
  programme.window.TDWG_2026_PROGRAMME.sessions
    .flatMap((session) => session.items)
    .map((event) => [event.id, event]),
);

// The programme writes tracks in capitals, e.g. "AI AND ROBOT READY".
function trackName(track = "") {
  return track.toLowerCase().replace(/\S+/g, (word, index) => {
    if (word === "ai") return "AI";
    if (index > 0 && ["and", "of", "&"].includes(word)) return word;
    return word[0].toUpperCase() + word.slice(1);
  });
}

// "9:05 AM" -> "09:05", to match the 24-hour clock used in Oslo.
function clock(time = "") {
  const match = time.match(/^(\d+):(\d\d)\s*(AM|PM)$/i);
  if (!match) return "";
  const hours =
    (Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

function seconds(timestamp) {
  const [hours, minutes, rest] = timestamp.replace(",", ".").split(":");
  return (
    Math.round(
      (Number(hours) * 3600 + Number(minutes) * 60 + Number(rest)) * 1000,
    ) / 1000
  );
}

function parseSrt(filename) {
  const raw = fs
    .readFileSync(path.join(root, "source", filename), "utf8")
    .replace(/\r/g, "");
  return raw.split(/\n\s*\n/).flatMap((block) => {
    const lines = block.trim().split("\n");
    const timeIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeIndex < 0) return [];
    const match = lines[timeIndex].match(
      /(\d\d:\d\d:\d\d[,.]\d+)\s*-->\s*(\d\d:\d\d:\d\d[,.]\d+)/,
    );
    if (!match) return [];
    const text = lines
      .slice(timeIndex + 1)
      .join(" ")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return [];
    return [{ start: seconds(match[1]), end: seconds(match[2]), text }];
  });
}

const srtByRecording = new Map();
for (const recording of recordings)
  srtByRecording.set(recording.id, parseSrt(recording.transcript_source));

function wordCount(text) {
  return (text.match(/\S+/g) || []).length;
}
function makeChunks(item, cues, segmentIndex, offset) {
  const result = [];
  let startIndex = 0;
  while (startIndex < cues.length) {
    let endIndex = startIndex;
    let words = 0;
    while (endIndex < cues.length) {
      words += wordCount(cues[endIndex].text);
      endIndex++;
      const elapsed = cues[endIndex - 1].end - cues[startIndex].start;
      const sentenceEnd = /[.!?]["')\]]?$/.test(cues[endIndex - 1].text);
      if ((words >= 145 && sentenceEnd) || words >= 205 || elapsed >= 105)
        break;
    }
    // Fold a short tail into this chunk rather than emitting a near-duplicate of the overlap.
    const remaining = cues
      .slice(endIndex)
      .reduce((sum, cue) => sum + wordCount(cue.text), 0);
    if (remaining < 50) endIndex = cues.length;
    const slice = cues.slice(startIndex, endIndex);
    if (slice.length)
      result.push({
        id: `${item.id}:${segmentIndex}:${offset + result.length}`,
        itemId: item.id,
        recordingId: item.recording_id,
        start: slice[0].start,
        end: slice.at(-1).end,
        text: slice.map((cue) => cue.text).join(" "),
      });
    if (endIndex >= cues.length) break;
    let overlapWords = 0;
    let nextStart = endIndex;
    while (nextStart > startIndex + 1 && overlapWords < 22) {
      nextStart--;
      overlapWords += wordCount(cues[nextStart].text);
    }
    startIndex = nextStart;
  }
  return result;
}

function cuesBetween(recordingId, from, to) {
  return srtByRecording
    .get(recordingId)
    .filter(
      (cue) => cue.end >= from && cue.start <= to && cue.start >= from - 0.5,
    );
}

// Hand-picked session openings worth hearing. Each is keyed by the session's first talk and
// is linked from every talk it introduces, up to the next opening in the same recording.
const itemById = new Map(items.map((item) => [item.id, item]));
const openings = {};
const openingByItem = new Map();
const curatedOpenings = JSON.parse(
  fs.readFileSync(path.join(root, "curation", "session-openings.json")),
).map((entry) => {
  const first = itemById.get(entry.itemId);
  if (!first) throw new Error(`Missing item for opening: ${entry.itemId}`);
  const start = seconds(entry.start);
  const end = seconds(entry.end);
  if (!(start < end && end <= seconds(first.actual.start_timestamp)))
    throw new Error(`Opening must end before its first talk: ${entry.itemId}`);
  const overlapping = items.find(
    (item) =>
      item.recording_id === first.recording_id &&
      item.source_segments.some(
        (segment) =>
          seconds(segment.start_timestamp) < end &&
          seconds(segment.end_timestamp) > start,
      ),
  );
  if (overlapping)
    throw new Error(
      `Opening before ${entry.itemId} overlaps ${overlapping.id}`,
    );
  return { ...entry, id: `${entry.itemId}-opening`, first, start, end };
});
for (const opening of curatedOpenings) {
  const { first } = opening;
  const nextStart = Math.min(
    ...curatedOpenings
      .filter(
        (other) =>
          other.first.recording_id === first.recording_id &&
          other.start > opening.start,
      )
      .map((other) => other.start),
  );
  for (const item of items) {
    const start = seconds(item.actual.start_timestamp);
    if (
      item.recording_id === first.recording_id &&
      item.session?.id === first.session?.id &&
      start >= opening.end &&
      start < nextStart
    )
      openingByItem.set(item.id, opening.id);
  }
  openings[opening.id] = {
    itemId: first.id,
    title: opening.title || first.session?.title || "Session opening",
    speakers: opening.speakers,
    description: opening.description,
    start: opening.start,
    end: opening.end,
  };
}

const chunks = [];
const publicItems = [];
// Abstracts are kept out of items.json because the search, map and surprise pages download it.
const abstracts = {};
for (const item of items) {
  const recording = recordingById.get(item.recording_id);
  if (!recording) throw new Error(`Missing recording for ${item.id}`);
  const itemCues = [];
  item.source_segments.forEach((segment, segmentIndex) => {
    const segmentCues = cuesBetween(
      item.recording_id,
      seconds(segment.start_timestamp),
      seconds(segment.end_timestamp),
    );
    itemCues.push(...segmentCues);
    chunks.push(...makeChunks(item, segmentCues, segmentIndex, chunks.length));
  });
  fs.writeFileSync(
    path.join(cueDir, `${item.id}.json`),
    JSON.stringify(itemCues),
  );
  const event = programmeEvents.get(item.programme_id);
  if (event?.abstract)
    abstracts[item.id] = { title: event.title, text: event.abstract };
  publicItems.push({
    id: item.id,
    type: item.type,
    title: item.title,
    date: item.conference_date,
    day: item.day,
    room: item.room,
    session: item.session?.title || "",
    scheduledStart: clock(event?.start),
    scheduledEnd: clock(event?.end),
    track: trackName(event?.track),
    speakers: (item.actual?.speakers || item.programme?.speakers || [])
      .map((speaker) => speaker.name)
      .filter(Boolean),
    speakerConfidence: item.actual?.identification_confidence || "",
    summary: item.summary,
    takeaway: item.one_line_takeaway,
    whyItMatters: item.why_it_matters,
    keyPoints: item.key_points || [],
    themes: item.themes_normalized || [],
    moments: item.notable_moments || [],
    videoUrl: item.video_url,
    start: seconds(item.actual.start_timestamp),
    end: seconds(item.actual.end_timestamp),
    openingId: openingByItem.get(item.id),
  });
}
// Searchable openings get their own chunks, found under the first talk's page.
for (const opening of curatedOpenings.filter((entry) => entry.searchable)) {
  const cues = cuesBetween(
    opening.first.recording_id,
    opening.start,
    opening.end,
  );
  chunks.push(
    ...makeChunks(opening.first, cues, "opening", chunks.length).map(
      (chunk) => ({ ...chunk, openingId: opening.id }),
    ),
  );
}

fs.writeFileSync(path.join(dataDir, "items.json"), JSON.stringify(publicItems));
fs.writeFileSync(
  path.join(dataDir, "abstracts.json"),
  JSON.stringify(abstracts),
);
fs.writeFileSync(path.join(dataDir, "themes.json"), JSON.stringify(themes));
fs.writeFileSync(path.join(dataDir, "openings.json"), JSON.stringify(openings));
fs.writeFileSync(path.join(dataDir, "chunks.json"), JSON.stringify(chunks));
const curated = JSON.parse(
  fs.readFileSync(path.join(root, "curation", "surprise-moments.json")),
);
const publicItemById = new Map(publicItems.map((item) => [item.id, item]));
const featuredMoments = curated.map(([itemId, timestamp]) => {
  const item = publicItemById.get(itemId);
  const moment = item?.moments.find((entry) => entry.timestamp === timestamp);
  if (!moment)
    throw new Error(`Missing curated moment: ${itemId} at ${timestamp}`);
  return { itemId, timestamp, description: moment.description };
});
fs.writeFileSync(
  path.join(dataDir, "featured-moments.json"),
  JSON.stringify(featuredMoments),
);
console.log(
  `Prepared ${publicItems.length} items, ${chunks.length} transcript chunks, ${themes.length} themes, and ${curatedOpenings.length} session openings.`,
);
