# Glean MCP Tools: Prompts, Slash Commands, Agent, and Cursor Rule

This file contains the **actual content** for the four Glean MCP tools (`search`, `chat`, `read_document`, `code_search`) as slash commands, the `glean-expert` Claude sub-agent, and the Cursor rule (`glean-mcp.mdc`).

All tools are wired to the server key: **`glean_default`**.

---

## Slash Commands

### `.claude/commands/glean_search.md`

```markdown
---
description: Enterprise search via Glean across Slack, Jira, GitHub, Confluence, Drive (permission-aware). Returns ranked sources to open/read next.
argument-hint: <query>
---

## Plan

User query: "$ARGUMENTS"

1. Call Glean search with the natural query.
2. If results are broad, refine with team/product/source/timeframe filters (e.g., “team:billing after:2025-06”, “source:Confluence”).
3. For the top 1–3 results, chain **/read_document** to extract quotes before answering.

### TOOL CALL

mcp**glean_default**search "$ARGUMENTS"

### Notes

- Prefer qualifiers (PRD, RFC, runbook, Jira key, Slack channel, repository).
- If the user asks for verbatim quotes → **/read_document**.
```

---

### `.claude/commands/glean_chat.md`

```markdown
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

mcp**glean_default**chat prompt:"$ARGUMENTS"
```

---

### `.claude/commands/glean_read_document.md`

```markdown
---
description: Read a specific document (URL or ID) to quote or analyze precisely.
argument-hint: <doc-url-or-id> [optional section/heading]
---

## Plan

Target: "$ARGUMENTS"

1. Resolve to a Glean doc (URL or ID).
2. Pull full text; extract only the sections needed to answer.
3. Return a short summary AND exact quotes (with headings/anchors if available).

### TOOL CALL

mcp**glean_default**read_document id_or_url:"$ARGUMENTS"
```

---

### `.claude/commands/glean_code_search.md`

```markdown
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
```

---

## Claude Sub-Agent

### `.claude/agents/glean-expert.md`

```markdown
---
name: glean-expert
description: >
  PROACTIVELY use this subagent when coding tasks would benefit from enterprise
  context—debugging, testing, understanding code, or researching features. This
  agent searches Slack/Jira/GitHub/Confluence/Drive via Glean, then chains
  read/quote or code lookup for precise, sourced answers.
tools:
  - search
  - chat
  - read_document
  - code_search
model: sonnet
color: blue
---

## TRIGGERS → IMMEDIATE TOOL USE

- “Find / where is / show docs …” → **search**
- “Explain / summarize / what’s our policy …” → **chat** (then **read_document** for quotes)
- “Open/quote this doc …” → **read_document**
- “Where in code… / who calls… / where configured… ” → **code_search**
- Errors, test failures, stack traces, or regressions → **search** for related Jira/Slack/GitHub issues → **read_document** to extract key details → **code_search** for likely fix sites.

## WORKFLOWS

<workflow name="lookup→quote">
1. search "[topic]" (add team/source/timeframe)
2. Pick best match → read_document id_or_url:"…"
3. Answer with short summary + exact quotes + links.

<workflow name="explain→sources">
1. chat prompt:"[question]"
2. If key sources cited → read_document for verbatim passages/tables.

<workflow name="debugging-context">
1. search "[error|service|component]" (add timeframe)
2. Open relevant Jira/Slack/PRs via read_document; note root-causes/workarounds.
3. code_search for implicated symbols/paths; summarize likely change surface.

<workflow name="code-discovery">
1. code_search query:"[symbol|pattern] [repo/path/lang]"
2. Open files; summarize responsibilities, call sites, and edge cases.

## PRINCIPLES

- Prefer **search + read_document** when traceability/quotes matter.
- Prefer **chat** when synthesis across multiple sources is needed.
- Always return links/titles and why each source is relevant.
- Iterate queries with product/team/date or repo/path/language filters.
```

---

## Cursor Rule

### `.cursor/rules/glean-mcp.mdc`

```md
---
description: >
  Apply this rule whenever the user’s request could benefit from enterprise
  context accessible via the Glean MCP server (server key: glean_default).
  This includes:
  • Looking up or retrieving documents, policies, runbooks, prior discussions, or design docs
    from Slack, Jira, GitHub, Confluence, Google Drive, or other indexed sources.
  • Summarizing or explaining policies, processes, or past incidents where the
    answer requires synthesis across multiple knowledge sources.
  • Debugging or testing scenarios where related Jira tickets, Slack messages,
    GitHub issues/PRs, or runbooks provide context.
  • Code understanding or investigation where a symbol is defined, used, or configured.

  When these situations occur, prefer invoking Glean MCP tools to ground the
  answer in authoritative internal context. Chain tool calls when needed:
  search → read_document for quoting, chat → read_document for citations, or
  search/chat → code_search to connect knowledge to code.

alwaysApply: false
---

# Glean MCP Usage Rule

## WHEN TO INVOKE

- **Lookup / discovery** ("find/show/where is …"): call `search`.
- **Synthesis / policy / summary** ("explain/summarize/compare …"): call
  `chat`; if verbatim text is required, follow with
  `read_document`.
- **Precise quoting / inspection** (specific doc/section/table): call
  `read_document`.
- **Code questions** ("who calls/where defined/where configured"): call
  `code_search` with a specific symbol/pattern; refine
  with repo/path/language filters.

## CHAINS

- **lookup→quote**: search → read_document → answer with citations/quotes.
- **explain→sources**: chat → (optional) read_document for verbatim passages.
- **debug→context**: search (error/service) → read_document (tickets/PRs) →
  code_search (symbols/paths) → propose likely fix.
- **code→context**: code_search → open/summarize → (optional) search for design docs/runbooks/SEVs.

## QUERY REFINEMENT

- Add **team/product/source/timeframe** to `search` queries (e.g., “billing”, “Confluence only”, “after:2025-06”).
- Add **repo/path/language** to `code_search` (e.g., `repo:platform`, `path:services/auth`, `lang:go`).

## OUTPUT EXPECTATIONS

- Provide **links/titles** and a one-line **why this source**.
- Start with a concise summary, then **exact quotes** (with headings/anchors).
- If results are broad or thin, refine and retry automatically.

## EXAMPLES

- “Find PTO policy changes this year” → `search` → `read_document` → quote changes.
- “Who uses ValidateSession?” → `code_search` → summarize call sites.
- “Recent errors in payments service?” → `search` → open Jira/Slack → `code_search` suspected modules.
```
