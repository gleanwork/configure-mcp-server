# AGENTS.md

## Project Overview

This project uses Glean MCP for enterprise search and context.

## Glean MCP Usage

### Available Tools

When working on this project, you have access to Glean MCP tools via the `{{SERVER_NAME}}` server:

- **Enterprise Search**: Use `search` for finding documents, Slack messages, Jira tickets, etc.
- **AI Chat**: Use `chat` for synthesized answers with citations
- **Document Reading**: Use `read_document` for extracting specific quotes
- **Code Search**: Use `code_search` for company-wide code discovery

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
