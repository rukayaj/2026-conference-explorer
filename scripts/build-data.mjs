import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(root, 'public', 'data');
const cueDir = path.join(dataDir, 'cues');
fs.mkdirSync(cueDir, { recursive: true });

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, 'derived', name), 'utf8'));
const items = readJson('content_items.json');
const themes = readJson('themes.json');
const recordings = readJson('recordings.json');
const recordingById = new Map(recordings.map((recording) => [recording.id, recording]));
const programme = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'source', 'program-data.js'), 'utf8'), programme);
const programmeEvents = new Map(programme.window.TDWG_2026_PROGRAMME.sessions.flatMap((session) => session.items).map((event) => [event.id, event]));

// The programme writes tracks in capitals, e.g. "AI AND ROBOT READY".
function trackName(track = '') {
  return track.toLowerCase().replace(/\S+/g, (word, index) => {
    if (word === 'ai') return 'AI';
    if (index > 0 && ['and', 'of', '&'].includes(word)) return word;
    return word[0].toUpperCase() + word.slice(1);
  });
}

// "9:05 AM" -> "09:05", to match the 24-hour clock used in Oslo.
function clock(time = '') {
  const match = time.match(/^(\d+):(\d\d)\s*(AM|PM)$/i);
  if (!match) return '';
  const hours = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

function seconds(timestamp) {
  const [hours, minutes, rest] = timestamp.replace(',', '.').split(':');
  return Math.round((Number(hours) * 3600 + Number(minutes) * 60 + Number(rest)) * 1000) / 1000;
}

function parseSrt(filename) {
  const raw = fs.readFileSync(path.join(root, 'source', filename), 'utf8').replace(/\r/g, '');
  return raw.split(/\n\s*\n/).flatMap((block) => {
    const lines = block.trim().split('\n');
    const timeIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeIndex < 0) return [];
    const match = lines[timeIndex].match(/(\d\d:\d\d:\d\d[,.]\d+)\s*-->\s*(\d\d:\d\d:\d\d[,.]\d+)/);
    if (!match) return [];
    const text = lines.slice(timeIndex + 1).join(' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    return [{ start: seconds(match[1]), end: seconds(match[2]), text }];
  });
}

const srtByRecording = new Map();
for (const recording of recordings) srtByRecording.set(recording.id, parseSrt(recording.transcript_source));

function wordCount(text) { return (text.match(/\S+/g) || []).length; }
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
      if ((words >= 145 && sentenceEnd) || words >= 205 || elapsed >= 105) break;
    }
    // Fold a short tail into this chunk rather than emitting a near-duplicate of the overlap.
    const remaining = cues.slice(endIndex).reduce((sum, cue) => sum + wordCount(cue.text), 0);
    if (remaining < 50) endIndex = cues.length;
    const slice = cues.slice(startIndex, endIndex);
    if (slice.length) result.push({
      id: `${item.id}:${segmentIndex}:${offset + result.length}`,
      itemId: item.id,
      recordingId: item.recording_id,
      start: slice[0].start,
      end: slice.at(-1).end,
      text: slice.map((cue) => cue.text).join(' '),
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

const chunks = [];
const publicItems = [];
// Abstracts are kept out of items.json because the search, map and surprise pages download it.
const abstracts = {};
for (const item of items) {
  const recording = recordingById.get(item.recording_id);
  if (!recording) throw new Error(`Missing recording for ${item.id}`);
  const sourceCues = srtByRecording.get(item.recording_id);
  const segments = item.source_segments?.length ? item.source_segments : [{
    start_timestamp: item.actual.start_timestamp,
    end_timestamp: item.actual.end_timestamp,
  }];
  const itemCues = [];
  segments.forEach((segment, segmentIndex) => {
    const from = seconds(segment.start_timestamp);
    const to = seconds(segment.end_timestamp);
    const segmentCues = sourceCues.filter((cue) => cue.end >= from && cue.start <= to && cue.start >= from - 0.5);
    itemCues.push(...segmentCues);
    chunks.push(...makeChunks(item, segmentCues, segmentIndex, chunks.length));
  });
  fs.writeFileSync(path.join(cueDir, `${item.id}.json`), JSON.stringify(itemCues));
  const event = programmeEvents.get(item.programme_id);
  if (event?.abstract) abstracts[item.id] = { title: event.title, text: event.abstract };
  publicItems.push({
    id: item.id, type: item.type, title: item.title, date: item.conference_date,
    day: item.day, room: item.room, session: item.session?.title || '',
    scheduledStart: clock(event?.start), scheduledEnd: clock(event?.end),
    track: trackName(event?.track),
    speakers: (item.actual?.speakers || item.programme?.speakers || []).map((speaker) => speaker.name).filter(Boolean),
    speakerConfidence: item.actual?.identification_confidence || '',
    transcriptQuality: item.actual?.transcript_quality || '',
    summary: item.summary, takeaway: item.one_line_takeaway, whyItMatters: item.why_it_matters,
    keyPoints: item.key_points || [], themes: item.themes_normalized || [],
    entities: item.entities || [], standards: item.standards || [], tools: item.software_tools || [],
    moments: item.notable_moments || [], videoUrl: item.video_url,
    start: seconds(item.actual.start_timestamp), end: seconds(item.actual.end_timestamp),
  });
}

fs.writeFileSync(path.join(dataDir, 'items.json'), JSON.stringify(publicItems));
fs.writeFileSync(path.join(dataDir, 'abstracts.json'), JSON.stringify(abstracts));
fs.writeFileSync(path.join(dataDir, 'themes.json'), JSON.stringify(themes));
fs.writeFileSync(path.join(dataDir, 'chunks.json'), JSON.stringify(chunks));
const curated = JSON.parse(fs.readFileSync(path.join(root, 'curation', 'surprise-moments.json')));
const itemById = new Map(publicItems.map((item) => [item.id, item]));
const featuredMoments = curated.map(([itemId, timestamp]) => {
  const item = itemById.get(itemId);
  const moment = item?.moments.find((entry) => entry.timestamp === timestamp);
  if (!moment) throw new Error(`Missing curated moment: ${itemId} at ${timestamp}`);
  return { itemId, timestamp, description: moment.description };
});
fs.writeFileSync(path.join(dataDir, 'featured-moments.json'), JSON.stringify(featuredMoments));
console.log(`Prepared ${publicItems.length} items, ${chunks.length} transcript chunks, and ${themes.length} themes.`);
