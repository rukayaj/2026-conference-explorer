"""Check saved pilot mappings, references and caption evidence against sources."""

import json
import math

from compare import DEST, ROOT, SOURCE, read, seconds, sha, srt, stamp, write


def validate():
    errors, checked = [], 0

    def check(condition, message):
        nonlocal checked
        checked += 1
        if not condition:
            errors.append(message)

    report = read(DEST / "validation-report.json")
    catalogue = {t["id"]: t for t in read(ROOT / "derived/themes.json")}
    mapping = read(DEST / "theme_mapping.json")
    old = read(DEST / "content_items.json")
    new = read(ROOT / "derived/content_items.json")
    items = {i["id"]: i for i in old + new}
    check(len(items) == len(old) + len(new), "Duplicate content IDs")
    originals = {}
    baseline = read(SOURCE / "output/review-corrections.json")["output_hashes"]
    for part in [1, 2]:
        path = SOURCE / f"output/part-{part}.json"
        check(sha(path) == baseline[path.name]["reviewed_sha256"], f"Original extraction changed: {path.name}")
        originals.update({i["id"]: i for i in read(path)["content_items"]})
    check(set(originals) == {i["id"] for i in old}, "Mapped items do not cover original extraction")
    map_by_id = {i["item_id"]: i for i in mapping["items"]}
    check(len(map_by_id) == len(mapping["items"]) == len(old), "Mapping IDs are not unique and complete")
    for item in old:
        for key, value in originals[item["id"]].items():
            if key != "themes_normalized":
                check(item[key] == value, f"Original content changed: {item['id']}.{key}")
        mapped = map_by_id[item["id"]]
        check([d["raw_theme"] for d in mapped["decisions"]] == item["themes_raw"], f"Raw tags changed: {item['id']}")
        expected = []
        for decision in mapped["decisions"]:
            check(bool(decision["reason"]), f"Missing mapping rationale: {item['id']}")
            expected.extend(decision["theme_ids"])
        for addition in mapped["item_additions"]:
            check(bool(addition["reason"]), f"Missing addition rationale: {item['id']}")
            expected.append(addition["theme_id"])
        check(item["themes_normalized"] == list(dict.fromkeys(expected)), f"Theme mapping mismatch: {item['id']}")
        check(set(expected) <= catalogue.keys(), f"Unknown theme ID: {item['id']}")
    for path, digest in report["source_hashes"].items():
        check(sha(ROOT / path) == digest, f"Input changed since generation: {path}")

    links = read(DEST / "comparison_links.json")["links"]
    link_by_id = {l["id"]: l for l in links}
    check(bool(links) and len(link_by_id) == len(links), "Comparison IDs empty or duplicated")
    curated = read(DEST / "comparison_decisions.json")
    check([l["id"] for l in links] == [l["id"] for l in curated["links"]], "Curated comparison coverage mismatch")
    recordings = {r["id"]: r for r in read(ROOT / "derived/recordings.json")}
    source_cache = {}

    def evidence_check(e, spec, year):
        item = items[e["item_id"]]
        check(e["item_id"] == spec["item_id"] and e["timestamp"] == spec["timestamp"], "Evidence anchor changed")
        expected_path = SOURCE / f"part-{1 if '-p1-' in item['id'] else 2}.srt" if year == 2025 else ROOT / "source" / recordings[item["recording_id"]]["transcript_source"]
        path = ROOT / e["source_file"]
        check(path == expected_path, f"Wrong source recording: {item['id']}")
        check(e["source_sha256"] == sha(path), f"Caption source changed: {path.name}")
        check(e["year"] == year and e["speakers"] == item["actual"]["speakers"] and e["speaker_notes"] == item["actual"]["identification_notes"], f"Evidence metadata changed: {item['id']}")
        segments = [(seconds(s["start_timestamp"]), seconds(s["end_timestamp"])) for s in item["source_segments"]]
        anchor = seconds(spec["timestamp"])
        check(any(a <= anchor < b for a, b in segments), f"Anchor outside item: {item['id']}")
        if path not in source_cache:
            source_cache[path] = srt(path)
        window = (anchor - spec.get("before_seconds", 5), anchor + spec.get("after_seconds", 60))
        expected = [{"start": stamp(a), "end": stamp(b), "text": t} for a, b, t in source_cache[path]
                    if window[0] <= a <= window[1] and any(x <= a < y for x, y in segments)]
        check(bool(expected) and e["caption_cues"] == expected, f"Caption window differs from source: {item['id']}")
        check(e["passage"] == " ".join(c["text"] for c in expected), f"Passage differs from cues: {item['id']}")
        if expected:
            check(e["passage_start"] == expected[0]["start"] and e["passage_end"] == expected[-1]["end"], f"Passage bounds differ: {item['id']}")
        watch = f"{item['video_url']}&t={math.floor(anchor)}s" if year == 2025 else f"{item['video_url']}#t={math.floor(anchor)}s"
        check(e["video_link"] == watch, f"Video link differs from source item: {item['id']}")

    for link, decision in zip(links, curated["links"]):
        check(link["review_status"] == "caption_checked" and bool(link["review_notes"]), f"Unreviewed comparison: {link['id']}")
        check(link["causal_lineage_asserted"] is False, f"Unexpected causal assertion: {link['id']}")
        check(set(link["theme_ids"]) <= catalogue.keys(), f"Unknown comparison theme: {link['id']}")
        for year in [2025, 2026]:
            evidence_check(link[f"evidence_{year}"], decision[f"evidence_{year}"], year)
    questions = read(DEST / "open_questions.json")["questions"]
    check(len(questions) == len(curated["open_questions"]), "Question coverage mismatch")
    for question, decision in zip(questions, curated["open_questions"]):
        check(question["review_status"] == "caption_checked", "Unreviewed question")
        check(set(question["comparison_link_ids"]) <= link_by_id.keys(), "Broken question comparison reference")
        evidence_check(question["evidence_2025"], decision["evidence_2025"], 2025)
    for theme in read(DEST / "themes.json"):
        check(theme["content_item_ids_2025"] == [i["id"] for i in old if theme["id"] in i["themes_normalized"]], "2025 theme membership differs")
        check(theme["content_item_ids_2026"] == catalogue[theme["id"]]["content_item_ids"], "2026 theme membership differs")
        check(theme["comparison_link_ids"] == [l["id"] for l in links if theme["id"] in l["theme_ids"]], "Theme comparison reference differs")
    candidate_sets = read(DEST / "candidate_links.json")["items"]
    check({i["item_2025"] for i in candidate_sets} == set(originals), "Candidate search misses pilot items")
    for group in candidate_sets:
        for candidate in group["candidates"]:
            check(candidate["item_2026"] in {i["id"] for i in new} and candidate["review_status"] == "candidate_only", "Candidate endpoint or review state invalid")

    report.update({"valid": not errors, "structural_checks_run": checked, "errors": errors,
                   "evidence_windows_checked": len(links) * 2 + len(questions),
                   "validation_scope": "Saved mappings, references, original extraction hashes and exact caption-window provenance. Semantic support was reviewed manually; these checks cannot establish it or verify audio."})
    write("validation-report.json", report)
    return report


if __name__ == "__main__":
    result = validate()
    print(json.dumps({k: result[k] for k in ["valid", "structural_checks_run", "evidence_windows_checked", "errors"]}, indent=2))
    raise SystemExit(0 if result["valid"] else 1)
