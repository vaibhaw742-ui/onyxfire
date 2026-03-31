# TOOLS.md — Lumen Tool Registry
## Knowledge Bank API
Base URL: `http://localhost:8001`
All requests use `"user_id": "default"` and `"workspace_id": "default"`.

### memorize (streaming — preferred)
Use this for ingesting URLs. Streams progress events via SSE so the user stays informed.
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
        [ "$event_status" = "ok" ] || [ "$event_status" = "error" ] && break
      fi
    done
```

### memorize (non-streaming — fallback only)
Only use if streaming endpoint is unavailable.
```bash
curl -s -X POST http://localhost:8001/tools/memorize \
  -H "Content-Type: application/json" \
  -d '{"url": "<URL>", "user_id": "default", "workspace_id": "default"}'
```

### retrieve
Returns answer context + source_urls for deep processing.
```bash
curl -s -X POST http://localhost:8001/tools/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query": "<QUERY>", "user_id": "default", "workspace_id": "default"}'
```

### deep_process (streaming)
Extracts images and structured data (tables) from a URL. Use after retrieve when user wants to deep process a source URL.
```bash
curl -N -s -X POST http://localhost:8001/tools/deep_process/stream \
  -H "Content-Type: application/json" \
  -d '{"url": "<URL>", "user_id": "default", "workspace_id": "default"}' \
  | while IFS= read -r line; do
      if [[ "$line" == data:* ]]; then
        data="${line#data: }"
        event_status=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null)
        message=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null)
        images=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); imgs=d.get('images',[]); [print(f'  🖼  {i[\"alt\"]}: {i[\"src\"]}') for i in imgs]" 2>/dev/null)
        tables=$(echo "$data" | python3 -c "import sys,json; d=json.load(sys.stdin); tbls=d.get('tables',[]); [print(t) for t in tbls]" 2>/dev/null)
        [ -n "$message" ] && echo "$message"
        [ -n "$images" ] && echo "$images"
        [ -n "$tables" ] && echo "$tables"
        [ "$event_status" = "ok" ] || [ "$event_status" = "error" ] && break
      fi
    done
```

### list_items
```bash
curl -s -X POST http://localhost:8001/tools/list_items \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```

### list_categories
```bash
curl -s -X POST http://localhost:8001/tools/list_categories \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```

### clear_memory
```bash
curl -s -X POST http://localhost:8001/tools/clear_memory \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```

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
```bash
curl -s -X DELETE http://localhost:8001/admin/categories/<CATEGORY_NAME> \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```

### onboard
```bash
curl -s -X POST http://localhost:8001/admin/onboard \
  -H "Content-Type: application/json" \
  -d '{"categories": [{"name": "<NAME>", "description": "<DESC>"}], "user_id": "default", "workspace_id": "default"}'
```

### reload_service
```bash
curl -s -X POST http://localhost:8001/admin/reload
```

## File System
- Categories folder: `~/openclaw-learning/workspace/categories/`
- Each category is a `.md` file: `categories/<name>.md`
- Memory log: `~/openclaw-learning/workspace/MEMORY.md`
