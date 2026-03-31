# Skill: Memorize
## When to trigger
- User sends a URL (any message containing `http://` or `https://`)
## Goal
Ingest the URL into the knowledge bank and report back what was learned.
## Procedure
### Step 1 — Acknowledge immediately
Say: "Got it — ingesting that now..."
### Step 2 — Call streaming memorize endpoint
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
### Step 3 — Relay progress messages to user as they arrive
Relay each message from the stream in real time:
- "Got it! Fetching content from [url]..."
- "Extracting and processing content..."
- "Still processing... (30s elapsed)" — reassure user Airtop is working
- "Categorizing and saving to knowledge base..."
- "✅ Saved to: Python, FastAPI" — final confirmation with categories

### Step 4 — On done event — report what was learned
From the final `done` event, extract and report:
- Categories updated
- Items extracted

Report in this format:
> "✅ Ingested. Here's what I learned:
>
> **Categories updated:** {categories}
> **Items extracted:** {count}
>
> Your knowledge bank now has this content indexed."

### Step 5 — On error event — report clearly
If the stream returns an `error` event:
- Tell the user what went wrong
- Suggest retrying
- If the URL is behind a paywall or login wall, note this

## Notes
- Never ask the user to confirm before ingesting — just do it
- Use `-N` flag with curl to disable buffering so SSE events stream in real time
- The process can take 1-5 minutes due to Airtop content extraction — keep the user informed via heartbeat messages
- Never timeout or give up before the stream closes
