"""Prepare the downloaded JSON3 captions without shifting recording timestamps."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def stamp(milliseconds, separator="."):
    seconds, ms = divmod(milliseconds, 1000)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02}:{minutes:02}:{seconds:02}{separator}{ms:03}"


def prepare(recording):
    source = ROOT / recording["caption_source"]
    raw = json.loads(source.read_text())
    events = []
    for event in raw["events"]:
        text = " ".join("".join(s.get("utf8", "") for s in event.get("segs", [])).split())
        if text:
            events.append((event, text))
    srt, readable = [], []
    for index, (event, text) in enumerate(events):
        start = event["tStartMs"]
        end = start + event["dDurationMs"]
        # Auto-captions have overlapping display windows. Preserve all text and
        # starts, but end a cue when the next spoken-text cue starts.
        if index + 1 < len(events):
            end = min(end, events[index + 1][0]["tStartMs"])
        if end <= start:
            raise ValueError(f"Non-positive cue at {start} in {source}")
        srt.append(f"{index + 1}\n{stamp(start, ',')} --> {stamp(end, ',')}\n{text}\n")
        readable.append(f"[{stamp(start)} --> {stamp(end)}] {text}")
    (ROOT / recording["transcript_source"]).write_text("\n".join(srt))
    (ROOT / recording["readable_transcript"]).write_text("\n".join(readable) + "\n")
    return {
        "id": recording["id"],
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "cue_count": len(events),
        "word_count": sum(len(text.split()) for _, text in events),
        "first_cue_start": stamp(events[0][0]["tStartMs"]),
        "last_cue_end": stamp(end),
    }


if __name__ == "__main__":
    manifest = json.loads((ROOT / "recordings.json").read_text())
    report = [prepare(recording) for recording in manifest]
    (ROOT / "caption-preparation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
