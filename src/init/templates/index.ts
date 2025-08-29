/**
 * Template constants for Glean MCP project initialization
 */

export const CURSOR_RULE_TEMPLATE = `---
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
- **Lookup / discovery** ("find/show/where is …"): call \`mcp__glean_default__search\`.
- **Synthesis / policy / summary** ("explain/summarize/compare …"): call
  \`mcp__glean_default__chat\`; if verbatim text is required, follow with
  \`mcp__glean_default__read_document\`.
- **Precise quoting / inspection** (specific doc/section/table): call
  \`mcp__glean_default__read_document\`.
- **Code questions** ("who calls/where defined/where configured"): call
  \`mcp__glean_default__code_search\` with a specific symbol/pattern; refine
  with repo/path/language filters.

## CHAINS
- **lookup→quote**: search → read_document → answer with citations/quotes.
- **explain→sources**: chat → (optional) read_document for verbatim passages.
- **debug→context**: search (error/service) → read_document (tickets/PRs) →
  code_search (symbols/paths) → propose likely fix.
- **code→context**: code_search → open/summarize → (optional) search for design docs/runbooks/SEVs.

## QUERY REFINEMENT
- Add **team/product/source/timeframe** to \`search\` queries (e.g., "billing", "Confluence only", "after:2025-06").
- Add **repo/path/language** to \`code_search\` (e.g., \`repo:platform\`, \`path:services/auth\`, \`lang:go\`).

## OUTPUT EXPECTATIONS
- Provide **links/titles** and a one-line **why this source**.
- Start with a concise summary, then **exact quotes** (with headings/anchors).
- If results are broad or thin, refine and retry automatically.

## EXAMPLES
- "Find PTO policy changes this year" → \`search\` → \`read_document\` → quote changes.
- "Who uses ValidateSession?" → \`code_search\` → summarize call sites.
- "Recent errors in payments service?" → \`search\` → open Jira/Slack → \`code_search\` suspected modules.
`;

export const CLAUDE_SEARCH_COMMAND_TEMPLATE = `---
description: Enterprise search via Glean across Slack, Jira, GitHub, Confluence, Drive (permission-aware). Returns ranked sources to open/read next.
argument-hint: <query>
---

## Plan
User query: "$ARGUMENTS"

1) Call Glean search with the natural query.
2) If results are broad, refine with team/product/source/timeframe filters (e.g., "team:billing after:2025-06", "source:Confluence").
3) For the top 1–3 results, chain **/glean_read_document** to extract quotes before answering.

### TOOL CALL
mcp__glean_default__search "$ARGUMENTS"

### Notes
- Prefer qualifiers (PRD, RFC, runbook, Jira key, Slack channel, repository).
- If the user asks for verbatim quotes → **/glean_read_document**.
`;

export const CLAUDE_CHAT_COMMAND_TEMPLATE = `---
description: Ask Glean to synthesize an answer with citations from enterprise sources (permission-aware).
argument-hint: <question>
---

## Plan
Question: "$ARGUMENTS"

1) Use when the user needs an explanation/summary/policy across many sources.
2) Add short context bullets if useful (team, dates, links, systems).
3) After reply, surface sources; if quotes are needed → call **/glean_read_document**.

### TOOL CALL
mcp__glean_default__chat prompt:"$ARGUMENTS"
`;

export const CLAUDE_READ_DOCUMENT_COMMAND_TEMPLATE = `---
description: Read a specific document (URL or ID) to quote or analyze precisely.
argument-hint: <doc-url-or-id> [optional section/heading]
---

## Plan
Target: "$ARGUMENTS"

1) Resolve to a Glean doc (URL or ID).
2) Pull full text; extract only the sections needed to answer.
3) Return a short summary AND exact quotes (with headings/anchors if available).

### TOOL CALL
mcp__glean_default__read_document id_or_url:"$ARGUMENTS"
`;

export const CLAUDE_CODE_SEARCH_COMMAND_TEMPLATE = `---
description: Company-wide code search (symbols, files, patterns) via Glean (GitHub/GitLab).
argument-hint: <code query> [optional filters]
---

## Plan
Query: "$ARGUMENTS"

1) Prefer specific symbols/paths (e.g., ValidateSession, path:services/auth).
2) If noisy, iterate with repo/path/language filters (e.g., repo:platform, lang:go).
3) When a file looks relevant: open it in the editor and summarize usage/intent.

### TOOL CALL
mcp__glean_default__code_search query:"$ARGUMENTS" limit:20
`;

export const CLAUDE_AGENT_TEMPLATE = `---
name: glean-expert
description: >
  PROACTIVELY use this subagent when coding tasks would benefit from enterprise
  context—debugging, testing, understanding code, or researching features. This
  agent searches Slack/Jira/GitHub/Confluence/Drive via Glean, then chains
  read/quote or code lookup for precise, sourced answers.
tools:
  - mcp__glean_default__search
  - mcp__glean_default__chat
  - mcp__glean_default__read_document
  - mcp__glean_default__code_search
model: sonnet
color: blue
---

## TRIGGERS → IMMEDIATE TOOL USE
- "Find / where is / show docs …" → **search**
- "Explain / summarize / what's our policy …" → **chat** (then **read_document** for quotes)
- "Open/quote this doc …" → **read_document**
- "Where in code… / who calls… / where configured… " → **code_search**
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
`;

export const AGENTS_MD_TEMPLATE = `# AGENTS.md

## Project Overview
This project uses Glean MCP for enterprise search and context.

## Glean MCP Usage

### Available Tools
When working on this project, you have access to Glean MCP tools via the \`glean_default\` server:

- **Enterprise Search**: Use \`mcp__glean_default__search\` for finding documents, Slack messages, Jira tickets, etc.
- **AI Chat**: Use \`mcp__glean_default__chat\` for synthesized answers with citations
- **Document Reading**: Use \`mcp__glean_default__read_document\` for extracting specific quotes
- **Code Search**: Use \`mcp__glean_default__code_search\` for company-wide code discovery

### Usage Patterns
- **Lookup then Quote**: search → read_document for specific details
- **Explain then Sources**: chat → read_document for comprehensive answers
- **Debug Context**: search issues → read_document → code_search for troubleshooting
- **Code Discovery**: code_search for understanding usage patterns

### Best Practices
- Always cite sources with links and titles
- Refine queries with team/product/timeframe filters for search
- Use repo/path/language filters for code_search
- Provide concise summaries followed by relevant quotes

## Development Environment
[Additional project-specific instructions can be added here]
`;
