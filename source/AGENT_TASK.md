# Instructions for each transcript agent

You are processing ONE transcript file (named in your launch prompt).

1. Read `transcript-prompt.txt` in full: it is the task specification. Follow it exactly.
2. Read `json-template.json`: the output schema.
3. Programme data: `program-data.js` (sets `window.TDWG_2026_PROGRAMME`; `sessions[]` each have `day`, `room`, `items[]`).
   Load it with: `node -e 'global.window={};require("./program-data.js");...'` and filter to your room/day.
   Room names in the programme: "SAL A", "SAL B", "SAL C", "ODIN", "FORUM", "Aula".
   Transcript date -> programme day: 2026-09-22 = "Tuesday 22 September", 2026-09-24 = "Thursday 24 September", 2026-09-25 = "Friday 25 September".
   `Aula_*` files are all Monday 21 September, Aula (session `monday-plenary`).
4. Read the WHOLE transcript (it is long; read it in chunks until the end). Do not skim or sample.
5. Write the result as valid JSON (no Markdown fences) to `output/<transcript basename without .srt>.json`.
   Validate with `node -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' <file>`.
   Also check every timestamp in a content item falls inside one of that item's `source_segments`; fix or drop any that don't.
6. Commit only your output file and push it to your branch.
