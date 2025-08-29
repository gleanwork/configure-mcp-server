---
description: Enterprise search via Glean across Slack, Jira, GitHub, Confluence, Drive (permission-aware). Returns ranked sources to open/read next.
argument-hint: <query>
---

## Plan

User query: "$ARGUMENTS"

1. Call Glean search with the natural query.
2. If results are broad, refine with team/product/source/timeframe filters (e.g., "team:billing after:2025-06", "source:Confluence").
3. For the top 1–3 results, chain **/read_document** to extract quotes before answering.

### TOOL CALL

mcp**{{SERVER_NAME}}**search "$ARGUMENTS"

### Notes

- Prefer qualifiers (PRD, RFC, runbook, Jira key, Slack channel, repository).
- If the user asks for verbatim quotes → **/read_document**.
