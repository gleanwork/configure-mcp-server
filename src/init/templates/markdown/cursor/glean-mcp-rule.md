---
description: >
  Apply this rule whenever the user's request could benefit from enterprise
  context accessible via the Glean MCP server (server key: {{SERVER_NAME}}).
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

### Document Search Filters (`search`)

**Person Filters:**

- `owner:"person name"` or `owner:me` - Filter by document creator/modifier
- `from:"person name"` or `from:me` - Filter by user who created/modified/commented

**Date Filters:**

- `updated:today|yesterday|past_week|past_month|past_year` - Filter by update date
- `updated:"March"|"January"` - Filter by month name
- `after:"YYYY-MM-DD"` - Documents created after date (no date later than today)
- `before:"YYYY-MM-DD"` - Documents created before date

**Source Filters:**

- `channel:"channel-name"` - Slack channel (only when explicitly requested)
- `app:confluence|github|drive|slack` - Filter by application/datasource
- `type:pdf|document|presentation` - Filter by document type

**Result Control:**

- `num_results:N` - Specify number (use exact number or max for "find all")

### Code Search Filters (`code_search`)

**Person Filters:**

- `owner:"person name"` or `owner:me` - Filter by commit creator
- `from:"person name"` or `from:me` - Filter by code file/commit updater/commenter

**Date Filters:**

- `updated:today|yesterday|past_week|past_month|past_year` - Filter by update date
- `after:"YYYY-MM-DD"` - Commits/files changed after date
- `before:"YYYY-MM-DD"` - Commits/files changed before date

**Repository Filters:**

- `repo:platform|frontend|backend` - Filter by repository name
- `path:services/auth|components/ui` - Filter by file path
- `lang:go|python|javascript|typescript` - Filter by programming language

## FILTER BEST PRACTICES

### When to Use Date Filters

- **Use `updated:`** when user mentions specific timeframes ("last week", "past month")
- **Use `after:`/`before:`** for date ranges ("between Jan and March", "since 2024")
- **Avoid date filters** for "latest" or "recent" without specific timeframe

### Person Filter Guidelines

- **Use quotes** for multi-word names: `from:"John Smith"`
- **Use `owner:`** for document creators, `from:` for broader involvement
- **Use `me`** when user refers to themselves or their work

### Search Strategy

- **Start broad**, then narrow with filters if too many results
- **Combine filters** strategically: person + timeframe + source
- **Use `num_results:`** for exhaustive searches ("find all") or specific counts

### Common Pitfalls

- Don't use `after:` with future dates
- Channel filters only work for Slack (`channel:` + `app:slack`)
- Code search `repo:` and `path:` filters need exact matches
- Quote multi-word filter values: `channel:"platform-alerts"`

## OUTPUT EXPECTATIONS

- Provide **links/titles** and a one-line **why this source**.
- Start with a concise summary, then **exact quotes** (with headings/anchors).
- If results are broad or thin, refine and retry automatically.

## EXAMPLES

### Basic Queries

- "Find PTO policy changes this year" → `search("PTO policy after:\"2024-01-01\"")` → `read_document` → quote changes.
- "Who uses ValidateSession?" → `code_search("ValidateSession")` → summarize call sites.
- "Recent errors in payments service?" → `search("payments errors updated:past_week")` → open Jira/Slack → `code_search("payments error")`.

### Advanced Filter Combinations

- **Team-specific recent updates**: `search("auth team updated:past_month owner:\"Sarah Chen\"")`
- **Cross-platform bug investigation**: `code_search("authentication bug from:\"John\" updated:past_week")` + `search("auth issues channel:\"platform-alerts\" updated:past_week")`
- **Historical analysis**: `search("migration strategy after:\"2023-01-01\" before:\"2024-01-01\" num_results:20")`
- **Multi-repo code patterns**: `code_search("rate limiting repo:api-gateway")` + `code_search("rate limiting repo:user-service")`
- **Documentation deep-dive**: `search("API documentation type:document app:confluence updated:past_month")`

### Date Filter Patterns

- **Recent changes**: `updated:today|yesterday|past_week`
- **Quarterly reviews**: `after:"2024-07-01" before:"2024-10-01"`
- **Monthly summaries**: `updated:"September"|"October"`
- **Project timelines**: `"project launch" after:"2024-01-01"`

### Channel & Team Workflows

- **Incident response**: `search("outage channel:\"incidents\" updated:today")` → `code_search("error handling updated:today")`
- **Feature discussions**: `search("new feature channel:\"product-planning\" updated:past_week")` → `code_search("feature flag updated:past_week")`
- **Team retrospectives**: `search("retrospective from:\"team-lead\" updated:past_month num_results:10")`
