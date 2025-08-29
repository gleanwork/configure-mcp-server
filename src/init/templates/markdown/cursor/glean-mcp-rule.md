---
description: >
  Apply this rule whenever the user's request could benefit from enterprise
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

- **Lookup / discovery** ("find/show/where is …"): call `mcp__glean_default__search`.
- **Synthesis / policy / summary** ("explain/summarize/compare …"): call
  `mcp__glean_default__chat`; if verbatim text is required, follow with
  `mcp__glean_default__read_document`.
- **Precise quoting / inspection** (specific doc/section/table): call
  `mcp__glean_default__read_document`.
- **Code questions** ("who calls/where defined/where configured"): call
  `mcp__glean_default__code_search` with a specific symbol/pattern; refine
  with repo/path/language filters.

## CHAINS

- **lookup→quote**: search → read_document → answer with citations/quotes.
- **explain→sources**: chat → (optional) read_document for verbatim passages.
- **debug→context**: search (error/service) → read_document (tickets/PRs) →
  code_search (symbols/paths) → propose likely fix.
- **code→context**: code_search → open/summarize → (optional) search for design docs/runbooks/SEVs.

## QUERY REFINEMENT

- Add **team/product/source/timeframe** to `search` queries (e.g., "billing", "Confluence only", "after:2025-06").
- Add **repo/path/language** to `code_search` (e.g., `repo:platform`, `path:services/auth`, `lang:go`).

## OUTPUT EXPECTATIONS

- Provide **links/titles** and a one-line **why this source**.
- Start with a concise summary, then **exact quotes** (with headings/anchors).
- If results are broad or thin, refine and retry automatically.

## EXAMPLES

- "Find PTO policy changes this year" → `search` → `read_document` → quote changes.
- "Who uses ValidateSession?" → `code_search` → summarize call sites.
- "Recent errors in payments service?" → `search` → open Jira/Slack → `code_search` suspected modules.
