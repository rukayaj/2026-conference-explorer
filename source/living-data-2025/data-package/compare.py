"""Build isolated, curated cross-year pilot data and source-linked reports."""

import copy
import hashlib
import html
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
ROOT = SOURCE.parents[2]
DEST = ROOT / "derived/living-data-2025/data-package"


def read(path):
    return json.loads(path.read_text())


def write(name, data):
    (DEST / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def seconds(value):
    h, m, s = value.replace(",", ".").split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def stamp(value):
    total = round(value * 1000)
    s, ms = divmod(total, 1000)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02}:{m:02}:{s:02}.{ms:03}"


def clean(value):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", "", value)).split())


def normal(value):
    value = unicodedata.normalize("NFKD", value.casefold())
    return " ".join(re.findall(r"[a-z0-9]+", "".join(c for c in value if not unicodedata.combining(c))))


def srt(path):
    cues = []
    for block in re.split(r"\n\s*\n", path.read_text().replace("\r", "")):
        lines = block.splitlines()
        for index, line in enumerate(lines):
            match = re.search(r"(\d\d:\d\d:\d\d[,.]\d+)\s*-->\s*(\d\d:\d\d:\d\d[,.]\d+)", line)
            if match:
                text = clean(" ".join(lines[index + 1:]))
                if text:
                    cues.append((seconds(match[1]), seconds(match[2]), text))
                break
    return cues


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    catalogue = read(ROOT / "derived/themes.json")
    theme_by_id = {t["id"]: t for t in catalogue}
    mapping = read(DEST / "theme_mapping.json")
    decisions = {m["item_id"]: m for m in mapping["items"]}
    old, paths, cues_by_recording = [], [], {}
    for part in [1, 2]:
        path = SOURCE / f"output/part-{part}.json"
        paths.append(path)
        extraction = read(path)
        recording = extraction["recording"]
        cues_by_recording[recording["recording_id"]] = srt(SOURCE / recording["transcript_source"])
        for original in extraction["content_items"]:
            item = copy.deepcopy(original)
            decision = decisions[item["id"]]
            assert [row["raw_theme"] for row in decision["decisions"]] == item["themes_raw"], "Raw tag decisions drifted"
            themes = []
            for row in decision["decisions"]:
                assert row["reason"], "Every decision needs a rationale"
                themes.extend(row["theme_ids"])
            themes.extend(row["theme_id"] for row in decision["item_additions"])
            item["themes_normalized"] = list(dict.fromkeys(themes))
            assert set(item["themes_normalized"]) <= theme_by_id.keys()
            item.update({"recording_id": recording["recording_id"], "conference": recording["conference"], "year": 2025,
                         "conference_date": recording["date"], "room": recording["room"], "video_provider": "youtube",
                         "video_url": recording["video_url"], "source_file": str(path.relative_to(ROOT)), "source_sha256": sha(path)})
            old.append(item)
    assert set(decisions) == {i["id"] for i in old}
    new = read(ROOT / "derived/content_items.json")
    recordings = {r["id"]: r for r in read(ROOT / "derived/recordings.json")}
    all_items = {i["id"]: i for i in old + new}
    assert len(all_items) == len(old) + len(new)
    write("content_items.json", old)

    # Candidate discovery scans all existing structured items. Scores are a
    # ranking aid, not probabilities or evidence of historical influence.
    stop = set("a an and as at be by data for from in is it of on or that the their this to using was were with darwin core package biodiversity model models".split())
    def tokens(item):
        text = " ".join([item["title"], item["summary"], *item["key_points"], *[e["name"] for e in item["entities"]]])
        return set(normal(text).split()) - stop
    new_tokens = {i["id"]: tokens(i) for i in new}
    frequency = Counter(w for values in new_tokens.values() for w in values)
    broad = {"darwin-core-data-package", "schema-design-and-data-modelling", "data-publishing-and-mobilisation", "standards-development-and-governance"}
    candidates = []
    for item in old:
        words = tokens(item)
        names = {normal(s["name"]) for s in item["actual"]["speakers"] if "surname" not in s["name"] and "unnamed" not in s["name"].casefold()}
        ranks = []
        for other in new:
            shared_words = words & new_tokens[other["id"]]
            lexical = sum(math.log(1 + len(new) / (1 + frequency[w])) for w in shared_words) / max(1, math.sqrt(len(words)))
            speakers = [s["name"] for s in other["actual"]["speakers"] if normal(s["name"]) in names]
            themes = set(item["themes_normalized"]) & set(other["themes_normalized"])
            score = lexical + 5 * len(speakers) + 1.5 * len(themes - broad) + 0.25 * len(themes & broad)
            ranks.append({"item_2026": other["id"], "title": other["title"], "ranking_score": round(score, 4),
                          "shared_speaker_labels": speakers, "shared_themes": sorted(themes), "review_status": "candidate_only",
                          "caution": "Names inherit extraction uncertainty; shared words/themes/speakers do not establish influence."})
        candidates.append({"item_2025": item["id"], "candidates": sorted(ranks, key=lambda r: (-r["ranking_score"], r["item_2026"]))[:5]})
    write("candidate_links.json", {"search_scope": {"2025_items": len(old), "2026_items": len(new)}, "method": "Transparent lexical IDF, shared specific themes and normalised speaker labels; top five per 2025 item. All candidates are unreviewed suggestions.", "items": candidates})

    def evidence(spec, year):
        item = all_items[spec["item_id"]]
        rid = item["recording_id"]
        if rid not in cues_by_recording:
            cues_by_recording[rid] = srt(ROOT / "source" / recordings[rid]["transcript_source"])
        anchor = seconds(spec["timestamp"])
        segments = [(seconds(s["start_timestamp"]), seconds(s["end_timestamp"])) for s in item["source_segments"]]
        assert any(a <= anchor < b for a, b in segments), f"Anchor outside item: {spec}"
        window = (anchor - spec.get("before_seconds", 5), anchor + spec.get("after_seconds", 60))
        cues = [c for c in cues_by_recording[rid] if window[0] <= c[0] <= window[1] and any(a <= c[0] < b for a, b in segments)]
        assert cues, f"No caption evidence: {spec}"
        url = item["video_url"]
        link = f"{url}&t={math.floor(anchor)}s" if year == 2025 else f"{url}#t={math.floor(anchor)}s"
        path = SOURCE / f"part-{1 if '-p1-' in item['id'] else 2}.srt" if year == 2025 else ROOT / "source" / recordings[rid]["transcript_source"]
        return {"item_id": item["id"], "title": item["title"], "year": year, "speakers": item["actual"]["speakers"],
                "speaker_notes": item["actual"]["identification_notes"], "timestamp": spec["timestamp"], "video_link": link,
                "source_file": str(path.relative_to(ROOT)), "source_sha256": sha(path), "passage_start": stamp(cues[0][0]),
                "passage_end": stamp(cues[-1][1]), "passage": " ".join(c[2] for c in cues),
                "caption_cues": [{"start": stamp(a), "end": stamp(b), "text": t} for a, b, t in cues]}

    curated = read(DEST / "comparison_decisions.json")
    links = []
    for decision in curated["links"]:
        assert set(decision["theme_ids"]) <= theme_by_id.keys()
        link = {k: v for k, v in decision.items() if k not in ["evidence_2025", "evidence_2026"]}
        link["evidence_2025"] = evidence(decision["evidence_2025"], 2025)
        link["evidence_2026"] = evidence(decision["evidence_2026"], 2026)
        links.append(link)
    questions = [{**q, "evidence_2025": evidence(q["evidence_2025"], 2025)} for q in curated["open_questions"]]
    write("comparison_links.json", {"coverage_note": "2025 is one selected symposium; 2026 candidates span the existing conference corpus. This supports individual comparisons, not trends in prevalence, absence or overall progress. Links are interpretive comparisons, never assumed causal lineage.", "links": links})
    write("open_questions.json", {"scope": "Editorial follow-up prompts inspired by the recordings, not necessarily questions asked verbatim in either year. Unmatched questions are gaps in this reviewed set, not evidence of absence in 2026.", "questions": questions})
    themes = []
    for theme in catalogue:
        ids = [i["id"] for i in old if theme["id"] in i["themes_normalized"]]
        if ids:
            themes.append({"id": theme["id"], "name": theme["name"], "description": theme["description"],
                           "content_item_ids_2025": ids, "content_item_ids_2026": theme["content_item_ids"],
                           "comparison_link_ids": [l["id"] for l in links if theme["id"] in l["theme_ids"]],
                           "coverage_warning": "2025 counts cover only this symposium; 2026 counts cover the conference. Do not compare prominence."})
    write("themes.json", themes)
    paired = {l["evidence_2025"]["item_id"] for l in links}
    unmapped = [{"item_id": i["item_id"], **r} for i in mapping["items"] for r in i["decisions"] if not r["theme_ids"]]
    report = {"valid": all(l["review_status"] == "caption_checked" for l in links), "2025_items_mapped": len(old),
              "raw_tag_occurrences": sum(len(i["themes_raw"]) for i in old), "catalogue_themes_used": len(themes),
              "unmapped_tag_occurrences": len(unmapped), "candidate_pairs": sum(len(i["candidates"]) for i in candidates),
              "reviewed_comparisons": sum(l["review_status"] == "caption_checked" for l in links),
              "items_without_reviewed_comparison": [i["id"] for i in old if i["id"] not in paired],
              "unmapped_tags": unmapped, "source_hashes": {str(p.relative_to(ROOT)): sha(p) for p in paths + [ROOT / "derived/themes.json", ROOT / "derived/content_items.json", ROOT / "derived/recordings.json", DEST / "theme_mapping.json", DEST / "comparison_decisions.json"]},
              "limits": ["Caption text checked, audio not checked.", "Candidate discovery is metadata retrieval, not exhaustive semantic review of all 2026 recordings.", "Unpaired items and unanswered questions are gaps in this reviewed set, not evidence of absence in 2026.", "Uncertain discussion speakers and the GBIF 2026 co-presenter remain uncertain.", "The 2026 main site datasets and original 2025 extraction are unchanged."]}
    write("validation-report.json", report)

    lines = ["# Data Package: 2025 → 2026", "", "One 2025 symposium compared with selected moments from the 2026 conference. All connections below are interpretations grounded in caption passages. No causal influence is assumed, and unequal recording coverage prevents conference-wide trend claims.", "", "The strongest development threads are GBIF’s validation work and Holly Little’s fossil vocabulary and publishing models. Profile governance, schema versioning and occurrence identifiers remain active questions in the selected 2026 talks. Other pairs illustrate parallel approaches or contrasts between projects, rather than a direct historical follow-up.", "", f"Mapped {len(old)} items and {report['raw_tag_occurrences']} raw tags to {len(themes)} existing themes. Retained {len(unmapped)} unmapped tag occurrences with reasons. Compared all {len(old)} items against metadata from {len(new)} 2026 items; the {len(links)} comparisons below were selected for source review.", "", "## Theme mapping", "", "| 2025 item | Existing themes |", "|---|---|"]
    for item in old:
        lines.append(f"| {item['title']} | {', '.join(theme_by_id[t]['name'] for t in item['themes_normalized'])} |")
    lines += ["", "The symposium is deliberately narrow. Its counts do not measure what became more or less popular across conferences. Proposed themes for organism interactions and export performance are retained separately; no existing theme IDs were renamed.", "", "## Comparisons", ""]
    for link in links:
        a, b = link["evidence_2025"], link["evidence_2026"]
        lines += [f"### {link['title']}", "", f"**Relationship:** {link['relationship_type'].replace('_', ' ')}. **Review:** {link['review_status'].replace('_', ' ')}.", "", f"**2025:** {link['then']} [Watch at {a['timestamp']}]({a['video_link']}).", "", f"**2026:** {link['now']} [Watch at {b['timestamp']}]({b['video_link']}).", "", f"**Interpretation:** {link['interpretation']}", "", f"**Limit:** {link['caveat']}", ""]
    lines += ["## Questions to keep open", "", "These are editorial follow-up prompts, not necessarily questions asked verbatim in either year.", ""]
    for question in questions:
        endpoint = question["evidence_2025"]
        lines += [f"- **{question['question']}** {question['assessment']} [2025 source]({endpoint['video_link']})."]
    lines += ["", "## Data and review", "", "- `theme_mapping.json`: every raw-tag decision, its reason, and proposed missing themes.", "- `content_items.json`: enriched copies of the pilot records with mapped themes; original extraction untouched.", "- `candidate_links.json`: ranked suggestions, explicitly unreviewed.", "- `comparison_decisions.json`: curated interpretation and evidence anchors.", "- `comparison_links.json`: source passages, exact cue boundaries, video links and speaker uncertainty.", "- `open_questions.json`: editorial questions with supporting source passages and comparison references.", "- `themes.json`: shared theme IDs with separately scoped 2025/2026 membership and comparison links.", "- `validation-report.json`: coverage, source hashes and limitations.", "", "Regenerate from the repository root with `python3 source/living-data-2025/data-package/compare.py`. Site integration and the timeline interface remain separate work.", ""]
    (DEST / "comparison.md").write_text("\n".join(lines))
    from validate_comparison import validate
    report = validate()
    print(json.dumps({k: report[k] for k in ["valid", "2025_items_mapped", "raw_tag_occurrences", "catalogue_themes_used", "unmapped_tag_occurrences", "candidate_pairs", "reviewed_comparisons"]}, indent=2))
    if not report["valid"]:
        raise SystemExit("Comparison validation failed; see validation-report.json")


if __name__ == "__main__":
    main()
