---
description: Ask Glean to synthesize an answer with citations from enterprise sources (permission-aware).
argument-hint: <question>
---

## Plan

Question: "$ARGUMENTS"

1. Use when the user needs an explanation/summary/policy across many sources.
2. Add short context bullets if useful (team, dates, links, systems).
3. After reply, surface sources; if quotes are needed → call **/read_document**.

### TOOL CALL

mcp**{{SERVER_NAME}}**chat prompt:"$ARGUMENTS"
