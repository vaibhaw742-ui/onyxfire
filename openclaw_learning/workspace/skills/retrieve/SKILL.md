# Skill: Retrieve

## When to trigger
- User asks a question about any topic
- User says "what do I know about X"
- User says "list my knowledge" or "what have I saved"
- User says "what categories do I have"
- User says "check my goals" / "show my profile" / "what am I learning"

## Goal
Search the knowledge bank first, then answer using retrieved context.
Never answer from general knowledge alone if the KB has relevant content.
Always connect answers back to the user's goals and gaps from supadense.md.

## Procedure

### For topic questions

#### Step 1 — Read supadense.md for context
Before answering, check what goals and depth preferences apply:
```bash
curl -s "http://localhost:8001/tools/supadense/read?user_id=default&workspace_id=default"
```
Note the user's depth preference for the relevant category — answer at that depth.

#### Step 2 — Search KB
```bash
curl -s -X POST http://localhost:8001/tools/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query": "<USER_QUESTION>", "user_id": "default", "workspace_id": "default"}'
```

#### Step 3 — Answer using context
- If KB has relevant results → answer using the `context` field, citing which categories
  the information came from, at the correct depth (from supadense depth_preferences)
- If KB has no relevant results → answer from general knowledge and note:
  > "I don't have anything saved on this yet. Want me to find and ingest some resources?"

#### Step 4 — Connect to goals and gaps
After answering, check if the topic relates to any active goal or gap from supadense.md.
If yes, note it:
> "This connects to your goal: *Master agentic AI system design*"
> "This partially fills your gap: *Multi-agent coordination patterns*"

#### Step 5 — Show source URLs
Parse `source_urls` from the response. If non-empty, list them after the answer:
> **Sources from your KB:**
> 1. https://example.com/article-1
> 2. https://example.com/article-2

#### Step 6 — Always offer deep processing
If `source_urls` is non-empty, always ask after presenting the answer and sources:
> "Want me to deep process any of these URLs to extract images and tables?
> Just say yes or pick a number."
If user says yes or picks a number → trigger the deep_process skill with that URL.

---

### For "list my knowledge" / "what do I know"
```bash
curl -s -X POST http://localhost:8001/tools/list_items \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default", "limit": 20}'
```
Summarize results grouped by category. Note which categories are thin vs rich.

---

### For "what categories do I have"
```bash
curl -s -X POST http://localhost:8001/tools/list_categories \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```
List each category with its description. Cross-reference with depth_preferences from
supadense.md to show target depth vs current coverage.

---

### For "check my goals" / "show my profile"
```bash
curl -s "http://localhost:8001/tools/supadense/read?user_id=default&workspace_id=default"
```
Present goals, gaps, learning intent, and depth preferences in a clean readable format.
Note which gaps have been partially filled by existing KB content.

---

## Notes
- Always cite which category the answer came from
- If multiple categories have relevant content, synthesize across them
- Frame answers at the correct depth (deep/working/surface) per supadense depth_preferences
- Identify and surface gaps: "You have content on X but nothing on related topic Y"
- Always offer deep processing when source_urls are present — never skip this step
- If source_urls is empty, do not offer deep processing
- Never fabricate KB content — only surface what was actually memorized
- KB content lives per-user: `users/default__default/categories/`
