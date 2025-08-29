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
        "
      `);
    });

    it('creates claude-code files when client is claude-code', async () => {
      await initializeProject({ client: 'claude-code' });

      // Check all 5 expected files are created
      const expectedFiles = [
        '.claude/commands/glean_search.md',
        '.claude/commands/glean_chat.md',
        '.claude/commands/glean_read_document.md',
        '.claude/commands/glean_code_search.md',
        '.claude/agents/glean-expert.md',
      ];

      for (const filePath of expectedFiles) {
        const fullPath = path.join(tempDir, filePath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }

      // Verify content of one file
      const searchCommand = fs.readFileSync(
        path.join(tempDir, '.claude/commands/glean_search.md'),
        'utf-8',
      );
      expect(searchCommand).toMatchInlineSnapshot(`
        "---
        description: Enterprise search via Glean across Slack, Jira, GitHub, Confluence, Drive (permission-aware). Returns ranked sources to open/read next.
        argument-hint: <query>
        ---

        ## Plan

        User query: "$ARGUMENTS"

        1. Call Glean search with the natural query.
        2. If results are broad, refine with team/product/source/timeframe filters (e.g., "team:billing after:2025-06", "source:Confluence").
        3. For the top 1–3 results, chain **/glean_read_document** to extract quotes before answering.

        ### TOOL CALL

        mcp**glean_default**search "$ARGUMENTS"

        ### Notes

        - Prefer qualifiers (PRD, RFC, runbook, Jira key, Slack channel, repository).
        - If the user asks for verbatim quotes → **/glean_read_document**.
        "
      `);
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
        '  .claude/commands/glean_search.md',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('  AGENTS.md');

      consoleLogSpy.mockRestore();
    });
  });

  describe('error scenarios', () => {
    it('throws error when no options provided', async () => {
      await expect(initializeProject({})).rejects.toThrow(
        'Must specify --client <name> or --agents-md (or both)',
      );
    });

    it('throws error when only dryRun is provided', async () => {
      await expect(initializeProject({ dryRun: true })).rejects.toThrow(
        'Must specify --client <name> or --agents-md (or both)',
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
      expect(fs.existsSync(path.join(tempDir, '.claude', 'commands'))).toBe(
        true,
      );
      expect(fs.existsSync(path.join(tempDir, '.claude', 'agents'))).toBe(true);
    });

    it('creates cursor directory structure', async () => {
      await initializeProject({ client: 'cursor' });

      // Verify directory structure was created
      expect(fs.existsSync(path.join(tempDir, '.cursor'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.cursor', 'rules'))).toBe(true);
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
        "
      `);
    });

    it('creates claude-code files with correct frontmatter', async () => {
      await initializeProject({ client: 'claude-code' });

      const searchContent = fs.readFileSync(
        path.join(tempDir, '.claude', 'commands', 'glean_search.md'),
        'utf-8',
      );
      expect(searchContent).toMatchInlineSnapshot(`
        "---
        description: Enterprise search via Glean across Slack, Jira, GitHub, Confluence, Drive (permission-aware). Returns ranked sources to open/read next.
        argument-hint: <query>
        ---

        ## Plan

        User query: "$ARGUMENTS"

        1. Call Glean search with the natural query.
        2. If results are broad, refine with team/product/source/timeframe filters (e.g., "team:billing after:2025-06", "source:Confluence").
        3. For the top 1–3 results, chain **/glean_read_document** to extract quotes before answering.

        ### TOOL CALL

        mcp**glean_default**search "$ARGUMENTS"

        ### Notes

        - Prefer qualifiers (PRD, RFC, runbook, Jira key, Slack channel, repository).
        - If the user asks for verbatim quotes → **/glean_read_document**.
        "
      `);

      const agentContent = fs.readFileSync(
        path.join(tempDir, '.claude', 'agents', 'glean-expert.md'),
        'utf-8',
      );
      expect(agentContent).toMatchInlineSnapshot(`
        "---
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
        "
      `);
    });
  });
});
