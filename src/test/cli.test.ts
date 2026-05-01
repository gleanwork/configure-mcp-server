import path from 'path';
import fs from 'fs';
import { createBintastic, BintasticProject, type Result } from 'bintastic';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/** Execa result stdout/stderr type */
type ExecaOutput = Result['stdout'];

function normalizeOutput(output: ExecaOutput, baseDir: string): string {
  const outputStr = String(output ?? '');
  let normalized = normalizeBaseDirOutput(outputStr, baseDir);
  normalized = normalizeVersionOutput(normalized);
  normalized = normalizeVSCodeConfigPath(normalized);
  normalized = normalizeClaudeConfigPath(normalized);

  return normalized;
}

function normalizeBaseDirOutput(output: string, baseDir: string): string {
  return output.replace(new RegExp(baseDir, 'g'), '<TMP_DIR>');
}

function normalizeVersionOutput(output: string): string {
  return output.replace(
    /Version: v\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?/g,
    'Version: v9.9.9',
  );
}

function normalizeVSCodeConfigPath(output: string): string {
  // Normalize VS Code config paths (both mcp.json and settings.json)
  return output
    .replace(
      /[^\s"]*(\.config|Library\/Application Support|Code)([/\\][^/\\]+)*[/\\]mcp\.json/g,
      '<VS_CODE_CONFIG_DIR>/mcp.json',
    )
    .replace(
      /[^\s"]*(\.config|Code|Application Support)([/\\][^/\\]+)*[/\\]settings\.json/g,
      '<VS_CODE_CONFIG_DIR>/settings.json',
    );
}

function normalizeClaudeConfigPath(output: string): string {
  // Normalize Claude Desktop config paths across platforms
  // macOS: Library/Application Support/Claude/claude_desktop_config.json
  // Windows: Claude/claude_desktop_config.json
  // Linux: Claude/claude_desktop_config.json (hypothetically)
  return output.replace(
    /[^\s"]*(Library\/Application Support\/Claude|Claude)[/\\]claude_desktop_config\.json/g,
    '<CLAUDE_CONFIG_DIR>/claude_desktop_config.json',
  );
}

describe('CLI', () => {
  let project: BintasticProject;
  let originalEnv: NodeJS.ProcessEnv;

  const { setupProject, teardownProject, runBin } = createBintastic({
    binPath: fileURLToPath(new URL('../../build/index.js', import.meta.url)),
  });

  beforeEach(async () => {
    originalEnv = { ...process.env };

    delete process.env.GLEAN_BETA_ENABLED;
    delete process.env.GLEAN_API_TOKEN;
    delete process.env.GLEAN_INSTANCE;
    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_URL;
    process.env._SKIP_INSTANCE_PREFLIGHT = 'true';

    project = await setupProject();
  });

  afterEach(() => {
    teardownProject();
    process.env = originalEnv;
  });

  it('shows help output', async () => {
    const result = await runBin('--help');

    expect(result.exitCode).toEqual(0);
    expect(result.stderr).toMatchInlineSnapshot(`""`);
    expect(normalizeOutput(result.stdout, project.baseDir))
      .toMatchInlineSnapshot(`
        "Usage: configure-mcp-server [options] [command]

        Configure popular MCP clients to add Glean as an MCP server

        Options:
          -v, --version     Output the current version
          -h, --help        display help for command

        Commands:
          local [options]   Configure Glean's local MCP server for a given client
          remote [options]  Configure Glean's remote MCP server for a given client
          init [options]    Initialize Glean MCP project tools for enhanced development
                            experience
          help              Show detailed help including supported clients

        Available MCP Clients:
          claude-code      Claude Code
          claude-desktop   Claude for Desktop
          codex            Codex
          cursor           Cursor
          goose            Goose
          jetbrains        JetBrains AI Assistant
          junie            Junie (JetBrains)
          vscode           Visual Studio Code
          windsurf         Windsurf

        Available MCP Servers:
          local     Glean's local MCP server with access to common tools (search, chat, read_documents, etc.)
          remote    Glean's remote MCP servers hosted in your Glean instance

        Examples:
          Configure local MCP server:
            $ npx -y @gleanwork/configure-mcp-server local --client cursor --token xxx --server-url https://acme-be.glean.com

          Configure remote MCP server:
            $ npx -y @gleanwork/configure-mcp-server remote --client cursor --url https://my-be.glean.com/mcp/default

          Initialize project files:
            $ npx -y @gleanwork/configure-mcp-server init --client cursor
        "
      `);
  });

  it('shows beta help output', async () => {
    process.env.GLEAN_BETA_ENABLED = 'true';
    const result = await runBin('--help');

    expect(result.exitCode).toEqual(0);
    expect(result.stderr).toMatchInlineSnapshot(`""`);
    expect(normalizeOutput(result.stdout, project.baseDir))
      .toMatchInlineSnapshot(`
        "Usage: configure-mcp-server [options] [command]

        Configure popular MCP clients to add Glean as an MCP server

        Options:
          -v, --version     Output the current version
          -h, --help        display help for command

        Commands:
          local [options]   Configure Glean's local MCP server for a given client
          remote [options]  Configure Glean's remote MCP server for a given client
          init [options]    Initialize Glean MCP project tools for enhanced development
                            experience
          help              Show detailed help including supported clients

        Available MCP Clients:
          claude-code      Claude Code
          claude-desktop   Claude for Desktop
          codex            Codex
          cursor           Cursor
          goose            Goose
          jetbrains        JetBrains AI Assistant
          junie            Junie (JetBrains)
          vscode           Visual Studio Code
          windsurf         Windsurf

        Available MCP Servers:
          local     Glean's local MCP server with access to common tools (search, chat, read_documents, etc.)
          remote    Glean's remote MCP servers hosted in your Glean instance

        Examples:
          Configure local MCP server:
            $ npx -y @gleanwork/configure-mcp-server local --client cursor --token xxx --server-url https://acme-be.glean.com

          Configure remote MCP server:
            $ npx -y @gleanwork/configure-mcp-server remote --client cursor --url https://my-be.glean.com/mcp/default

          Initialize project files:
            $ npx -y @gleanwork/configure-mcp-server init --client cursor
        "
      `);
  });

  it('handles invalid commands', async () => {
    const result = await runBin('invalid-command');

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`"error: unknown command 'invalid-command'"`);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  it('local subcommand exits with friendly error (no local server configured)', async () => {
    const result = await runBin('local', '--client', 'cursor');

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
      "No local MCP server is configured for this registry.
      Local installation isn't supported here — use the remote transport instead:

        configure-mcp-server remote --url <your-server-url> --client <client>"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  it('handles invalid clients (via remote)', async () => {
    const result = await runBin(
      'remote',
      '--client',
      'invalid-client',
      '--url',
      'https://example-be.glean.com/mcp/default',
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
      "Unsupported MCP client: invalid-client
      Supported clients: claude-code, claude-desktop, codex, cursor, goose, jetbrains, junie, vscode, windsurf"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  describe('remote', () => {
    beforeEach(() => {
      process.env.GLEAN_BETA_ENABLED = 'true';
    });

    it('requires --url for remote configuration', async () => {
      const result = await runBin(
        'remote',
        '--client',
        'cursor',
        '--token',
        'glean_api_test',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(1);
      expect(result.stderr).toContain(
        'Remote configuration requires a URL (--url)',
      );
    });

    it('configures with --url for full MCP server URLs', async () => {
      const result = await runBin(
        'remote',
        '--url',
        'https://my-be.glean.com/mcp/analytics',
        '--client',
        'cursor',
        '--token',
        'test-token',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Configuring Glean MCP for Cursor...
          Created new configuration file at: <TMP_DIR>/.cursor/mcp.json

          Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

          To use it:
          1. Restart Cursor
          2. Agent will now have access to Glean tools
          3. You'll be asked for approval when Agent uses these tools
          "
        `);

      const configFileContents = fs.readFileSync(
        path.join(project.baseDir, '.cursor', 'mcp.json'),
        'utf8',
      );
      const config = JSON.parse(configFileContents);
      expect(config).toMatchInlineSnapshot(`
          {
            "mcpServers": {
              "glean_analytics": {
                "headers": {
                  "Authorization": "Bearer test-token",
                },
                "type": "http",
                "url": "https://my-be.glean.com/mcp/analytics",
              },
            },
          }
        `);
    });

    it('uses "glean_default" as server name when URL contains /mcp/default', async () => {
      const result = await runBin(
        'remote',
        '--url',
        'https://my-be.glean.com/mcp/default',
        '--client',
        'cursor',
        '--token',
        'test-token',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);

      const configFileContents = fs.readFileSync(
        path.join(project.baseDir, '.cursor', 'mcp.json'),
        'utf8',
      );
      const config = JSON.parse(configFileContents);

      expect(Object.keys(config.mcpServers)[0]).toBe('glean_default');
      expect(config.mcpServers.glean_default).toMatchInlineSnapshot(`
        {
          "headers": {
            "Authorization": "Bearer test-token",
          },
          "type": "http",
          "url": "https://my-be.glean.com/mcp/default",
        }
      `);
    });

  });

  describe('init', () => {
    it('shows help output when --help is provided', async () => {
      const result = await runBin('init', '--help');

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Usage: configure-mcp-server init [options]

          Initialize Glean MCP project tools for enhanced development experience

          Options:
            -c, --client <client>  MCP client to create project files for (cursor,
                                   claude-code)
            --agents               Create AGENTS.md file with Glean MCP instructions
            --server-name <name>   Server name to use in templates (default:
                                   "glean_default")
            --dryRun               Show what files would be created without creating them
            -h, --help             display help for command

          Examples:
            $ npx -y @gleanwork/configure-mcp-server init --client cursor
            $ npx -y @gleanwork/configure-mcp-server init --client claude-code --agents
            $ npx -y @gleanwork/configure-mcp-server init --client cursor --server-name my_glean --dryRun
          "
        `);
    });

    it('shows help output when -h is provided', async () => {
      const result = await runBin('init', '-h');

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
          "Usage: configure-mcp-server init [options]

          Initialize Glean MCP project tools for enhanced development experience

          Options:
            -c, --client <client>  MCP client to create project files for (cursor,
                                   claude-code)
            --agents               Create AGENTS.md file with Glean MCP instructions
            --server-name <name>   Server name to use in templates (default:
                                   "glean_default")
            --dryRun               Show what files would be created without creating them
            -h, --help             display help for command

          Examples:
            $ npx -y @gleanwork/configure-mcp-server init --client cursor
            $ npx -y @gleanwork/configure-mcp-server init --client claude-code --agents
            $ npx -y @gleanwork/configure-mcp-server init --client cursor --server-name my_glean --dryRun
          "
        `);
    });

    it('creates cursor files with --client cursor', async () => {
      const result = await runBin('init', '--client', 'cursor', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Created .cursor/rules/glean-mcp.mdc

        Initialization complete:
          Created: 1 files"
      `);

      // Verify file was actually created
      const filePath = path.join(
        project.baseDir,
        '.cursor',
        'rules',
        'glean-mcp.mdc',
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
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

    it('creates claude-code files with --client claude-code', async () => {
      const result = await runBin('init', '--client', 'claude-code', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Created .claude/agents/glean-expert.md

        Initialization complete:
          Created: 1 files"
      `);

      // Verify files were created
      const expectedFiles = ['.claude/agents/glean-expert.md'];

      for (const file of expectedFiles) {
        const filePath = path.join(project.baseDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it('creates AGENTS.md with --agents', async () => {
      const result = await runBin('init', '--agents', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Created AGENTS.md

        Initialization complete:
          Created: 1 files"
      `);

      // Verify file was created
      const filePath = path.join(project.baseDir, 'AGENTS.md');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
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

    it('creates both client files and AGENTS.md when both flags provided', async () => {
      const result = await runBin('init', '--client', 'cursor', '--agents', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Created .cursor/rules/glean-mcp.mdc
        Created AGENTS.md

        Initialization complete:
          Created: 2 files"
      `);

      // Verify both files exist
      expect(
        fs.existsSync(
          path.join(project.baseDir, '.cursor', 'rules', 'glean-mcp.mdc'),
        ),
      ).toBe(true);
      expect(fs.existsSync(path.join(project.baseDir, 'AGENTS.md'))).toBe(true);
    });

    it('shows files in dry run mode without creating them', async () => {
      const result = await runBin('init', '--client', 'cursor', '--dryRun', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Files that would be created:
          .cursor/rules/glean-mcp.mdc"
      `);

      // Verify no files were created
      expect(fs.existsSync(path.join(project.baseDir, '.cursor'))).toBe(false);
    });

    it('handles multiple files in dry run mode', async () => {
      const result = await runBin(
        'init',
        '--client',
        'claude-code',
        '--agents',
        '--dryRun',
        {
          cwd: project.baseDir,
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Files that would be created:
          .claude/agents/glean-expert.md
          AGENTS.md"
      `);

      // Verify no files were created
      expect(fs.existsSync(path.join(project.baseDir, '.claude'))).toBe(false);
      expect(fs.existsSync(path.join(project.baseDir, 'AGENTS.md'))).toBe(
        false,
      );
    });

    it('skips existing files and reports correctly', async () => {
      // First run - create files
      const firstResult = await runBin('init', '--client', 'cursor', {
        cwd: project.baseDir,
      });
      expect(firstResult.exitCode).toEqual(0);

      // Second run - should skip existing files
      const secondResult = await runBin('init', '--client', 'cursor', {
        cwd: project.baseDir,
      });

      expect(secondResult.exitCode).toEqual(0);
      expect(secondResult.stderr).toMatchInlineSnapshot(`""`);
      expect(secondResult.stdout).toMatchInlineSnapshot(`
        "Skipping .cursor/rules/glean-mcp.mdc (already exists)

        Initialization complete:
          Created: 0 files
          Skipped: 1 files (already exist)"
      `);
    });

    it('fails with invalid client name', async () => {
      const result = await runBin('init', '--client', 'invalid-client', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(1);
      expect(result.stdout).toMatchInlineSnapshot(`""`);
      expect(result.stderr).toMatchInlineSnapshot(
        `"Initialization failed: Unsupported client: invalid-client"`,
      );
    });

    it('fails when no flags provided', async () => {
      const result = await runBin('init', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(1);
      expect(result.stdout).toMatchInlineSnapshot(`""`);
      expect(result.stderr).toMatchInlineSnapshot(
        `"Initialization failed: Must specify --client <name> or --agents (or both)"`,
      );
    });

    it('handles case-insensitive client names', async () => {
      const result = await runBin('init', '--client', 'CURSOR', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Created .cursor/rules/glean-mcp.mdc

        Initialization complete:
          Created: 1 files"
      `);
    });

    it('uses custom server name when --server-name flag is provided', async () => {
      const result = await runBin(
        'init',
        '--client',
        'cursor',
        '--server-name',
        'my_custom_server',
        {
          cwd: project.baseDir,
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Created .cursor/rules/glean-mcp.mdc

        Initialization complete:
          Created: 1 files"
      `);

      // Verify the custom server name was used in the generated file
      const content = fs.readFileSync(
        path.join(project.baseDir, '.cursor', 'rules', 'glean-mcp.mdc'),
        'utf-8',
      );
      expect(content).toMatchInlineSnapshot(`
        "---
        description:
          Apply this rule whenever the user's request could benefit from enterprise
          context accessible via the Glean MCP server (server key: my_custom_server).
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

    it('uses default server name when --server-name flag is not provided', async () => {
      const result = await runBin('init', '--client', 'cursor', {
        cwd: project.baseDir,
      });

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Created .cursor/rules/glean-mcp.mdc

        Initialization complete:
          Created: 1 files"
      `);

      // Verify the default server name was used
      const content = fs.readFileSync(
        path.join(project.baseDir, '.cursor', 'rules', 'glean-mcp.mdc'),
        'utf-8',
      );
      expect(content).toContain('server key: glean_default');
    });

    it('applies custom server name to claude-code files', async () => {
      const customServerName = 'acme_glean';
      const result = await runBin(
        'init',
        '--client',
        'claude-code',
        '--server-name',
        customServerName,
        {
          cwd: project.baseDir,
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Created .claude/agents/glean-expert.md

        Initialization complete:
          Created: 1 files"
      `);

      // Check agent file has correct server name
      const agentContent = fs.readFileSync(
        path.join(project.baseDir, '.claude', 'agents', 'glean-expert.md'),
        'utf-8',
      );
      expect(agentContent).toContain('acme_glean');
    });

    it('shows custom server name in dry run output', async () => {
      const result = await runBin(
        'init',
        '--client',
        'cursor',
        '--server-name',
        'test_server',
        '--dryRun',
        {
          cwd: project.baseDir,
        },
      );

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(result.stdout).toMatchInlineSnapshot(`
        "Files that would be created:
          .cursor/rules/glean-mcp.mdc"
      `);

      // Should not actually create files in dry run
      expect(fs.existsSync(path.join(project.baseDir, '.cursor'))).toBe(false);
    });
  });
});
