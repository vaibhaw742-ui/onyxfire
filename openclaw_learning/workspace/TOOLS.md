# TOOLS.md — Lumen Tool Registry

## Knowledge Bank API
Base URL: `http://localhost:8001`
All requests use `"user_id": "default"` and `"workspace_id": "default"` unless specified.

---

## Memorize

### memorize/stream (preferred)
Ingests a URL into the knowledge bank. Streams progress via SSE. Skips if URL already memorized.
```bash
curl -N -s -X POST http://localhost:8001/tools/memorize/stream \
  -H "Content-Type: application/json" \
  -d '{"url": "<URL>", "user_id": "default", "workspace_id": "default"}' \
  | while IFS= read -r line; do
      if [[ "$line" == data:* ]]; then
        data="${line#data: }"
        message=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null)
        event_status=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null)
        [ -n "$message" ] && echo "$message"
        [[ "$event_status" == "ok" || "$event_status" == "error" || "$event_status" == "skipped" ]] && break
      fi
    done
```
Response events: `progress` → `done` (status: ok | skipped | error)

### memorize (non-streaming — fallback only)
```bash
curl -s -X POST http://localhost:8001/tools/memorize \
  -H "Content-Type: application/json" \
  -d '{"url": "<URL>", "user_id": "default", "workspace_id": "default"}'
```
Returns: `{"status": "ok"|"skipped", "items_extracted": N, "categories": [...]}`

---

## Retrieve

### retrieve
Semantic search across KB. Returns context, items, categories, source_urls.
```bash
curl -s -X POST http://localhost:8001/tools/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query": "<QUERY>", "user_id": "default", "workspace_id": "default"}'
```

### list_items
```bash
curl -s -X POST http://localhost:8001/tools/list_items \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default", "limit": 10}'
```

### list_categories
```bash
curl -s -X POST http://localhost:8001/tools/list_categories \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```

---

## Deep Process

### deep_process/stream
Extracts images and tables from a URL. Use after retrieve when user wants rich content from a source.
```bash
curl -N -s -X POST http://localhost:8001/tools/deep_process/stream \
  -H "Content-Type: application/json" \
  -d '{"url": "<URL>", "user_id": "default", "workspace_id": "default"}' \
  | while IFS= read -r line; do
      if [[ "$line" == data:* ]]; then
        data="${line#data: }"
        event_status=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null)
        message=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null)
        images=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); imgs=d.get('images',[]); [print(f'  {i[\"alt\"]}: {i[\"src\"]}') for i in imgs]" 2>/dev/null)
        tables=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); tbls=d.get('tables',[]); [print(t) for t in tbls]" 2>/dev/null)
        [ -n "$message" ] && echo "$message"
        [ -n "$images" ] && echo "$images"
        [ -n "$tables" ] && echo "$tables"
        [[ "$event_status" == "ok" || "$event_status" == "error" ]] && break
      fi
    done
```

---

## Synthesis (Daily Digest)

### synthesis/digest
Generates a targeted learning digest covering all new KB items since last synthesis.
Scores each item for: relevance, depth (low/medium/high), specificity (low/medium/high),
goal match (none/weak/strong), gap addressed (none/partial/full).
Also shows similar links already in KB and exact novel vs reinforced topics.
```bash
curl -s -X POST http://localhost:8001/tools/synthesis/digest \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```
Returns: digest text, resources table, similar_in_kb, novelty per category, quality_scores.
Digest file written to: `users/default__default/digests/YYYY-MM-DD.md`

---

## Supadense (Learning Profile)

### supadense/read
Read user's learning profile — goals, gaps, learning intent, trusted sources, depth prefs, scout config.
```bash
curl -s "http://localhost:8001/tools/supadense/read?user_id=default&workspace_id=default"
```

### supadense/update_goals
Append new goals to supadense.md.
```bash
curl -s -X POST http://localhost:8001/tools/supadense/update_goals \
  -H "Content-Type: application/json" \
  -d '{"goals": ["<NEW GOAL>"], "user_id": "default", "workspace_id": "default"}'
```

---

## MEMORY.md (Agent Long-Term Memory)

### memory/read
Read agent's long-term memory about this user.
```bash
curl -s "http://localhost:8001/tools/memory/read?user_id=default&workspace_id=default"
```

### memory/append
Append new observation or session note to MEMORY.md.
```bash
curl -s -X POST http://localhost:8001/tools/memory/append \
  -H "Content-Type: application/json" \
  -d '{"content": "<OBSERVATION>", "user_id": "default", "workspace_id": "default"}'
```

### memory/write
Overwrite entire MEMORY.md (use with caution).
```bash
curl -s -X POST http://localhost:8001/tools/memory/write \
  -H "Content-Type: application/json" \
  -d '{"content": "<FULL CONTENT>", "user_id": "default", "workspace_id": "default"}'
```

---

## Onboarding

### onboarding/status
Check if user has completed onboarding.
```bash
curl -s "http://localhost:8001/tools/onboarding/status?user_id=default&workspace_id=default"
```

### onboarding/complete
Complete first-run onboarding. Creates supadense.md, MEMORY.md, categories, learning profile.
```bash
curl -s -X POST http://localhost:8001/tools/onboarding/complete \
  -H "Content-Type: application/json" \
  -d '{
    "goals": ["<GOAL 1>", "<GOAL 2>"],
    "gaps": ["<GAP 1>"],
    "learning_intent": "<INTENT>",
    "depth_preferences": {"<category>": "deep|working|surface"},
    "trusted_sources": ["<handle or URL>"],
    "scout_platforms": ["x", "linkedin"],
    "categories": [{"name": "<NAME>", "description": "<DESC>"}],
    "user_id": "default",
    "workspace_id": "default"
  }'
```

---

## Category Management

### add_category
```bash
curl -s -X POST http://localhost:8001/admin/categories/add \
  -H "Content-Type: application/json" \
  -d '{"name": "<NAME>", "description": "<DESCRIPTION>", "user_id": "default", "workspace_id": "default"}'
```

### update_category
```bash
curl -s -X PUT http://localhost:8001/admin/categories/<CATEGORY_NAME> \
  -H "Content-Type: application/json" \
  -d '{"description": "<NEW_DESCRIPTION>", "user_id": "default", "workspace_id": "default"}'
```

### delete_category
Note: supadense is protected and cannot be deleted.
```bash
curl -s -X DELETE http://localhost:8001/admin/categories/<CATEGORY_NAME> \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```

### get_categories
```bash
curl -s "http://localhost:8001/admin/categories?user_id=default&workspace_id=default"
```

---

## Other

### clear_memory
Clears all KB items for user. Irreversible.
```bash
curl -s -X POST http://localhost:8001/tools/clear_memory \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```

### health
```bash
curl -s http://localhost:8001/health
```

---

## File System (per-user)
All user data lives under:
`openclaw_learning/workspace/users/{user_id}__{workspace_id}/`
- `supadense.md` — learning profile
- `MEMORY.md` — agent long-term memory
- `categories/` — KB category .md files (agents.md, rag.md etc)
- `digests/` — daily digest .md files

Global openclaw workspace files (shared, not per-user):
`openclaw_learning/workspace/`
- `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `TOOLS.md`, `BOOTSTRAP.md`, `HEARTBEAT.md`
- `skills/` — openclaw skill definitions
