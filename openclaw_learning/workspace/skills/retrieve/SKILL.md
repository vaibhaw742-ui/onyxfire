# Skill: Retrieve
## When to trigger
- User asks a question about any topic
- User says "what do I know about X"
- User says "list my knowledge" or "what have I saved"
- User says "what categories do I have"
## Goal
Search the knowledge bank first, then answer using retrieved context.
Never answer from general knowledge alone if the KB has relevant content.
## Procedure
### For topic questions
#### Step 1 — Search KB
```bash
curl -s -X POST http://localhost:8001/tools/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query": "<USER_QUESTION>", "user_id": "default", "workspace_id": "default"}'
```
#### Step 2 — Answer using context
- If KB has relevant results → answer using the `context` field, citing which categories
  the information came from
- If KB has no relevant results → answer from general knowledge and note:
  > "I don't have anything saved on this yet. Want me to find and ingest some resources?"

#### Step 3 — Show source URLs
Parse `source_urls` from the response. If non-empty, list them after the answer:
> **Sources:**
> 1. https://example.com/article-1
> 2. https://example.com/article-2

#### Step 4 — Always offer deep processing
If `source_urls` is non-empty, always ask after presenting the answer and sources:
> "Want me to deep process any of these URLs to extract images and tables?
> Just say yes or pick a number."

If user says yes or picks a number → trigger the deep_process skill with that URL.

### For "list my knowledge" / "what do I know"
```bash
curl -s -X POST http://localhost:8001/tools/list_items \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```
Summarize results grouped by category.

### For "what categories do I have"
```bash
curl -s -X POST http://localhost:8001/tools/list_categories \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```
List each category with its description from `categories/<n>.md`.

## Notes
- Always cite which category the answer came from
- If multiple categories have relevant content, synthesize across them
- Identify and surface gaps: "You have content on X but nothing on related topic Y"
- Always offer deep processing when source_urls are present — never skip this step
- If source_urls is empty, do not offer deep processing
