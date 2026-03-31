# Skill: Onboarding

## When to trigger
- User says "set up my knowledge bank", "onboard me", "add categories", "change categories"
- User wants to add, update, or delete a category

## Goal
Collect the user's learning topics, save them as categories in the DB, and write .md files to the workspace.

## Procedure — Full Onboarding

### Step 1 — Greet and explain
Say:
> "Hi! I'm Lumen, your personal learning agent. Let's set up your knowledge bank.
> I'll help you organize everything you learn into categories.
> What topics do you want to track? Tell me one at a time."

### Step 2 — Collect categories one by one
For each topic the user mentions:
- Ask for a brief description: "What kind of content goes in [topic]?"
- Store: `{name: <topic>, description: <description>}`
- Ask: "Got it! Any other topics? Or say 'done' when finished."

### Step 3 — Confirm and save
Once user says done, show the list:
> "Here's what I'll set up:
> - **{name}**: {description}
> - **{name}**: {description}
> Shall I save these?"

On confirmation, call onboard endpoint:
```bash
curl -s -X POST http://localhost:8001/admin/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "categories": [
      {"name": "<n>", "description": "<DESC>"},
      {"name": "<n>", "description": "<DESC>"}
    ],
    "user_id": "default",
    "workspace_id": "default"
  }'
```

### Step 4 — Update MEMORY.md
```bash
sed -i 's/Onboarded: false/Onboarded: true/' ~/openclaw-learning/workspace/MEMORY.md
```

Append categories to MEMORY.md:
```bash
echo "\n## Active Categories" >> ~/openclaw-learning/workspace/MEMORY.md
echo "- <category1>: <description>" >> ~/openclaw-learning/workspace/MEMORY.md
```

### Step 5 — Confirm to user
> "✅ Done! I've set up {n} categories for your knowledge bank.
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

```bash
curl -s -X DELETE http://localhost:8001/admin/categories/<CATEGORY_NAME> \
  -H "Content-Type: application/json" \
  -d '{"user_id": "default", "workspace_id": "default"}'
```

Confirm: "✅ Deleted category **{name}**."

## Notes
- Always write changes to both DB (via API) and .md files (handled automatically by the endpoint)
- After any category change, the service reloads automatically
- Never delete all categories — always keep at least one
