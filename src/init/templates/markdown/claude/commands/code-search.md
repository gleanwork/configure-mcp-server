---
description: Company-wide code search (symbols, files, patterns) via Glean (GitHub/GitLab).
argument-hint: <code query> [optional filters]
---

## Plan

Query: "$ARGUMENTS"

1. Prefer specific symbols/paths (e.g., ValidateSession, path:services/auth).
2. If noisy, iterate with repo/path/language filters (e.g., repo:platform, lang:go).
3. When a file looks relevant: open it in the editor and summarize usage/intent.

### TOOL CALL

mcp**glean_default**code_search query:"$ARGUMENTS" limit:20
