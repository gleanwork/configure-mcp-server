import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeProject } from '../init/index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('initializeProject', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-test-'));
    originalCwd = process.cwd();
    // Change to temp dir so files are created there
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('client-specific file generation', () => {
    it('creates cursor files when client is cursor', async () => {
      await initializeProject({ client: 'cursor' });

      const cursorRulePath = path.join(
        tempDir,
        '.cursor',
        'rules',
        'glean-mcp.mdc',
      );
      expect(fs.existsSync(cursorRulePath)).toBe(true);

      const content = fs.readFileSync(cursorRulePath, 'utf-8');
      expect(content).toMatchInlineSnapshot(`
        "---
        description:
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

        - **Lookup / discovery** ("find/show/where is …"): call \`search\`.
        - **Synthesis / policy / summary** ("explain/summarize/compare …"): call
          \`chat\`; if verbatim text is required, follow with
          \`read_document\`.
        - **Precise quoting / inspection** (specific doc/section/table): call
          \`read_document\`.
        - **Code questions** ("who calls/where defined/where configured"): call
          \`code_search\` with a specific symbol/pattern; refine
          with repo/path/language filters.

        ## CHAINS

        - **lookup→quote**: search → read_document → answer with citations/quotes.
        - **explain→sources**: chat → (optional) read_document for verbatim passages.
        - **debug→context**: search (error/service) → read_document (tickets/PRs) →
          code_search (symbols/paths) → propose likely fix.
        - **code→context**: code_search → open/summarize → (optional) search for design docs/runbooks/SEVs.

        ## QUERY REFINEMENT

        ### Document Search Filters (\`search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by document creator/modifier
        - \`from:"person name"\` or \`from:me\` - Filter by user who created/modified/commented

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`updated:"March"|"January"\` - Filter by month name
        - \`after:"YYYY-MM-DD"\` - Documents created after date (no date later than today)
        - \`before:"YYYY-MM-DD"\` - Documents created before date

        **Source Filters:**

        - \`channel:"channel-name"\` - Slack channel (only when explicitly requested)
        - \`app:confluence|github|drive|slack\` - Filter by application/datasource
        - \`type:pdf|document|presentation\` - Filter by document type

        **Result Control:**

        - \`num_results:N\` - Specify number (use exact number or max for "find all")

        ### Code Search Filters (\`code_search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by commit creator
        - \`from:"person name"\` or \`from:me\` - Filter by code file/commit updater/commenter

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`after:"YYYY-MM-DD"\` - Commits/files changed after date
        - \`before:"YYYY-MM-DD"\` - Commits/files changed before date

        **Repository Filters:**

        - \`repo:platform|frontend|backend\` - Filter by repository name
        - \`path:services/auth|components/ui\` - Filter by file path
        - \`lang:go|python|javascript|typescript\` - Filter by programming language

        ## FILTER BEST PRACTICES

        ### When to Use Date Filters

        - **Use \`updated:\`** when user mentions specific timeframes ("last week", "past month")
        - **Use \`after:\`/\`before:\`** for date ranges ("between Jan and March", "since 2024")
        - **Avoid date filters** for "latest" or "recent" without specific timeframe

        ### Person Filter Guidelines

        - **Use quotes** for multi-word names: \`from:"John Smith"\`
        - **Use \`owner:\`** for document creators, \`from:\` for broader involvement
        - **Use \`me\`** when user refers to themselves or their work

        ### Search Strategy

        - **Start broad**, then narrow with filters if too many results
        - **Combine filters** strategically: person + timeframe + source
        - **Use \`num_results:\`** for exhaustive searches ("find all") or specific counts

        ### Common Pitfalls

        - Don't use \`after:\` with future dates
        - Channel filters only work for Slack (\`channel:\` + \`app:slack\`)
        - Code search \`repo:\` and \`path:\` filters need exact matches
        - Quote multi-word filter values: \`channel:"platform-alerts"\`

        ## OUTPUT EXPECTATIONS

        - Provide **links/titles** and a one-line **why this source**.
        - Start with a concise summary, then **exact quotes** (with headings/anchors).
        - If results are broad or thin, refine and retry automatically.

        ## EXAMPLES

        ### Basic Queries

        - "Find PTO policy changes this year" → \`search("PTO policy after:\\"2024-01-01\\"")\` → \`read_document\` → quote changes.
        - "Who uses ValidateSession?" → \`code_search("ValidateSession")\` → summarize call sites.
        - "Recent errors in payments service?" → \`search("payments errors updated:past_week")\` → open Jira/Slack → \`code_search("payments error")\`.

        ### Advanced Filter Combinations

        - **Team-specific recent updates**: \`search("auth team updated:past_month owner:\\"Sarah Chen\\"")\`
        - **Cross-platform bug investigation**: \`code_search("authentication bug from:\\"John\\" updated:past_week")\` + \`search("auth issues channel:\\"platform-alerts\\" updated:past_week")\`
        - **Historical analysis**: \`search("migration strategy after:\\"2023-01-01\\" before:\\"2024-01-01\\" num_results:20")\`
        - **Multi-repo code patterns**: \`code_search("rate limiting repo:api-gateway")\` + \`code_search("rate limiting repo:user-service")\`
        - **Documentation deep-dive**: \`search("API documentation type:document app:confluence updated:past_month")\`

        ### Date Filter Patterns

        - **Recent changes**: \`updated:today|yesterday|past_week\`
        - **Quarterly reviews**: \`after:"2024-07-01" before:"2024-10-01"\`
        - **Monthly summaries**: \`updated:"September"|"October"\`
        - **Project timelines**: \`"project launch" after:"2024-01-01"\`

        ### Channel & Team Workflows

        - **Incident response**: \`search("outage channel:\\"incidents\\" updated:today")\` → \`code_search("error handling updated:today")\`
        - **Feature discussions**: \`search("new feature channel:\\"product-planning\\" updated:past_week")\` → \`code_search("feature flag updated:past_week")\`
        - **Team retrospectives**: \`search("retrospective from:\\"team-lead\\" updated:past_month num_results:10")\`
        "
      `);
    });

    it('creates claude-code files when client is claude-code', async () => {
      await initializeProject({ client: 'claude-code' });

      // Check expected file is created
      const expectedFiles = ['.claude/agents/glean-expert.md'];

      for (const filePath of expectedFiles) {
        const fullPath = path.join(tempDir, filePath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }

      // Verify content of agent file
      const agentFile = fs.readFileSync(
        path.join(tempDir, '.claude/agents/glean-expert.md'),
        'utf-8',
      );
      expect(agentFile).toContain('name:');
      expect(agentFile).toContain('description:');
      expect(agentFile).toContain('tools:');
      expect(agentFile).toContain('glean_default');
    });

    it('handles case-insensitive client names', async () => {
      await initializeProject({ client: 'CURSOR' });

      const cursorRulePath = path.join(
        tempDir,
        '.cursor',
        'rules',
        'glean-mcp.mdc',
      );
      expect(fs.existsSync(cursorRulePath)).toBe(true);
    });

    it('throws error for unsupported client', async () => {
      await expect(
        initializeProject({ client: 'invalid-client' }),
      ).rejects.toThrow('Unsupported client: invalid-client');
    });
  });

  describe('AGENTS.md functionality', () => {
    it('creates AGENTS.md when agentsMd is true', async () => {
      await initializeProject({ agentsMd: true });

      const agentsPath = path.join(tempDir, 'AGENTS.md');
      expect(fs.existsSync(agentsPath)).toBe(true);

      const content = fs.readFileSync(agentsPath, 'utf-8');
      expect(content).toMatchInlineSnapshot(`
        "# AGENTS.md

        ## Project Overview

        This project uses Glean MCP for enterprise search and context.

        ## Glean MCP Usage

        ### Available Tools

        When working on this project, you have access to Glean MCP tools via the \`glean_default\` server:

        - **Enterprise Search** (\`search\`): Find documents, Slack messages, Jira tickets, etc. with advanced filtering by person, date, source, and type
        - **AI Chat** (\`chat\`): Get synthesized answers with citations across multiple knowledge sources
        - **Document Reading** (\`read_document\`): Extract specific quotes, tables, and passages from documents
        - **Code Search** (\`code_search\`): Discover code across repositories with filters for repo, path, language, person, and date

        ### Search Filters

        #### Document Search Filters (\`search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by document creator/modifier
        - \`from:"person name"\` or \`from:me\` - Filter by user who created/modified/commented

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`updated:"March"|"January"\` - Filter by month name
        - \`after:"YYYY-MM-DD"\` - Documents created after date (no date later than today)
        - \`before:"YYYY-MM-DD"\` - Documents created before date

        **Source Filters:**

        - \`channel:"channel-name"\` - Slack channel (only when explicitly requested)
        - \`app:confluence|github|drive|slack\` - Filter by application/datasource
        - \`type:pdf|document|presentation\` - Filter by document type

        **Result Control:**

        - \`num_results:N\` - Specify number (use exact number or max for "find all")

        #### Code Search Filters (\`code_search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by commit creator
        - \`from:"person name"\` or \`from:me\` - Filter by code file/commit updater/commenter

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`after:"YYYY-MM-DD"\` - Commits/files changed after date
        - \`before:"YYYY-MM-DD"\` - Commits/files changed before date

        **Repository Filters:**

        - \`repo:platform|frontend|backend\` - Filter by repository name
        - \`path:services/auth|components/ui\` - Filter by file path
        - \`lang:go|python|javascript|typescript\` - Filter by programming language

        ### Filter Best Practices

        #### When to Use Date Filters

        - **Use \`updated:\`** when user mentions specific timeframes ("last week", "past month")
        - **Use \`after:\`/\`before:\`** for date ranges ("between Jan and March", "since 2024")
        - **Avoid date filters** for "latest" or "recent" without specific timeframe

        #### Person Filter Guidelines

        - **Use quotes** for multi-word names: \`from:"John Smith"\`
        - **Use \`owner:\`** for document creators, \`from:\` for broader involvement
        - **Use \`me\`** when user refers to themselves or their work

        #### Search Strategy

        - **Start broad**, then narrow with filters if too many results
        - **Combine filters** strategically: person + timeframe + source
        - **Use \`num_results:\`** for exhaustive searches ("find all") or specific counts

        #### Common Pitfalls

        - Don't use \`after:\` with future dates
        - Channel filters only work for Slack (\`channel:\` + \`app:slack\`)
        - Code search \`repo:\` and \`path:\` filters need exact matches
        - Quote multi-word filter values: \`channel:"platform-alerts"\`

        ### Usage Patterns

        - **Lookup then Quote**: \`search("topic updated:past_week app:confluence")\` → \`read_document\` for specific details
        - **Explain then Sources**: \`chat("question")\` → \`read_document\` for comprehensive answers with quotes
        - **Debug Context**: \`search("error updated:past_week channel:\\"incidents\\"")\` → \`read_document\` → \`code_search("error-class repo:backend")\`
        - **Code Discovery**: \`code_search("symbol repo:platform path:services/")\` for understanding usage patterns
        - **Historical Analysis**: \`search("topic after:\\"2024-01-01\\" before:\\"2024-06-01\\" num_results:20")\` for project retrospectives

        ### Practical Examples

        #### Basic Workflows

        - **Policy Research**: \`search("security policy updated:past_year type:document")\` → \`read_document\` for current guidelines
        - **Bug Investigation**: \`search("payment bug updated:past_week")\` → \`code_search("payment validation repo:backend")\` for root cause
        - **Feature Understanding**: \`code_search("feature-flag repo:frontend")\` → analyze implementation and usage

        #### Advanced Multi-Step Investigations

        - **Cross-Team Bug Analysis**:
          1. \`search("authentication error channel:\\"platform-alerts\\" updated:past_week")\`
          2. \`read_document\` key incident reports
          3. \`code_search("auth middleware repo:frontend path:auth/ updated:past_week")\`
          4. \`code_search("auth service repo:backend path:services/auth updated:past_week")\`

        - **Feature Impact Assessment**:
          1. \`search("new checkout flow app:confluence updated:past_month")\`
          2. \`code_search("checkout repo:frontend path:checkout/")\`
          3. \`search("checkout issues channel:\\"frontend-issues\\" updated:past_month")\`

        - **Architecture Review**:
          1. \`search("microservices design from:\\"Architecture Team\\" updated:past_year")\`
          2. \`code_search("service-discovery repo:platform")\`
          3. \`code_search("api-gateway repo:platform path:gateway/")\`

        #### Team-Specific Patterns

        - **Onboarding Support**: \`search("getting started guide app:confluence updated:past_month")\` for latest setup docs
        - **Incident Response**: \`search("outage postmortem updated:past_week")\` → \`code_search("error-handling updated:past_week")\` for prevention
        - **Code Review Context**: \`code_search("function-name repo:current-project")\` → understand existing patterns before changes
        - **Architecture Decisions**: \`search("ADR decision app:confluence from:\\"Tech Lead\\"")\` for context on design choices

        #### Date-Specific Queries

        - **Sprint Retrospective**: \`search("sprint review after:\\"2024-09-01\\" before:\\"2024-09-15\\" num_results:10")\`
        - **Recent Changes**: \`code_search("component-name updated:past_week")\` for latest modifications
        - **Quarterly Planning**: \`search("roadmap planning updated:\\"September\\" app:confluence")\`
        - **Release Notes**: \`search("release notes after:\\"2024-08-01\\" type:document")\`

        #### Advanced Filter Combinations

        - **Team Lead's Recent Decisions**: \`search("technical decision from:\\"Team Lead\\" updated:past_month app:confluence")\`
        - **Security-Related Code Changes**: \`code_search("security auth updated:past_month repo:backend")\`
        - **Customer-Reported Issues**: \`search("customer issue channel:\\"support\\" updated:past_week")\` → \`code_search("reported-component")\`
        - **Performance Optimization History**: \`search("performance optimization after:\\"2024-01-01\\" num_results:15")\` → \`code_search("performance repo:backend")\`

        ## Development Environment

        [Additional project-specific instructions can be added here]
        "
      `);
    });

    it('creates both client files and AGENTS.md when both flags are provided', async () => {
      await initializeProject({ client: 'cursor', agentsMd: true });

      // Check cursor file exists
      const cursorRulePath = path.join(
        tempDir,
        '.cursor',
        'rules',
        'glean-mcp.mdc',
      );
      expect(fs.existsSync(cursorRulePath)).toBe(true);

      // Check AGENTS.md exists
      const agentsPath = path.join(tempDir, 'AGENTS.md');
      expect(fs.existsSync(agentsPath)).toBe(true);
    });
  });

  describe('dry run functionality', () => {
    it('shows files without creating them when dryRun is true', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      await initializeProject({ client: 'cursor', dryRun: true });

      // Verify files were not created
      const cursorRulePath = path.join(
        tempDir,
        '.cursor',
        'rules',
        'glean-mcp.mdc',
      );
      expect(fs.existsSync(cursorRulePath)).toBe(false);

      // Verify console output
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Files that would be created:',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  .cursor/rules/glean-mcp.mdc',
      );

      consoleLogSpy.mockRestore();
    });

    it('shows multiple files in dry run', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      await initializeProject({
        client: 'claude-code',
        agentsMd: true,
        dryRun: true,
      });

      // Verify no files were created
      expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'AGENTS.md'))).toBe(false);

      // Verify console shows all files
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Files that would be created:',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  .claude/agents/glean-expert.md',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('  AGENTS.md');

      consoleLogSpy.mockRestore();
    });
  });

  describe('error scenarios', () => {
    it('throws error when no options provided', async () => {
      await expect(initializeProject({})).rejects.toThrow(
        'Must specify --client <name> or --agents (or both)',
      );
    });

    it('throws error when only dryRun is provided', async () => {
      await expect(initializeProject({ dryRun: true })).rejects.toThrow(
        'Must specify --client <name> or --agents (or both)',
      );
    });
  });

  describe('idempotent behavior', () => {
    it('skips existing files and reports correctly', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      // First run - create files
      await initializeProject({ client: 'cursor' });

      // Verify file was created
      const cursorRulePath = path.join(
        tempDir,
        '.cursor',
        'rules',
        'glean-mcp.mdc',
      );
      expect(fs.existsSync(cursorRulePath)).toBe(true);

      // Clear console spy
      consoleLogSpy.mockClear();

      // Second run - should skip existing file
      await initializeProject({ client: 'cursor' });

      // Verify console output shows skipped file
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Skipping .cursor/rules/glean-mcp.mdc (already exists)',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('\nInitialization complete:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Created: 0 files');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Skipped: 1 files (already exist)',
      );

      consoleLogSpy.mockRestore();
    });

    it('creates new files and skips existing ones in mixed scenario', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      // Create only cursor file first
      await initializeProject({ client: 'cursor' });
      consoleLogSpy.mockClear();

      // Then run with both cursor and AGENTS.md
      await initializeProject({ client: 'cursor', agentsMd: true });

      // Should skip cursor file and create AGENTS.md
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Skipping .cursor/rules/glean-mcp.mdc (already exists)',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Created AGENTS.md');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Created: 1 files');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Skipped: 1 files (already exist)',
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('directory creation', () => {
    it('creates nested directories as needed', async () => {
      await initializeProject({ client: 'claude-code' });

      // Verify directory structure was created
      expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.claude', 'agents'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.claude', 'agents'))).toBe(true);
    });

    it('creates cursor directory structure', async () => {
      await initializeProject({ client: 'cursor' });

      // Verify directory structure was created
      expect(fs.existsSync(path.join(tempDir, '.cursor'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.cursor', 'rules'))).toBe(true);
    });
  });

  describe('server name configuration', () => {
    it('uses default server name when not specified', async () => {
      await initializeProject({ client: 'cursor' });

      const cursorRulePath = path.join(
        tempDir,
        '.cursor',
        'rules',
        'glean-mcp.mdc',
      );
      const content = fs.readFileSync(cursorRulePath, 'utf-8');

      expect(content).toContain('server key: glean_default');
    });

    it('uses custom server name when specified', async () => {
      const customServerName = 'my_custom_server';
      await initializeProject({
        client: 'cursor',
        serverName: customServerName,
      });

      const cursorRulePath = path.join(
        tempDir,
        '.cursor',
        'rules',
        'glean-mcp.mdc',
      );
      const content = fs.readFileSync(cursorRulePath, 'utf-8');

      expect(content).toContain(`server key: ${customServerName}`);
      expect(content).not.toContain('glean_default');
      expect(content).not.toContain('{{SERVER_NAME}}');
    });

    it('applies custom server name to claude-code files', async () => {
      const customServerName = 'acme_glean';
      await initializeProject({
        client: 'claude-code',
        serverName: customServerName,
      });

      // Check agent file
      const agentPath = path.join(
        tempDir,
        '.claude',
        'agents',
        'glean-expert.md',
      );
      const agentContent = fs.readFileSync(agentPath, 'utf-8');
      expect(agentContent).toContain(`mcp__${customServerName}__search`);
      expect(agentContent).toContain(`mcp__${customServerName}__chat`);
    });

    it('applies custom server name to AGENTS.md', async () => {
      const customServerName = 'enterprise_glean';
      await initializeProject({ agentsMd: true, serverName: customServerName });

      const agentsPath = path.join(tempDir, 'AGENTS.md');
      const content = fs.readFileSync(agentsPath, 'utf-8');

      expect(content).toContain(`\`${customServerName}\` server`);
      expect(content).not.toContain('glean_default');
    });

    it('handles special characters in server names', async () => {
      const specialServerName = 'test-server_123';
      await initializeProject({
        client: 'claude-code',
        serverName: specialServerName,
      });

      const agentPath = path.join(
        tempDir,
        '.claude',
        'agents',
        'glean-expert.md',
      );
      const content = fs.readFileSync(agentPath, 'utf-8');

      expect(content).toContain(`mcp__${specialServerName}__search`);
    });
  });

  describe('file content validation', () => {
    it('creates cursor file with correct content structure', async () => {
      await initializeProject({ client: 'cursor' });

      const content = fs.readFileSync(
        path.join(tempDir, '.cursor', 'rules', 'glean-mcp.mdc'),
        'utf-8',
      );

      expect(content).toMatchInlineSnapshot(`
        "---
        description:
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

        - **Lookup / discovery** ("find/show/where is …"): call \`search\`.
        - **Synthesis / policy / summary** ("explain/summarize/compare …"): call
          \`chat\`; if verbatim text is required, follow with
          \`read_document\`.
        - **Precise quoting / inspection** (specific doc/section/table): call
          \`read_document\`.
        - **Code questions** ("who calls/where defined/where configured"): call
          \`code_search\` with a specific symbol/pattern; refine
          with repo/path/language filters.

        ## CHAINS

        - **lookup→quote**: search → read_document → answer with citations/quotes.
        - **explain→sources**: chat → (optional) read_document for verbatim passages.
        - **debug→context**: search (error/service) → read_document (tickets/PRs) →
          code_search (symbols/paths) → propose likely fix.
        - **code→context**: code_search → open/summarize → (optional) search for design docs/runbooks/SEVs.

        ## QUERY REFINEMENT

        ### Document Search Filters (\`search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by document creator/modifier
        - \`from:"person name"\` or \`from:me\` - Filter by user who created/modified/commented

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`updated:"March"|"January"\` - Filter by month name
        - \`after:"YYYY-MM-DD"\` - Documents created after date (no date later than today)
        - \`before:"YYYY-MM-DD"\` - Documents created before date

        **Source Filters:**

        - \`channel:"channel-name"\` - Slack channel (only when explicitly requested)
        - \`app:confluence|github|drive|slack\` - Filter by application/datasource
        - \`type:pdf|document|presentation\` - Filter by document type

        **Result Control:**

        - \`num_results:N\` - Specify number (use exact number or max for "find all")

        ### Code Search Filters (\`code_search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by commit creator
        - \`from:"person name"\` or \`from:me\` - Filter by code file/commit updater/commenter

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`after:"YYYY-MM-DD"\` - Commits/files changed after date
        - \`before:"YYYY-MM-DD"\` - Commits/files changed before date

        **Repository Filters:**

        - \`repo:platform|frontend|backend\` - Filter by repository name
        - \`path:services/auth|components/ui\` - Filter by file path
        - \`lang:go|python|javascript|typescript\` - Filter by programming language

        ## FILTER BEST PRACTICES

        ### When to Use Date Filters

        - **Use \`updated:\`** when user mentions specific timeframes ("last week", "past month")
        - **Use \`after:\`/\`before:\`** for date ranges ("between Jan and March", "since 2024")
        - **Avoid date filters** for "latest" or "recent" without specific timeframe

        ### Person Filter Guidelines

        - **Use quotes** for multi-word names: \`from:"John Smith"\`
        - **Use \`owner:\`** for document creators, \`from:\` for broader involvement
        - **Use \`me\`** when user refers to themselves or their work

        ### Search Strategy

        - **Start broad**, then narrow with filters if too many results
        - **Combine filters** strategically: person + timeframe + source
        - **Use \`num_results:\`** for exhaustive searches ("find all") or specific counts

        ### Common Pitfalls

        - Don't use \`after:\` with future dates
        - Channel filters only work for Slack (\`channel:\` + \`app:slack\`)
        - Code search \`repo:\` and \`path:\` filters need exact matches
        - Quote multi-word filter values: \`channel:"platform-alerts"\`

        ## OUTPUT EXPECTATIONS

        - Provide **links/titles** and a one-line **why this source**.
        - Start with a concise summary, then **exact quotes** (with headings/anchors).
        - If results are broad or thin, refine and retry automatically.

        ## EXAMPLES

        ### Basic Queries

        - "Find PTO policy changes this year" → \`search("PTO policy after:\\"2024-01-01\\"")\` → \`read_document\` → quote changes.
        - "Who uses ValidateSession?" → \`code_search("ValidateSession")\` → summarize call sites.
        - "Recent errors in payments service?" → \`search("payments errors updated:past_week")\` → open Jira/Slack → \`code_search("payments error")\`.

        ### Advanced Filter Combinations

        - **Team-specific recent updates**: \`search("auth team updated:past_month owner:\\"Sarah Chen\\"")\`
        - **Cross-platform bug investigation**: \`code_search("authentication bug from:\\"John\\" updated:past_week")\` + \`search("auth issues channel:\\"platform-alerts\\" updated:past_week")\`
        - **Historical analysis**: \`search("migration strategy after:\\"2023-01-01\\" before:\\"2024-01-01\\" num_results:20")\`
        - **Multi-repo code patterns**: \`code_search("rate limiting repo:api-gateway")\` + \`code_search("rate limiting repo:user-service")\`
        - **Documentation deep-dive**: \`search("API documentation type:document app:confluence updated:past_month")\`

        ### Date Filter Patterns

        - **Recent changes**: \`updated:today|yesterday|past_week\`
        - **Quarterly reviews**: \`after:"2024-07-01" before:"2024-10-01"\`
        - **Monthly summaries**: \`updated:"September"|"October"\`
        - **Project timelines**: \`"project launch" after:"2024-01-01"\`

        ### Channel & Team Workflows

        - **Incident response**: \`search("outage channel:\\"incidents\\" updated:today")\` → \`code_search("error handling updated:today")\`
        - **Feature discussions**: \`search("new feature channel:\\"product-planning\\" updated:past_week")\` → \`code_search("feature flag updated:past_week")\`
        - **Team retrospectives**: \`search("retrospective from:\\"team-lead\\" updated:past_month num_results:10")\`
        "
      `);
    });

    it('creates claude-code files with correct frontmatter', async () => {
      await initializeProject({ client: 'claude-code' });

      const agentContent = fs.readFileSync(
        path.join(tempDir, '.claude', 'agents', 'glean-expert.md'),
        'utf-8',
      );
      expect(agentContent).toMatchInlineSnapshot(`
        "---
        name: glean-expert
        description:
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
        1. search "[topic] updated:past_week app:confluence" (add specific filters)
        2. Pick best match → read_document id_or_url:"…"
        3. Answer with short summary + exact quotes + links.

        <workflow name="explain→sources">
        1. chat prompt:"[question]"
        2. If key sources cited → read_document for verbatim passages/tables.

        <workflow name="debugging-context">
        1. search "[error|service] updated:past_week channel:\\"incidents\\""
        2. Open relevant Jira/Slack/PRs via read_document; note root-causes/workarounds.
        3. code_search "[error-class] repo:backend updated:past_week"; summarize likely change surface.

        <workflow name="code-discovery">
        1. code_search "[symbol|pattern] repo:[specific-repo] path:[component/]"
        2. Open files; summarize responsibilities, call sites, and edge cases.

        ## FILTERS

        ### Document Search Filters (\`search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by document creator/modifier
        - \`from:"person name"\` or \`from:me\` - Filter by user who created/modified/commented

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`updated:"March"|"January"\` - Filter by month name
        - \`after:"YYYY-MM-DD"\` - Documents created after date (no date later than today)
        - \`before:"YYYY-MM-DD"\` - Documents created before date

        **Source Filters:**

        - \`channel:"channel-name"\` - Slack channel (only when explicitly requested)
        - \`app:confluence|github|drive|slack\` - Filter by application/datasource
        - \`type:pdf|document|presentation\` - Filter by document type

        **Result Control:**

        - \`num_results:N\` - Specify number (use exact number or max for "find all")

        ### Code Search Filters (\`code_search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by commit creator
        - \`from:"person name"\` or \`from:me\` - Filter by code file/commit updater/commenter

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`after:"YYYY-MM-DD"\` - Commits/files changed after date
        - \`before:"YYYY-MM-DD"\` - Commits/files changed before date

        **Repository Filters:**

        - \`repo:platform|frontend|backend\` - Filter by repository name
        - \`path:services/auth|components/ui\` - Filter by file path
        - \`lang:go|python|javascript|typescript\` - Filter by programming language

        ## FILTER BEST PRACTICES

        ### When to Use Date Filters

        - **Use \`updated:\`** when user mentions specific timeframes ("last week", "past month")
        - **Use \`after:\`/\`before:\`** for date ranges ("between Jan and March", "since 2024")
        - **Avoid date filters** for "latest" or "recent" without specific timeframe

        ### Person Filter Guidelines

        - **Use quotes** for multi-word names: \`from:"John Smith"\`
        - **Use \`owner:\`** for document creators, \`from:\` for broader involvement
        - **Use \`me\`** when user refers to themselves or their work

        ### Search Strategy

        - **Start broad**, then narrow with filters if too many results
        - **Combine filters** strategically: person + timeframe + source
        - **Use \`num_results:\`** for exhaustive searches ("find all") or specific counts

        ### Common Pitfalls

        - Don't use \`after:\` with future dates
        - Channel filters only work for Slack (\`channel:\` + \`app:slack\`)
        - Code search \`repo:\` and \`path:\` filters need exact matches
        - Quote multi-word filter values: \`channel:"platform-alerts"\`

        ## EXAMPLES

        ### Basic Query Patterns

        - **Policy lookup**: \`search("PTO policy updated:past_year type:document")\` → \`read_document\` for exact policy text
        - **Code investigation**: \`code_search("AuthService repo:backend")\` → summarize implementation and usage
        - **Recent incidents**: \`search("outage updated:past_week channel:\\"incidents\\"")\` → \`read_document\` for root cause analysis

        ### Advanced Filter Combinations

        - **Team-specific debugging**:
          1. \`search("payment errors updated:past_week from:\\"Sarah Chen\\"")\`
          2. \`code_search("payment validation repo:api-gateway updated:past_week")\`
        - **Cross-platform investigation**:
          1. \`search("authentication issues channel:\\"platform-alerts\\" updated:past_month")\`
          2. \`code_search("auth middleware repo:frontend path:auth/")\`
          3. \`code_search("auth service repo:backend path:services/auth")\`
        - **Historical analysis**:
          1. \`search("migration strategy after:\\"2023-01-01\\" before:\\"2024-01-01\\" num_results:15")\`
          2. \`read_document\` key migration docs for lessons learned

        ### Workflow-Specific Examples

        - **Feature research**: \`search("feature flags app:confluence updated:past_month")\` → \`code_search("feature toggle repo:platform")\`
        - **Bug reproduction**: \`search("bug report channel:\\"frontend-issues\\" updated:today")\` → \`code_search("error handling repo:frontend updated:past_week")\`
        - **Architecture review**: \`search("system design app:confluence from:\\"Tech Lead\\"")\` → \`code_search("service architecture repo:backend path:services/")\`
        - **Incident response**: \`search("database timeout updated:today")\` → \`code_search("connection pool repo:backend")\` → propose fixes

        ### Date Filter Patterns

        - **Recent activity**: \`updated:today|yesterday|past_week\`
        - **Quarterly analysis**: \`after:"2024-07-01" before:"2024-10-01"\`
        - **Monthly reviews**: \`updated:"September"\`
        - **Project retrospective**: \`"project-name" after:"2024-01-01" num_results:20\`

        ## PRINCIPLES

        - Prefer **search + read_document** when traceability/quotes matter.
        - Prefer **chat** when synthesis across multiple sources is needed.
        - Always return links/titles and why each source is relevant.
        - Iterate queries with product/team/date or repo/path/language filters.
        "
      `);
    });

    it('creates AGENTS.md with correct structure', async () => {
      await initializeProject({ agentsMd: true });

      const content = fs.readFileSync(path.join(tempDir, 'AGENTS.md'), 'utf-8');
      expect(content).toMatchInlineSnapshot(`
        "# AGENTS.md

        ## Project Overview

        This project uses Glean MCP for enterprise search and context.

        ## Glean MCP Usage

        ### Available Tools

        When working on this project, you have access to Glean MCP tools via the \`glean_default\` server:

        - **Enterprise Search** (\`search\`): Find documents, Slack messages, Jira tickets, etc. with advanced filtering by person, date, source, and type
        - **AI Chat** (\`chat\`): Get synthesized answers with citations across multiple knowledge sources
        - **Document Reading** (\`read_document\`): Extract specific quotes, tables, and passages from documents
        - **Code Search** (\`code_search\`): Discover code across repositories with filters for repo, path, language, person, and date

        ### Search Filters

        #### Document Search Filters (\`search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by document creator/modifier
        - \`from:"person name"\` or \`from:me\` - Filter by user who created/modified/commented

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`updated:"March"|"January"\` - Filter by month name
        - \`after:"YYYY-MM-DD"\` - Documents created after date (no date later than today)
        - \`before:"YYYY-MM-DD"\` - Documents created before date

        **Source Filters:**

        - \`channel:"channel-name"\` - Slack channel (only when explicitly requested)
        - \`app:confluence|github|drive|slack\` - Filter by application/datasource
        - \`type:pdf|document|presentation\` - Filter by document type

        **Result Control:**

        - \`num_results:N\` - Specify number (use exact number or max for "find all")

        #### Code Search Filters (\`code_search\`)

        **Person Filters:**

        - \`owner:"person name"\` or \`owner:me\` - Filter by commit creator
        - \`from:"person name"\` or \`from:me\` - Filter by code file/commit updater/commenter

        **Date Filters:**

        - \`updated:today|yesterday|past_week|past_month|past_year\` - Filter by update date
        - \`after:"YYYY-MM-DD"\` - Commits/files changed after date
        - \`before:"YYYY-MM-DD"\` - Commits/files changed before date

        **Repository Filters:**

        - \`repo:platform|frontend|backend\` - Filter by repository name
        - \`path:services/auth|components/ui\` - Filter by file path
        - \`lang:go|python|javascript|typescript\` - Filter by programming language

        ### Filter Best Practices

        #### When to Use Date Filters

        - **Use \`updated:\`** when user mentions specific timeframes ("last week", "past month")
        - **Use \`after:\`/\`before:\`** for date ranges ("between Jan and March", "since 2024")
        - **Avoid date filters** for "latest" or "recent" without specific timeframe

        #### Person Filter Guidelines

        - **Use quotes** for multi-word names: \`from:"John Smith"\`
        - **Use \`owner:\`** for document creators, \`from:\` for broader involvement
        - **Use \`me\`** when user refers to themselves or their work

        #### Search Strategy

        - **Start broad**, then narrow with filters if too many results
        - **Combine filters** strategically: person + timeframe + source
        - **Use \`num_results:\`** for exhaustive searches ("find all") or specific counts

        #### Common Pitfalls

        - Don't use \`after:\` with future dates
        - Channel filters only work for Slack (\`channel:\` + \`app:slack\`)
        - Code search \`repo:\` and \`path:\` filters need exact matches
        - Quote multi-word filter values: \`channel:"platform-alerts"\`

        ### Usage Patterns

        - **Lookup then Quote**: \`search("topic updated:past_week app:confluence")\` → \`read_document\` for specific details
        - **Explain then Sources**: \`chat("question")\` → \`read_document\` for comprehensive answers with quotes
        - **Debug Context**: \`search("error updated:past_week channel:\\"incidents\\"")\` → \`read_document\` → \`code_search("error-class repo:backend")\`
        - **Code Discovery**: \`code_search("symbol repo:platform path:services/")\` for understanding usage patterns
        - **Historical Analysis**: \`search("topic after:\\"2024-01-01\\" before:\\"2024-06-01\\" num_results:20")\` for project retrospectives

        ### Practical Examples

        #### Basic Workflows

        - **Policy Research**: \`search("security policy updated:past_year type:document")\` → \`read_document\` for current guidelines
        - **Bug Investigation**: \`search("payment bug updated:past_week")\` → \`code_search("payment validation repo:backend")\` for root cause
        - **Feature Understanding**: \`code_search("feature-flag repo:frontend")\` → analyze implementation and usage

        #### Advanced Multi-Step Investigations

        - **Cross-Team Bug Analysis**:
          1. \`search("authentication error channel:\\"platform-alerts\\" updated:past_week")\`
          2. \`read_document\` key incident reports
          3. \`code_search("auth middleware repo:frontend path:auth/ updated:past_week")\`
          4. \`code_search("auth service repo:backend path:services/auth updated:past_week")\`

        - **Feature Impact Assessment**:
          1. \`search("new checkout flow app:confluence updated:past_month")\`
          2. \`code_search("checkout repo:frontend path:checkout/")\`
          3. \`search("checkout issues channel:\\"frontend-issues\\" updated:past_month")\`

        - **Architecture Review**:
          1. \`search("microservices design from:\\"Architecture Team\\" updated:past_year")\`
          2. \`code_search("service-discovery repo:platform")\`
          3. \`code_search("api-gateway repo:platform path:gateway/")\`

        #### Team-Specific Patterns

        - **Onboarding Support**: \`search("getting started guide app:confluence updated:past_month")\` for latest setup docs
        - **Incident Response**: \`search("outage postmortem updated:past_week")\` → \`code_search("error-handling updated:past_week")\` for prevention
        - **Code Review Context**: \`code_search("function-name repo:current-project")\` → understand existing patterns before changes
        - **Architecture Decisions**: \`search("ADR decision app:confluence from:\\"Tech Lead\\"")\` for context on design choices

        #### Date-Specific Queries

        - **Sprint Retrospective**: \`search("sprint review after:\\"2024-09-01\\" before:\\"2024-09-15\\" num_results:10")\`
        - **Recent Changes**: \`code_search("component-name updated:past_week")\` for latest modifications
        - **Quarterly Planning**: \`search("roadmap planning updated:\\"September\\" app:confluence")\`
        - **Release Notes**: \`search("release notes after:\\"2024-08-01\\" type:document")\`

        #### Advanced Filter Combinations

        - **Team Lead's Recent Decisions**: \`search("technical decision from:\\"Team Lead\\" updated:past_month app:confluence")\`
        - **Security-Related Code Changes**: \`code_search("security auth updated:past_month repo:backend")\`
        - **Customer-Reported Issues**: \`search("customer issue channel:\\"support\\" updated:past_week")\` → \`code_search("reported-component")\`
        - **Performance Optimization History**: \`search("performance optimization after:\\"2024-01-01\\" num_results:15")\` → \`code_search("performance repo:backend")\`

        ## Development Environment

        [Additional project-specific instructions can be added here]
        "
      `);
    });
  });
});
