# HEARTBEAT.md
# Keep this file empty (or with only comments) to skip heartbeat API calls.
# Add tasks below when you want the agent to check something periodically.

# ── Planned heartbeat tasks (not yet active) ──────────────────────────────────
#
# Daily digest — 07:00
# POST /tools/synthesis/digest
# Synthesizes all new KB items since last synthesis into a targeted learning digest.
# Scores depth, specificity, goal match, gap addressed, novelty per item.
#
# Gap analysis heartbeat — every 6h
# POST /tools/gap_analysis/heartbeat
# Checks KB coverage per category against depth minimums from learning profile.
#
# Gap analysis weekly report — Sunday 20:00
# POST /tools/gap_analysis/weekly_report
# Full gap report across all categories with actionable suggestions.
#
# Spaced rep — 09:00 daily
# POST /tools/spaced_rep/due
# Returns memory items due for review today based on FSRS scheduling.
#
# Social scout — 10:00 daily
# POST /tools/scout/run
# Airtop scroll agent on X/LinkedIn. Scores posts for relevance against goals.
# Routes: auto-ingest (score > 0.72) → memorize, notify (score > 0.5) → surface to user.
#
# Memorize reindex — 02:00 daily
# POST /tools/memorize/reindex
# Reindexes KB embeddings for drift correction.
