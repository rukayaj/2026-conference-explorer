"""Validate the isolated pilot against its schema, captions and programme."""

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCHEMA = json.loads((ROOT.parents[1] / "json-template.json").read_text())
errors, warnings, checks = [], [], []


def require(condition, message):
    if not condition:
        errors.append(message)


def seconds(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{2}:\d{2}:\d{2}(?:[.,]\d{1,3})?", value):
        raise ValueError(f"Invalid timestamp: {value!r}")
    h, m, s = value.replace(",", ".").split(":")
    if int(m) >= 60 or float(s) >= 60:
        raise ValueError(f"Invalid timestamp: {value!r}")
    return int(h) * 3600 + int(m) * 60 + float(s)


def normalized(text):
    return " ".join(text.split())


def shape(value, template, label):
    if value is None and (label.endswith(".programme") or label.endswith(".representative_excerpt")):
        return
    if isinstance(template, dict):
        require(isinstance(value, dict), f"{label}: expected object")
        if not isinstance(value, dict):
            return
        for key, child in template.items():
            require(key in value, f"{label}: missing {key}")
            if key in value:
                shape(value[key], child, f"{label}.{key}")
    elif isinstance(template, list):
        require(isinstance(value, list), f"{label}: expected array")
        if isinstance(value, list) and template:
            for index, child in enumerate(value):
                shape(child, template[0], f"{label}[{index}]")
    elif isinstance(template, str):
        nullable = label.endswith(".programme_id") or label.endswith(".content_item_id")
        require(isinstance(value, str) or (nullable and value is None), f"{label}: expected string")


def validate():
    manifest = json.loads((ROOT / "recordings.json").read_text())
    programme = json.loads((ROOT / "programme.json").read_text())
    programme_by_id = {row["pilot_programme_id"]: row for row in programme["items"]}
    prep = {row["id"]: row for row in json.loads((ROOT / "caption-preparation.json").read_text())}
    all_items, all_statuses = {}, []
    for recording in manifest:
        path = ROOT / recording["output_file"]
        if not path.exists():
            errors.append(f"Missing extraction: {path.name}")
            continue
        data = json.loads(path.read_text())
        shape(data, SCHEMA, path.name)
        meta = data["recording"]
        for key in ["conference", "date", "room", "video_url", "transcript_source", "video_provider", "video_id", "caption_kind", "recording_id", "year", "session_id"]:
            expected = recording["id"] if key == "recording_id" else recording.get(key)
            require(meta.get(key) == expected, f"{path.name}: incorrect recording.{key}")
        raw_path = ROOT / recording["caption_source"]
        raw = json.loads(raw_path.read_text())
        require(hashlib.sha256(raw_path.read_bytes()).hexdigest() == prep[recording["id"]]["source_sha256"], f"{path.name}: raw captions changed")
        cues = []
        for line in (ROOT / recording["readable_transcript"]).read_text().splitlines():
            match = re.fullmatch(r"\[([^ ]+) --> ([^]]+)\] (.*)", line)
            require(match is not None, f"{path.name}: malformed prepared cue")
            if match:
                cues.append((seconds(match[1]), seconds(match[2]), match[3]))
        cue_starts = {round(c[0], 3) for c in cues}
        boundaries = cue_starts | {round(c[1], 3) for c in cues}
        maximum = max(recording["duration_seconds"], max(c[1] for c in cues))
        assigned = []
        for item in data["content_items"]:
            label = item["id"]
            require(label not in all_items, f"Duplicate ID: {label}")
            all_items[label] = item
            part = recording["id"][-1]
            require(label.startswith(f"livingdata-2025-dp-p{part}-"), f"{label}: unexpected ID prefix")
            require(item["type"] in ["talk", "discussion"], f"{label}: invalid type")
            require(bool(item["title"].strip()) and bool(item["summary"].strip()), f"{label}: empty title/summary")
            require(item["themes_normalized"] == [], f"{label}: themes must remain unnormalized")
            for field in ["identification_confidence", "transcript_quality"]:
                require(item["actual"][field] in ["high", "medium", "low"], f"{label}: invalid {field}")
            require(item["audience_level"] in ["general", "intermediate", "specialist"], f"{label}: invalid audience level")
            require(item["programme_match"]["status"] in ["matched", "replacement", "unprogrammed", "uncertain"], f"{label}: invalid programme match")
            require(set(item["content_type"]) <= {"research", "software/tool", "standard", "infrastructure", "dataset", "workflow/method", "case study", "community/project", "policy/governance", "conceptual", "discussion"}, f"{label}: invalid content type")
            pid = item["programme_id"]
            require(pid is None or pid in programme_by_id, f"{label}: unknown programme ID {pid}")
            if pid is None:
                require(item["programme"] is None, f"{label}: unprogrammed item has programme data")
            segments = [(seconds(s["start_timestamp"]), seconds(s["end_timestamp"])) for s in item["source_segments"]]
            require(bool(segments), f"{label}: no source segments")
            for index, (start, end) in enumerate(segments):
                require(0 <= start < end <= maximum + 0.001, f"{label}: invalid source interval {start}–{end}")
                require(round(start, 3) in cue_starts and round(end, 3) in boundaries, f"{label}: boundaries do not match caption cues")
                require(index == 0 or start >= segments[index - 1][1], f"{label}: unordered/overlapping segments")
                assigned.append((start, end, label))
            if segments:
                require(abs(seconds(item["actual"]["start_timestamp"]) - segments[0][0]) < 0.001, f"{label}: actual start differs from source")
                require(abs(seconds(item["actual"]["end_timestamp"]) - segments[-1][1]) < 0.001, f"{label}: actual end differs from source")
                duration = item["actual"]["duration_seconds"]
                require(isinstance(duration, (int, float)) and not isinstance(duration, bool), f"{label}: invalid duration")
                if isinstance(duration, (int, float)) and abs(duration - sum(end - start for start, end in segments)) > 1:
                    warnings.append(f"{label}: duration differs from combined source segments")
            cited = []
            for field in ["notable_claims", "notable_moments", "q_and_a"]:
                cited.extend((field, obj["timestamp"]) for obj in item[field] if obj.get("timestamp"))
            excerpt = item["representative_excerpt"]
            if excerpt:
                cited.append(("representative_excerpt", excerpt["timestamp"]))
                t = seconds(excerpt["timestamp"])
                nearby = normalized(" ".join(text for a, _, text in cues if t - 0.001 <= a <= t + 60 and any(s <= a <= e for s, e in segments)))
                require(normalized(excerpt["text"]) in nearby, f"{label}: excerpt not verbatim in captions near its timestamp")
            for field, value in cited:
                time = seconds(value)
                require(any(start <= time < end for start, end in segments), f"{label}: {field} timestamp outside source segments: {value}")
                require(round(time, 3) in cue_starts, f"{label}: {field} timestamp is not an exact caption start: {value}")
        assigned.sort()
        for previous, current in zip(assigned, assigned[1:]):
            require(current[0] >= previous[1] - 0.001, f"{path.name}: overlap between {previous[2]} and {current[2]}")
        for gap in data["unassigned"]:
            start, end = seconds(gap["start_timestamp"]), seconds(gap["end_timestamp"])
            require(0 <= start < end <= maximum + 0.001, f"{path.name}: invalid unassigned interval")
            require(gap["type"] in ["introduction", "announcement", "break", "technical_issue", "room_chatter", "repeated_content", "unidentifiable"], f"{path.name}: invalid unassigned type")
            require(not any(start < b - 0.001 and end > a + 0.001 for a, b, _ in assigned), f"{path.name}: unassigned interval overlaps content")
        status_ids = [row["programme_id"] for row in data["programme_status"]]
        require(len(status_ids) == len(set(status_ids)), f"{path.name}: duplicate programme status")
        scheduled = {pid for pid, row in programme_by_id.items() if row["Session_ID"] == recording["session_id"]}
        require(scheduled <= set(status_ids), f"{path.name}: scheduled items missing programme status")
        all_statuses.extend(data["programme_status"])
        covered = [False] * len(cues)
        for index, (start, _, _) in enumerate(cues):
            covered[index] = any(a <= start < b for a, b, _ in assigned) or any(seconds(g["start_timestamp"]) <= start < seconds(g["end_timestamp"]) for g in data["unassigned"])
        missing = sum(not value for value in covered)
        if missing:
            warnings.append(f"{path.name}: {missing}/{len(cues)} caption starts are outside content/unassigned intervals")
        counts = Counter(item["type"] for item in data["content_items"])
        checks.append({"recording_id": recording["id"], "talks": counts["talk"], "discussions": counts["discussion"], "caption_cues": len(cues), "covered_caption_cues": len(cues) - missing, "timestamped_evidence": sum(len(item[field]) for item in data["content_items"] for field in ["notable_claims", "notable_moments", "q_and_a"])})
    for status in all_statuses:
        pid = status["programme_id"]
        require(pid in programme_by_id, f"Unknown programme status ID: {pid}")
        require(status["status"] in ["presented", "not_presented", "uncertain"], f"{pid}: invalid programme status")
        target = status.get("content_item_id")
        if target:
            require(target in all_items, f"{pid}: unknown programme status target {target}")
            if target in all_items:
                require(all_items[target]["programme_id"] == pid, f"{pid}: programme status points to a different talk")
    for pid, count in Counter(item["programme_id"] for item in all_items.values() if item["programme_id"]).items():
        require(count == 1, f"{pid}: programme item extracted more than once")


if __name__ == "__main__":
    try:
        validate()
    except (ValueError, KeyError, TypeError, IndexError) as exc:
        errors.append(f"Validation could not finish: {exc}")
    report = {"valid": not errors, "checks": checks, "errors": errors, "warnings": warnings, "scope": "Structural, timestamp, caption-excerpt and programme-reference checks. This does not establish semantic accuracy or cross-year progress."}
    (ROOT / "output" / "validation-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    sys.exit(bool(errors))
