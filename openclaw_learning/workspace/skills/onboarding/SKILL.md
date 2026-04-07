# Skill: Onboarding

## When to trigger
- User says "set up my knowledge bank", "onboard me", "add categories", "change categories"
- User wants to add, update, or delete a category
- `GET /tools/onboarding/status` returns `"onboarded": false` on first session

## Goal
Run the 7-question onboarding flow, save the full learning profile to supadense.md,
create KB categories, and initialise MEMORY.md — all via the onboarding API.

---

## Procedure — Full Onboarding (first run)

### Step 0 — Check status first
```bash
curl -s "http://localhost:8001/tools/onboarding/status?user_id=default&workspace_id=default"
```
If `"onboarded": true` → skip to category management section below.
If `"onboarded": false` → proceed with full onboarding.

### Step 1 — Greet and explain
Say:
> "Hey! I'm Lumen, your personal learning agent. Let's get you set up.
> I'll ask you 7 quick questions to personalise everything — goals, gaps, how deep
> you want to go, who you trust for content, and how to organise your knowledge bank."

### Step 2 — Ask all 7 questions (collect answers before calling API)

**Q1 — Goals**
> "What are you trying to learn or get good at? List as many as you want, one per line."
Store as `goals: [...]`

**Q2 — Gaps**
> "What are your current weak spots or blind spots — things you know you don't know well?"
Store as `gaps: [...]`

**Q3 — Learning intent**
> "What's the end goal? What do you ultimately want to be able to do?"
Store as `learning_intent: "..."`

**Q4 — Depth preferences**
> "For each topic you care about, how deep do you want to go?
> Options: deep (full mastery, internals), working (practical use), surface (just awareness)"
Collect per topic: `depth_preferences: {"topic": "deep|working|surface"}`

**Q5 — Trusted sources**
> "Who do you trust for good content? Twitter handles, blogs, newsletters — anything."
Store as `trusted_sources: [...]`

**Q6 — Scout platforms**
> "Which platforms should Lumen watch for you?"
Options: X (Twitter), LinkedIn, Hacker News, Reddit
Store as `scout_platforms: ["x", "linkedin", ...]`

**Q7 — Categories**
> "What knowledge categories do you want to organise your learning into?
> Give me a name and one-line description for each."
Store as `categories: [{"name": "...", "description": "..."}]`

### Step 3 — Confirm and save
Show a summary of all answers and ask:
> "Here's your learning profile — shall I save it?"

On confirmation, call:
```bash
curl -s -X POST http://localhost:8001/tools/onboarding/complete \
  -H "Content-Type: application/json" \
  -d '{
    "goals": ["<GOAL1>", "<GOAL2>"],
    "gaps": ["<GAP1>", "<GAP2>"],
    "learning_intent": "<INTENT>",
    "depth_preferences": {"<category>": "deep|working|surface"},
    "trusted_sources": ["<SOURCE1>", "<SOURCE2>"],
    "scout_platforms": ["x", "linkedin"],
    "categories": [
      {"name": "<n>", "description": "<DESC>"}
    ],
    "user_id": "default",
    "workspace_id": "default"
  }'
```

This single call:
- Writes `users/default__default/supadense.md` with full learning profile
- Initialises `users/default__default/MEMORY.md`
- Creates `users/default__default/categories/` with one .md per category
- Sets `onboarded_at` and `depth_prefs` in `learning_profiles` DB table

### Step 4 — Confirm to user
> "✅ Done! Your knowledge bank is ready with {n} categories.
> Your goals, gaps, and depth preferences are saved.
> Send me any URL to start building your knowledge base."

---

## Procedure — Add Single Category
```bash
curl -s -X POST http://localhost:8001/admin/categories/add \
  -H "Content-Type: application/json" \
  -d '{"name": "<n>", "description": "<DESC>", "user_id": "default", "workspace_id": "default"}'
```
Confirm: "✅ Added category **{name}**."

---

## Procedure — Update Category
```bash
curl -s -X PUT http://localhost:8001/admin/categories/<CATEGORY_NAME> \
  -H "Content-Type: application/json" \
  -d '{"description": "<NEW_DESC>", "user_id": "default", "workspace_id": "default"}'
```
Confirm: "✅ Updated **{name}** description."

---

## Procedure — Delete Category
Note: `supadense` category is protected and cannot be deleted.
```bash
curl -s -X DELETE http://localhost:8001/admin/categories/<CATEGORY_NAME> \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```
Confirm: "✅ Deleted category **{name}**."

---

## Procedure — Update Goals / Gaps
If user says "add a goal" or "I want to learn X":
```bash
curl -s -X POST http://localhost:8001/tools/supadense/update_goals \
  -H "Content-Type: application/json" \
  -d '{"goals": ["<NEW GOAL>"], "user_id": "default", "workspace_id": "default"}'
```
Confirm: "✅ Added to your goals."

---

## Notes
- Full onboarding only runs once — `onboarding/complete` sets `onboarded_at`
- All files are written per-user: `users/default__default/`
- After any category change, the service reloads automatically
- Never delete all categories — always keep at least one
- Do not manually edit supadense.md — always use the API endpoints
- `supadense` is a protected category name — deletion will be rejected
