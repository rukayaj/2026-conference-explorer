# Review notes — Living Data 2025, Darwin Core Data Package symposium (Parts 1 & 2)

Extraction only. These notes are based on the YouTube **automatic** captions as provided in `part-1.transcript.txt` and `part-2.transcript.txt`. I did not watch the video or listen to the audio.

## Read coverage

All lines of both readable transcripts were read in order, in chunks of at most 400 lines, before any output was written:

- `part-1.transcript.txt` (1,812 cues): lines 1–400, 401–800, 801–1200, 1201–1600, 1601–1812.
- `part-2.transcript.txt` (1,957 cues): lines 1–400, 401–800, 801–1200, 1201–1600, 1601–1957.

I also read `source/transcript-prompt.txt`, `source/json-template.json`, `recordings.json`, `caption-preparation.json` and `programme.json`.

I did **not** read these: the raw JSON3 captions, the SRT files, the raw YouTube metadata/description files, `source/program-data.js` or `source/AGENT_TASK.md`. All timestamps come from cue boundaries in the readable transcripts.

## Actual talk order and speakers

### Part 1 — `RH05GIF0xWk` (session 6798937-1)

| # | Video time | Item | Presented by | Mode |
|---|---|---|---|---|
| 1 | 00:09:26.959–00:16:49.040 | Introduction (6798937-1-introduction) | Kate (Ingenloff), chair | in person |
| 2 | 00:16:49.040–00:26:03.880 | iNaturalist (7020785) | Carrie Seltzer | in person |
| 3 | 00:26:32.320–00:33:32.919 | BGBM collections (7009288) | Jörg Holetschek | in person |
| 4 | 00:34:15.839–00:45:15.720 | BROKE-West marine survey (7009182) | Yi-Ming Gan | in person |
| 5 | 00:46:00.560–00:52:03.800 | Insektmobilen (7020632) | Cecilie Svenningsen | recorded/virtual |
| 6 | 00:54:37.119–01:06:39.079 | Paleontological specimens (7018835) | Holly Little | recorded |
| 7 | 01:07:53.440–01:32:00.080 | Discussion (6798937-1-discussion) | Tim Robertson, John Wieczorek + audience | in person + online questions |

### Part 2 — `sPsR0X69PsM` (session 6798937-2)

| # | Video time | Item | Presented by | Mode |
|---|---|---|---|---|
| 1 | 00:02:04.479–00:22:56.039 | DwC-DP overview (7020859), incl. Q&A | John Wieczorek | in person |
| 2 | 00:23:20.559–00:31:54.360 | ABCD (7015382) | Anton Güntsch | in person |
| 3 | 00:32:53.440–00:43:31.000 | DiSSCo openDS (7019768) | Sam Leeflang | recorded |
| 4 | 00:44:30.720–00:53:08.280 + 01:00:09.280–01:01:44.280 | GBIF implementation status (7019798) | Federico Méndez | in person |
| 5 | 00:53:41.200–01:00:05.480 | IPT publishing tools (7016769) | Mikhail Podolskiy | in person |
| 6 | 01:03:06.799–01:09:32.520 | Public review process (7009601) | Steve Baskauf | recorded/virtual |
| 7 | 01:10:25.520–01:30:04.880 | Discussion (6798937-2-discussion) | Tim Robertson, John Wieczorek, Mikhail Podolskiy + audience | in person |

## Programme discrepancies and cross-part moves

- **No cross-part moves were found.** In both recordings the talks appear in the same order and the same part as `programme.json`. Every programme item is marked `presented` in the `programme_status` for its own part, and there are no duplicate or cross-referenced talks.
- The task brief says the programme and the recording descriptions disagree about part and order. I did not read the YouTube descriptions (they were not in the assigned files), so I cannot confirm what they say. **The transcripts support the programme.json split.** If the descriptions list a different split, they appear to be wrong. A human should check the descriptions against this.
- Corroborating evidence within the transcripts:
  - In Part 1 the chair previews the Part 2 agenda: overview, ABCD, GBIF status, publishing tools, public review. This preview omits the DiSSCo talk, which nonetheless happened in Part 2.
  - In Part 1, Tim Robertson says Sam Leeflang's recorded talk is "in the second session".
  - In Part 2, John Wieczorek refers to "the previous session", and Tim Robertson corrects a statement John made in Part 1 about workshops.
- **Timing:**
  - Part 1 ran about 15 minutes ahead of schedule. The chair says it is 3:05 when Q&A opens, with 25 minutes left, so the Discussion took about 24 minutes rather than the scheduled 10.
  - Part 2 was "a little bit behind schedule" by the ABCD talk.
- **Format:**
  - In Part 1 all questions were held to the end, so talk-specific Q&A could not be separated from the combined discussion.
  - In Part 2 one or two questions were taken after each talk, followed by a general Q&A.
- **Absent and virtual speakers:**
  - **Holly Little** was scheduled as virtual. The chair says the speaker could not attend in person "as planned" because of the US government shutdown. The talk was a recording by Holly Little; co-authors Erica (Krimmel) and Alex (Lawrence) were said to be online for questions.
  - **Sam Leeflang** could not travel. The talk was a recording by Sam Leeflang, who answered questions in the online chat; "Walter" offered to take room questions, but none were asked.
  - **Cecilie Svenningsen** and **Steve Baskauf** were scheduled as virtual and presented by recording. Steve Baskauf also replied in the chat, and the chair relayed the reply.
  - No replacement speakers were used. Every talk was given by the programme's named presenter.
- **Speakers vs co-authors:** `actual.speakers` lists only presenters. Coauthors are not listed, though some are mentioned in notes, e.g. John Wieczorek and Tim Robertson as co-authors on several abstracts.
  - John Wieczorek and Tim Robertson appear as discussion panellists.
  - Mikhail Podolskiy appears in the Part 2 discussion.
- **Federico Méndez's talk has two source segments.** The question taken after Mikhail Podolskiy's talk was explicitly addressed to Federico, so it is attached to Federico's item.
  - `actual.start_timestamp`/`end_timestamp` span both segments, which means they enclose Mikhail's talk.
  - `duration_seconds` (613) is the sum of the two segments, not end minus start.
  - The validator may need to allow this, or a reviewer may prefer a different convention.
- **Questions related to specific Part 2 talks but kept in the general discussion:**
  - Review participation and agreement questions relate to Steve Baskauf's talk.
  - Community dataset profiles relate to Mikhail Podolskiy's talk.
  - These were asked in the scheduled Discussion slot and answered by the panel, and the threads cross-reference one another, so they stay in the Discussion item. A reviewer could split them out if preferred.

## Caption gaps and repeated content

All gaps below are marked "no captions available". I have not assumed silence, a break or a technical failure.

**Part 1:**
- 00:00:00.000–00:09:26.959: lead-in with no captions.
- 00:52:41.800–00:53:09.680 and 00:53:13.000–00:54:15.440: gaps before the paleo recording, separated by "Just a moment."
- **Repeated content, 00:54:15.440–00:54:37.119:** Holly Little's opening sentences appear twice, with ASR "Hi, I'm Paul informatics manager in the department of biology…" the first time. This is recorded as `repeated_content`, and the talk starts at the second, complete run. I am describing the captions only; I cannot confirm from the text why the opening repeats.
- Small gaps of about 10–12 s at around 01:07:42, 01:11:51 and 01:16:01, within or near the discussion.

**Part 2:**
- 00:00:00.000–00:01:06.799: lead-in with no captions.
- 01:30:30.040–01:31:16.800: gap after the session closes.
- 01:31:16.800–01:35:05.880: only `[Music]` markers and isolated fragments ("the cowboy", "United", "reasonable" and similar).
- 01:35:05.880 to the end of the video (5806 s = 01:36:46.000): no captions.

## ASR issues and corrections applied

Names were corrected in summaries and entities from programme context. The original renderings are kept in `identification_notes`, and verbatim excerpts keep the ASR text unchanged.

**People:**
- "Karen Seltzer" → Carrie Seltzer.
- "Daniel Kchek" / "Yolichek" → Jörg Holetschek.
- "Ying Ming Gan" → Yi-Ming Gan.
- "Cecil Cecilia Swenson" → Cecilie Svenningsen. Captions begin mid-name as "Spinning".
- "Paul" → Holly.
- "John Vurik" / "John McCor" / "John Courage" → John Wieczorek.
- "Tim Rosson" → Tim Robertson.
- "Anon Gch" → Anton Güntsch.
- "Sam Lupang" / "Sam Leang" → Sam Leeflang.
- "Ric Mendes" → Federico Méndez.
- "Male Podski", "Mika", "Misha" → Mikhail Podolskiy.
- "Steve Basco" / "Baskoff" → Steve Baskauf.
- "Walter Bansson" → Walter Berendsohn (in Anton's talk).
- "Erica Criminal" → Erica Krimmel.
- "Edardo Klein" → Eduardo Klein (IMOS). Medium confidence, based on the stated affiliation.

**Organisations and terms:**
- "GBIFF", "JBIFF", "GIF", "JIF", "GBF" → GBIF.
- "Tadwig", "Tedwick" → TDWG.
- "Disco" → DiSSCo.
- "bioase" → BioCASe.
- "NFT for biodiversity" → NFDI4Biodiversity.
- "set 3950" → Z39.50.
- "Bhutanic Museum" → Botanic Museum.
- "obus", "OBS" → OBIS.
- "insect mob" → Insektmobilen.
- "bird west" → BROKE-West.
- "humble extension" → Humboldt Extension.
- "pluragama antarctic" → Pleuragramma antarctica.
- Darwin Core variants ("Davenco", "Davenport", "Diamond Core", "Darcore", "Dharma core", "Daring Cove", "dial", "ding core") → Darwin Core.
- "frictions data packages" → Frictionless Data Packages.
- "IP" / "AP" → IPT.
- "MDT" / "entity" → Metabarcoding Data Toolkit.

**Uncertain renderings (not resolved, flagged in notes):**
- Yi-Ming Gan's portal: "Scott and biodiversity portal… dri and obus node". This is likely the (SCAR) Antarctic Biodiversity Portal, a GBIF and OBIS node, but unconfirmed.
- In Yi-Ming Gan's talk: "OBC USA data set", funder "BPO" (possibly BELSPO, unverified) and "info detections" (probably "infer non-detections").
- In Cecilie Svenningsen's talk: "Sigma Beacon", the location of the examples repository.
- In Jörg Holetschek's talk: "IoT", probably the IPT.
- In Anton Güntsch's talk: "variable optimization" (probably "atomisation") and "bioank community".
- In Federico Méndez's talk: "fifth milestone" (probably "first"), and "elastic search post and clear house" (probably Elasticsearch, Postgres, ClickHouse).
- John Wieczorek's Part 1 answer ends "This will be part of a standard undocumented" — probably "documented", but this is not quoted or interpreted.

**Transcript quality:**
- Lowest: Yi-Ming Gan's talk (heavily garbled in places) and Federico Méndez's talk (disfluent, with many repetitions).
- Highest: the recorded talks by Holly Little and Steve Baskauf.

## Items needing human review

1. **Speaker attribution in the Q&A.** Many answers are unattributed in the captions.
   - Tim Robertson introduces himself at P1 01:14:35.920 and P2 01:17:09.760.
   - Answers attributed to John Wieczorek are inferred from content: in P1, the first effort question, the complexity question, Indigenous data, interactions and workshops; in P2, review participation, nested assertions, the expert forum and the project class.
   - Answers attributed to Tim Robertson are likewise inferred: in P1, EML and extended specimens.
   - The speaker who described the user guide at P2 01:16:40.159 is unidentified.
2. **Online questioners' names (ASR, unverified):**
   - "Matias Dylan".
   - "Urit Pulen" — possibly Jorrit Poelen, but unverified.
   - "KT Pearson" — possibly Katie Pearson, but unverified.
   - "Kapia Molina", addressed by the answerer as "Javier".
3. **Audience members with only a first name or an unclear name:** "Deb", "Nikki", "Lynn", "Walter" (possibly Walter G. Berendsohn, unverified) and the NEON participant ("Shandra"/"Aandra").
4. **The chair is identified as Kate Ingenloff** from the first name and the organiser list. The captions give no affiliation.
5. **The introduction is a content item** (`type: talk`, content_type conceptual/standard) rather than unassigned, because it explains the DwC-DP vs DwC-A comparison and the diagram conventions. Reclassify if introductions should always be unassigned.
6. **Federico Méndez's two-segment item** and its `duration_seconds` convention (see above).
7. **The YouTube description discrepancy** mentioned in the brief has not been checked against the descriptions themselves.
8. **Factual figures from the captions** that are worth a spot-check against the audio:
   - iNaturalist: "more than half of species have more than half of their data" since 2020.
   - BGBM: about 4 million specimens, about 10% imaged, about 30,000 tissue and 50,000 DNA samples.
   - BROKE-West: 23 tables. Insektmobilen: 12 tables. Paleo test datasets: about 11 tables.
   - Model size: about 77 tables (John Wieczorek) and "70 plus" (Mikhail Podolskiy).
   - DiSSCo: largest DwC-DP about 750,000 records.
   - Metabarcoding: about 27 million detections and half a terabyte, with a "three orders of magnitude" reduction.
   - Review: runs at least to December 16, 90 days.

## Other notes

- `themes_normalized` is empty everywhere, as instructed. `themes_raw` was not mapped to the 2026 vocabulary, and no comparison with 2026 was made.
- Content item IDs are unique across both files: `livingdata-2025-dp-p1-01…07` and `livingdata-2025-dp-p2-01…07`.
- Excerpts are verbatim caption spans, ASR errors included. Each excerpt's timestamp is the start of the cue where it begins.
- Programme abstracts were copied from `programme.json`, including its `|` substitution for `/` in URLs.


## Parent review after extraction

- Both JSON files pass schema/type, recording metadata, source interval, exact cue timestamp, verbatim excerpt, programme reference and duplicate checks. All 3,769 caption starts are accounted for, with no overlaps between content items or unassigned intervals.
- Eleven missing affiliation/abstract values were converted from null to the schema's empty strings. No affiliations or abstracts were invented.
- Three unchanged verbatim excerpts started with words in the preceding cue; their timestamps were moved back one cue. See `review-corrections.json` for each change and output hashes. Original worker files are retained in the ignored operational-log directory.
- One timestamped claim per content item (14 total) was spot-checked against the captions. These samples were supported; this is not exhaustive factual or audio verification.
- The raw YouTube metadata confirms that Part 2's description repeats the five Part 1 case studies. The extraction correctly follows the actual programme and transcripts; no talks need moving between parts.
- The substantive introduction remains a content item, in line with the original prompt's distinction between substantive content and introductions without substantive content.
- Federico Méndez's separate later Q&A segment and combined-segment duration are accepted and validated.
- Uncertain discussion attributions, garbled ASR terms and figures requiring audio checks remain flagged above. Themes remain unnormalised, and no cross-year progression has been inferred.
