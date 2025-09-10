# AGENTS.md

## Project Overview

This project uses Glean MCP for enterprise search and context.

## Glean MCP Usage

### Available Tools

When working on this project, you have access to Glean MCP tools via the `{{SERVER_NAME}}` server:

- **Enterprise Search** (`search`): Find documents, Slack messages, Jira tickets, etc. with advanced filtering by person, date, source, and type
- **AI Chat** (`chat`): Get synthesized answers with citations across multiple knowledge sources
- **Document Reading** (`read_document`): Extract specific quotes, tables, and passages from documents
- **Code Search** (`code_search`): Discover code across repositories with filters for repo, path, language, person, and date

### Search Filters

#### Document Search Filters (`search`)

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

#### Code Search Filters (`code_search`)

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

### Filter Best Practices

#### When to Use Date Filters

- **Use `updated:`** when user mentions specific timeframes ("last week", "past month")
- **Use `after:`/`before:`** for date ranges ("between Jan and March", "since 2024")
- **Avoid date filters** for "latest" or "recent" without specific timeframe

#### Person Filter Guidelines

- **Use quotes** for multi-word names: `from:"John Smith"`
- **Use `owner:`** for document creators, `from:` for broader involvement
- **Use `me`** when user refers to themselves or their work

#### Search Strategy

- **Start broad**, then narrow with filters if too many results
- **Combine filters** strategically: person + timeframe + source
- **Use `num_results:`** for exhaustive searches ("find all") or specific counts

#### Common Pitfalls

- Don't use `after:` with future dates
- Channel filters only work for Slack (`channel:` + `app:slack`)
- Code search `repo:` and `path:` filters need exact matches
- Quote multi-word filter values: `channel:"platform-alerts"`

### Usage Patterns

- **Lookup then Quote**: `search("topic updated:past_week app:confluence")` → `read_document` for specific details
- **Explain then Sources**: `chat("question")` → `read_document` for comprehensive answers with quotes
- **Debug Context**: `search("error updated:past_week channel:\"incidents\"")` → `read_document` → `code_search("error-class repo:backend")`
- **Code Discovery**: `code_search("symbol repo:platform path:services/")` for understanding usage patterns
- **Historical Analysis**: `search("topic after:\"2024-01-01\" before:\"2024-06-01\" num_results:20")` for project retrospectives

### Practical Examples

#### Basic Workflows

- **Policy Research**: `search("security policy updated:past_year type:document")` → `read_document` for current guidelines
- **Bug Investigation**: `search("payment bug updated:past_week")` → `code_search("payment validation repo:backend")` for root cause
- **Feature Understanding**: `code_search("feature-flag repo:frontend")` → analyze implementation and usage

#### Advanced Multi-Step Investigations

- **Cross-Team Bug Analysis**:
  1. `search("authentication error channel:\"platform-alerts\" updated:past_week")`
  2. `read_document` key incident reports
  3. `code_search("auth middleware repo:frontend path:auth/ updated:past_week")`
  4. `code_search("auth service repo:backend path:services/auth updated:past_week")`

- **Feature Impact Assessment**:
  1. `search("new checkout flow app:confluence updated:past_month")`
  2. `code_search("checkout repo:frontend path:checkout/")`
  3. `search("checkout issues channel:\"frontend-issues\" updated:past_month")`

- **Architecture Review**:
  1. `search("microservices design from:\"Architecture Team\" updated:past_year")`
  2. `code_search("service-discovery repo:platform")`
  3. `code_search("api-gateway repo:platform path:gateway/")`

#### Team-Specific Patterns

- **Onboarding Support**: `search("getting started guide app:confluence updated:past_month")` for latest setup docs
- **Incident Response**: `search("outage postmortem updated:past_week")` → `code_search("error-handling updated:past_week")` for prevention
- **Code Review Context**: `code_search("function-name repo:current-project")` → understand existing patterns before changes
- **Architecture Decisions**: `search("ADR decision app:confluence from:\"Tech Lead\"")` for context on design choices

#### Date-Specific Queries

- **Sprint Retrospective**: `search("sprint review after:\"2024-09-01\" before:\"2024-09-15\" num_results:10")`
- **Recent Changes**: `code_search("component-name updated:past_week")` for latest modifications
- **Quarterly Planning**: `search("roadmap planning updated:\"September\" app:confluence")`
- **Release Notes**: `search("release notes after:\"2024-08-01\" type:document")`

#### Advanced Filter Combinations

- **Team Lead's Recent Decisions**: `search("technical decision from:\"Team Lead\" updated:past_month app:confluence")`
- **Security-Related Code Changes**: `code_search("security auth updated:past_month repo:backend")`
- **Customer-Reported Issues**: `search("customer issue channel:\"support\" updated:past_week")` → `code_search("reported-component")`
- **Performance Optimization History**: `search("performance optimization after:\"2024-01-01\" num_results:15")` → `code_search("performance repo:backend")`

## Development Environment

[Additional project-specific instructions can be added here]
