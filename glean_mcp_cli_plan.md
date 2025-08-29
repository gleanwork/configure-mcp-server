# Glean MCP CLI Installation Plan

This document describes a complete plan to implement a cross-project CLI installer for Glean MCP tools integration into Claude and Cursor.

---

## 0) Outcomes

- Any repo can run `glean-mcp init` to install:
  - `.claude/commands/glean_{search,chat,read_document,code_search}.md`
  - `.claude/agents/glean-expert.md`
  - `.cursor/rules/glean-mcp.mdc` (no `globs`; **description** dictates applicability)
- Idempotent re-runs update files to newest **template version**, preserve local edits when possible, and validate tool names/keys.
- Post-install checks confirm MCP host calls to `mcp__glean_default__{search,chat,read_document,code_search}` work and rules/agents are discovered by Claude/Cursor.
- Templates are source-of-truth: CLI fetches and installs consistently.

---

## 1) CLI UX & Commands

### Commands

- `glean-mcp init` — install/update all files.
- `glean-mcp verify` — validate install (syntax, tool names, placement).
- `glean-mcp upgrade` — fetch new templates, perform merge.
- `glean-mcp uninstall` — remove files (backup optional).
- `glean-mcp doctor` — diagnose common problems.

### Flags

- `--server-key glean_default` (default)
- `--yes`, `--dry-run`, `--from <url|path>`, `--pin <version>`, `--strict`.

---

## 2) Managed Files & Templates

```
.claude/
  agents/
    glean-expert.md
  commands/
    glean_search.md
    glean_chat.md
    glean_read_document.md
    glean_code_search.md
.cursor/
  rules/
    glean-mcp.mdc
.glean-mcp.json
```

Placeholders: `{{SERVER_KEY}}`, `{{AGENT_NAME}}`, `{{ORG_HINT}}`, `{{YEAR}}`.

---

## 3) File Templates

### 3.1 `.claude/commands/glean_search.md`

```markdown
---
description: Enterprise search via Glean across Slack, Jira, GitHub, Confluence, Drive. Returns ranked sources to open/read next.
argument-hint: <query>
---

## Plan

User query: "$ARGUMENTS"

1. Call Glean search with the natural query.
2. Refine with team/product/source/timeframe filters.
3. Chain **/read_document** to extract quotes.

### TOOL CALL

mcp**{{SERVER_KEY}}**search "$ARGUMENTS"
```

### 3.2 `.claude/commands/glean_chat.md`

```markdown
---
description: Ask Glean to synthesize an answer with citations.
argument-hint: <question>
---

## Plan

Question: "$ARGUMENTS"

1. Use for explanations/summary/policy across many sources.
2. Add context bullets if helpful.
3. If quotes needed → **/read_document**.

### TOOL CALL

mcp**{{SERVER_KEY}}**chat prompt:"$ARGUMENTS"
```

### 3.3 `.claude/commands/glean_read_document.md`

```markdown
---
description: Read a specific document (URL or ID) to quote/analyze precisely.
argument-hint: <doc-url-or-id> [optional section/heading]
---

## Plan

Target: "$ARGUMENTS"

1. Resolve to Glean doc.
2. Extract only needed sections.
3. Return summary + quotes.

### TOOL CALL

mcp**{{SERVER_KEY}}**read_document id_or_url:"$ARGUMENTS"
```

### 3.4 `.claude/commands/glean_code_search.md`

```markdown
---
description: Company-wide code search (symbols, files, patterns) via Glean.
argument-hint: <code query> [optional filters]
---

## Plan

Query: "$ARGUMENTS"

1. Prefer specific symbols/paths.
2. If noisy, refine with repo/path/language.
3. Summarize usage/intent.

### TOOL CALL

mcp**{{SERVER_KEY}}**code_search query:"$ARGUMENTS" limit:20
```

### 3.5 `.claude/agents/glean-expert.md`

```markdown
---
name: glean-expert
description: >
  PROACTIVELY use this subagent for debugging, testing, understanding code, or researching features.
  Searches Slack/Jira/GitHub/Confluence/Drive via Glean, chaining read/quote/code lookups.
tools:
  - search
  - chat
  - read_document
  - code_search
model: sonnet
color: blue
---

## TRIGGERS

- Docs lookup → search
- Explanations → chat (then read)
- Quotes → read_document
- Code symbols → code_search
- Errors/regressions → search issues → read_document → code_search

## WORKFLOWS

- lookup→quote
- explain→sources
- debugging-context
- code-discovery

## PRINCIPLES

- Prefer search+read for traceability.
- Prefer chat for synthesis.
- Always cite sources.
```

### 3.6 `.cursor/rules/glean-mcp.mdc`

```md
---
description: >
  Apply this rule whenever enterprise context via Glean MCP (server key: {{SERVER_KEY}}) would help.
  Includes: doc lookups, summaries, debugging/testing, and code understanding.
  Chain: search → read_document; chat → read_document; search/chat → code_search.
alwaysApply: false
---

# Glean MCP Usage Rule

## WHEN TO INVOKE

- Lookup → search
- Summaries → chat
- Quotes → read_document
- Code questions → code_search

## CHAINS

- lookup→quote
- explain→sources
- debug→context
- code→context

## QUERY REFINEMENT

- Add team/product/timeframe for search
- Add repo/path/lang for code_search

## EXPECTATIONS

- Provide links/titles and why source.
- Concise summary then quotes.
- Refine and retry if needed.

## EXAMPLES

- “Find PTO policy changes this year” → search → read_document
- “Who uses ValidateSession?” → code_search
- “Recent errors in payments service?” → search → read_document → code_search
```

---

## 4) CLI Logic

- Detect repo root, create folders.
- Write/update templates (3-way merge if file changed).
- Track hashes in `.glean-mcp.json`.
- Commands: init, verify, upgrade, uninstall, doctor.

---

## 5) Validation

- Syntax check YAML/Markdown.
- Verify tool names = `mcp__glean_default__*`.
- Ensure files placed correctly.
- Warn if Cursor rule > 500 lines.

---

## 6) Smoke Tests

1. `/search "oncall runbook"` → `/read_document`.
2. `/chat "summarize PTO policy"` → `/read_document`.
3. `/code_search "ValidateSession"`.

---

## 7) Future Enhancements

- Registry-based template updates.
- Nested Cursor rules per team.
- Org hints injection.
- Extra configurable Glean MCP tools.

```

---
```
