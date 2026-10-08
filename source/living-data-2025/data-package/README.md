# Living Data 2025: Darwin Core Data Package pilot

Private, personal-use extraction of the two session recordings from 21 October
2025, Ballroom A. This directory is separate from the live 2026 datasets and
is not consumed by the site's data build.

## Sources

- [Part 1](https://www.youtube.com/watch?v=RH05GIF0xWk)
- [Part 2](https://www.youtube.com/watch?v=sPsR0X69PsM)
- [Official programme](https://www.livingdata2025.com/program.html)
- Programme data: `files/Sessions.json` and `files/Abstracts.json` on that site.
  The relevant original rows are preserved in `programme.json`, including
  abstracts, scheduled presenters, affiliations, times and source URLs.

YouTube's January 2026 upload dates are retained as source metadata and are
distinct from the October 2025 conference date. Video descriptions and the
programme are context; the captions determine which presentations occurred
in each recording, their order and their recording-relative times.

## Files and provenance

- `raw/`: original YouTube `en-orig` automatic captions in JSON3 format and
  compact video metadata. No videos were downloaded. There were no manually
  supplied captions for either recording when retrieved on 8 October 2026.
- `recordings.json`: source manifest, event dates, video IDs and file paths.
- `part-N.srt` and `part-N.transcript.txt`: prepared caption cues. Every
  nonempty original text event is retained; whitespace is flattened, cue
  starts are unchanged, and overlapping display ends are clipped to the next
  text cue's start. The original JSON3 retains the original display windows.
- `caption-preparation.json`: raw caption hashes, cue/word counts and bounds.
- `worker-prompt.md`: the exact task given to Claude Opus 5.5. It adapts the
  existing extraction specification and schema for these 2025 recordings.
- `worker-run.json`: completed run metadata and an audit of the worker's full
  transcript read ranges.
- `output/part-N.json`: worker extraction with talks, discussions, timestamped
  evidence, source segments, unassigned material and programme reconciliation.
- `output/review-notes.md`: worker's account of reading coverage, identification
  uncertainties, caption issues and programme discrepancies.
- `output/validation-report.json`: structural, timestamp, excerpt provenance,
  duplicate/reference and caption coverage checks from `validate.py`.
- `output/review-corrections.json`: parent review corrections and output hashes.
  Unknown affiliations/abstracts were standardised to the schema's empty
  strings; three verbatim quotes were linked one cue earlier to include their
  opening words. Quote text and substantive claims were preserved.

The worker has Read and Write tools only. It is instructed to read both full
transcripts and write only the extraction and review files. It does not change
the site, publish, commit, push or infer cross-year progress. Operational logs
are kept under the existing ignored `.claude/pilots/data-package-2025/` path.

## Reproduce caption preparation and validation

From the repository root:

```sh
python3 source/living-data-2025/data-package/prepare.py
python3 source/living-data-2025/data-package/validate.py
```

To retrieve the same source language/format again (YouTube captions can change):

```sh
yt-dlp --skip-download --write-auto-subs --sub-langs en-orig --sub-format json3 \
  -o 'source/living-data-2025/data-package/raw/%(id)s.%(ext)s' \
  'https://www.youtube.com/watch?v=RH05GIF0xWk' \
  'https://www.youtube.com/watch?v=sPsR0X69PsM'
```

## Limits and next stage

Automatic captions can misrecognise people, identifiers, acronyms and technical
terms. Uncaptioned intervals cannot establish what was said. No audio/video
verification has been performed. Schema/timestamp checks do not establish the
semantic accuracy of every summary or attribution.

## Extraction result

The completed pilot contains 11 scheduled presentations, one substantive
introduction (stored as a talk), and two discussions: 14 content items in total.
All 3,769 caption cues are accounted for by content or unassigned intervals.
There are 157 timestamped claims, notable moments and Q&A entries. Validation
passes with no structural or timestamp warnings. One claim per item was also
spot-checked against the captions; these samples were supported.

The actual talk order matches the official programme in both parts. The Part 2
YouTube description incorrectly repeats Part 1's case-study list. Federico
Méndez's talk has a separate later Q&A segment; duration is the combined length
of its source segments, which the validator supports. The substantive opening
is retained because it explains the model and diagram conventions.

Remaining review flags include uncertain discussion speaker names and ASR
terms, especially in the marine survey and GBIF implementation talks. See
`output/review-notes.md`; passing checks do not resolve those uncertainties.

## Theme mapping and comparison

The [comparison report](../../../derived/living-data-2025/data-package/comparison.md)
maps all 14 items and 118 raw-tag occurrences to 37 existing themes. Eight tag
occurrences are retained unmapped with reasons. Organism interactions and data
exchange performance are proposed as missing themes; neither has been added to
the main catalogue. The original extraction still retains its raw tags.

All 255 existing 2026 records were scanned as structured metadata to suggest
candidates. Seventy ranked suggestions remain explicitly unreviewed. Twelve
selected comparisons have manual checks against caption passages from both
years, with timestamps, exact cues, source hashes and attribution caveats.
Six editorial follow-up questions retain their supporting 2025 passages.
This is a selected comparison set, not an exhaustive review of every 2026
recording. Audio has not been checked.

The comparison distinguishes continuity within a speaker/project, recurring
questions, parallel examples and contrasts between projects. It does not infer
causal influence. The 2025 symposium and full 2026 conference have unequal
coverage, so theme counts cannot establish changes in prominence or absence.

Structured outputs live in `derived/living-data-2025/data-package/` and remain
separate from the site's datasets. Theme membership and reviewed comparison
IDs are available for a future timeline interface; the interface is not yet
implemented. Original extraction hashes are checked against the prior review
record, and the main 2026 data has not been edited.

Regenerate the comparison and run its source/reference checks:

```sh
python3 source/living-data-2025/data-package/compare.py
```

To validate saved comparison outputs without regenerating them:

```sh
python3 source/living-data-2025/data-package/validate_comparison.py
```
