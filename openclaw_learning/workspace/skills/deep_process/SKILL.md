# Skill: Deep Process

## When to trigger
- After every retrieve response that includes source URLs
- When user explicitly asks to "deep process", "extract images", "show tables", or "dig deeper" on a URL
- When user says "yes" to the deep process offer after a retrieve

## Goal
Extract images and structured data (tables) from a source URL and present them clearly.
If the URL hasn't been memorized yet, offer to ingest it into the KB after deep processing.

## Procedure

### Step 1 — Offer deep processing after every retrieve
After presenting the retrieve answer, always check if `source_urls` is non-empty.
If yes, ask:
> "I found {n} source URL(s) for this answer. Want me to deep process any of them to extract images and tables?"
> List the URLs numbered: 1. url1  2. url2 ...

### Step 2 — User picks a URL
Wait for user to say yes or pick a number/URL.

### Step 3 — Check if URL already memorized
Before deep processing, check if the URL is already in KB:
```bash
curl -s -X POST http://localhost:8001/tools/memorize \
  -H "Content-Type: application/json" \
  -d '{"url": "<CHOSEN_URL>", "user_id": "default", "workspace_id": "default"}'
```
If response is `"status": "skipped"` → URL is already in KB, note this to user before deep processing.
If response is `"status": "ok"` → URL was just memorized, inform user.

### Step 4 — Run deep process stream
```bash
curl -N -s -X POST http://localhost:8001/tools/deep_process/stream \
  -H "Content-Type: application/json" \
  -d '{"url": "<CHOSEN_URL>", "user_id": "default", "workspace_id": "default"}' \
  | while IFS= read -r line; do
      if [[ "$line" == data:* ]]; then
        data="${line#data: }"
        event_status=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null)
        message=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null)
        images=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); imgs=d.get('images',[]); [print(f'{i[\"alt\"]}: {i[\"src\"]}') for i in imgs]" 2>/dev/null)
        tables=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); tbls=d.get('tables',[]); [print(t) for t in tbls]" 2>/dev/null)
        [ -n "$message" ] && echo "$message"
        [ -n "$images" ] && echo "IMAGES: $images"
        [ -n "$tables" ] && echo "TABLES: $tables"
        [[ "$event_status" == "ok" || "$event_status" == "error" ]] && break
      fi
    done
```

### Step 5 — Present results clearly

#### Images
If images were found, present them as a list:
> **Images found ({count}):**
> 1. 🖼 {alt}: {src}
> 2. 🖼 {alt}: {src}

If no images: "No significant images found on this page."

#### Tables
If tables were found, present each as markdown:
> **Tables found ({count}):**
>
> {markdown table 1}
>
> {markdown table 2}

If no tables: "No structured tables found on this page."

### Step 6 — Connect to learning profile
After presenting results, check supadense.md for relevant goals/gaps:
```bash
curl -s "http://localhost:8001/tools/supadense/read?user_id=default&workspace_id=default"
```
If the page content connects to an active goal or gap, note it:
> "This page relates to your goal: *{goal}*"

### Step 7 — Offer next action
After presenting results, ask:
> "Want me to run a synthesis digest to see what this adds to your KB?"

If yes → trigger:
```bash
curl -s -X POST http://localhost:8001/tools/synthesis/digest \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```
Present the digest response — specifically the `novelty` section showing what's new vs already known,
and the `quality_scores` showing depth and specificity ratings.

## Notes
- Always relay progress messages in real time as they stream in
- If the page is JS-heavy (React SPA), images/tables may not be found — explain this to the user
- Cap display at 20 images and 10 tables
- URL dedup is automatic — memorize will skip if already in KB
- Deep process and memorize are separate operations — deep process extracts visual/tabular data,
  memorize extracts knowledge atoms. Both are useful and complementary.
- Phase 7 will add a richer 6-section deep process (Overview, New vs Known, Core Concepts,
  Questions, Connections, Gaps) — this current skill covers images and tables only
