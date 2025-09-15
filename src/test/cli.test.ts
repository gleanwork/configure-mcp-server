import path from 'path';
import fs from 'fs';
import { createBinTester, BinTesterProject } from '@scalvert/bin-tester';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ConfigFileContents } from '../configure/index.js';
import yaml from 'yaml';

// Define config paths - MUST match what the actual CLI uses for each platform
function getClaudeConfigPath() {
  // This MUST match what the actual claude.ts client uses
  if (process.platform === 'darwin') {
    return {
      configDir: path.join('Library', 'Application Support', 'Claude'),
      configFileName: 'claude_desktop_config.json',
    };
  } else if (process.platform === 'win32') {
    return {
      configDir: 'Claude',
      configFileName: 'claude_desktop_config.json',
    };
  } else {
    // Linux - uses XDG config directory
    return {
      configDir: path.join('.config', 'Claude'),
      configFileName: 'claude_desktop_config.json',
    };
  }
}

const cursorConfigPath = { configDir: '.cursor', configFileName: 'mcp.json' };
const claudeConfigPath = getClaudeConfigPath();
const claudeCodeConfigPath = { configDir: '', configFileName: '.claude.json' };
const windsurfConfigPath = {
  configDir: path.join('.codeium', 'windsurf'),
  configFileName: 'mcp_config.json',
};
const gooseConfigPath = {
  configDir: path.join('.config', 'goose'),
  configFileName: 'config.yaml',
};

function normalizeOutput(output: string, baseDir: string): string {
  let normalized = normalizeBaseDirOutput(output, baseDir);
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

function createConfigFile(configFilePath: string, config: ConfigFileContents) {
  const configDir = path.dirname(configFilePath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

describe('CLI', () => {
  let project: BinTesterProject;
  let configPath: string;
  let configFilePath: string;
  let envFilePath: string;
  let originalEnv: NodeJS.ProcessEnv;

  const { configDir, configFileName } = cursorConfigPath;

  const { setupProject, teardownProject, runBin } = createBinTester({
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

    configPath = path.join(project.baseDir, configDir);
    configFilePath = path.join(configPath, configFileName);
    envFilePath = path.join(project.baseDir, '.env');
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
        "
          MCP server configurator for Glean

          Usage
            Configure popular MCP clients to add Glean as an MCP server.

            Available MCP servers:

              local     A local server using Glean's API to access common tools (search, chat)
              remote    Connect to Glean's hosted MCP servers (default tools and agents).


            $ npx @gleanwork/configure-mcp-server --client <client-name> [options]

          Commands
            local       Configure Glean's local MCP server for a given client
            remote      Configure Glean's remote MCP server for a given client
            init        Initialize Glean MCP project tools for enhanced development experience
            help        Show this help message

          Options for local
            --client, -c    MCP client to configure for (claude-code, claude-desktop, cursor, goose, vscode, windsurf)
            --token, -t     Glean API token (required)
            --instance, -i  Glean instance name
            --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Options for remote
            --client, -c    MCP client to configure for (claude-code, claude-desktop, cursor, goose, vscode, windsurf)
            --url, -u       Full MCP server URL (required, e.g., https://my-be.glean.com/mcp/default)
            --token, -t     Glean API token (optional, OAuth will be used if not provided)
            --env, -e       Path to .env file containing GLEAN_URL and optionally GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Options for init
            --client, -c      MCP client to create project files for (cursor, claude-code)
            --agents          Create AGENTS.md file with Glean MCP instructions
            --server-name     Server name to use in templates (default: glean_default)
            --dryRun          Show what files would be created without creating them


          Examples

            Local:

            npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client claude --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client goose --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client windsurf --env ~/.glean.env
            npx @gleanwork/configure-mcp-server local --instance acme --client vscode --workspace --token glean_api_xyz

            Remote:

            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/agents --client claude
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/analytics --client cursor
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client goose
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client windsurf
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client vscode --workspace

            # With explicit token (bypasses DCR):
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor --token glean_api_xyz

            Init:

            npx @gleanwork/configure-mcp-server init --client cursor
            npx @gleanwork/configure-mcp-server init --client claude-code
            npx @gleanwork/configure-mcp-server init --agents
            npx @gleanwork/configure-mcp-server init --client cursor --agents
            npx @gleanwork/configure-mcp-server init --client cursor --server-name my_glean
            npx @gleanwork/configure-mcp-server init --client claude-code --dryRun

          Run 'npx @gleanwork/configure-mcp-server help' for more details on supported clients

          Version: v9.9.9
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
        "
          MCP server configurator for Glean

          Usage
            Configure popular MCP clients to add Glean as an MCP server.

            Available MCP servers:

              local     A local server using Glean's API to access common tools (search, chat)
              remote    Connect to Glean's hosted MCP servers (default tools and agents).


            $ npx @gleanwork/configure-mcp-server --client <client-name> [options]

          Commands
            local       Configure Glean's local MCP server for a given client
            remote      Configure Glean's remote MCP server for a given client
            init        Initialize Glean MCP project tools for enhanced development experience
            help        Show this help message

          Options for local
            --client, -c    MCP client to configure for (claude-code, claude-desktop, cursor, goose, vscode, windsurf)
            --token, -t     Glean API token (required)
            --instance, -i  Glean instance name
            --env, -e       Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Options for remote
            --client, -c    MCP client to configure for (claude-code, claude-desktop, cursor, goose, vscode, windsurf)
            --url, -u       Full MCP server URL (required, e.g., https://my-be.glean.com/mcp/default)
            --token, -t     Glean API token (optional, OAuth will be used if not provided)
            --env, -e       Path to .env file containing GLEAN_URL and optionally GLEAN_API_TOKEN
            --workspace     Create workspace configuration instead of global (VS Code only)

          Options for init
            --client, -c      MCP client to create project files for (cursor, claude-code)
            --agents          Create AGENTS.md file with Glean MCP instructions
            --server-name     Server name to use in templates (default: glean_default)
            --dryRun          Show what files would be created without creating them


          Examples

            Local:

            npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client claude --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client cursor --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client goose --token glean_api_xyz
            npx @gleanwork/configure-mcp-server local --instance acme --client windsurf --env ~/.glean.env
            npx @gleanwork/configure-mcp-server local --instance acme --client vscode --workspace --token glean_api_xyz

            Remote:

            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/agents --client claude
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/analytics --client cursor
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client goose
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client windsurf
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client vscode --workspace

            # With explicit token (bypasses DCR):
            npx @gleanwork/configure-mcp-server remote --url https://my-be.glean.com/mcp/default --client cursor --token glean_api_xyz

            Init:

            npx @gleanwork/configure-mcp-server init --client cursor
            npx @gleanwork/configure-mcp-server init --client claude-code
            npx @gleanwork/configure-mcp-server init --agents
            npx @gleanwork/configure-mcp-server init --client cursor --agents
            npx @gleanwork/configure-mcp-server init --client cursor --server-name my_glean
            npx @gleanwork/configure-mcp-server init --client claude-code --dryRun

          Run 'npx @gleanwork/configure-mcp-server help' for more details on supported clients

          Version: v9.9.9
        "
      `);
  });

  it('handles invalid commands', async () => {
    const result = await runBin('invalid-command');

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
      "Unknown command: invalid-command
      Run with --help for usage information"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  it('handles invalid clients', async () => {
    const result = await runBin(
      '--client',
      'invalid-client',
      '--instance',
      'my-company',
    );

    expect(result.exitCode).toEqual(1);
    expect(result.stderr).toMatchInlineSnapshot(`
      "Unsupported MCP client: invalid-client
      Supported clients: claude-code, claude-desktop, cursor, goose, vscode, windsurf"
    `);
    expect(result.stdout).toMatchInlineSnapshot(`""`);
  });

  for (const command of ['local', 'remote']) {
    describe(command, () => {
      it('fails when only token provided', async () => {
        const result = await runBin(
          '--client',
          'cursor',
          '--token',
          'test-token',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(1);
        expect(result.stderr).toMatchInlineSnapshot(`
          "
          "Warning: Configuring without complete credentials.
          You must provide either:
            1. Both --token and --instance, or
            2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_INSTANCE

          Continuing with configuration, but you will need to set credentials manually later."

          Error configuring client: Local configuration requires an instance (--instance) or URL. Please provide it via command line options or in your .env file."
        `);
      });

      it('fails when only instance provided', async () => {
        const result = await runBin(
          '--client',
          'cursor',
          '--instance',
          'test-instance',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(1);
        expect(result.stderr).toMatchInlineSnapshot(
          `"Error configuring client: Local configuration requires an API token (--token). Please provide it via command line options or in your .env file."`,
        );
      });

      it('fails when env file has only token', async () => {
        await project.write({
          '.env': 'GLEAN_API_TOKEN=env-token\n',
        });

        const result = await runBin(
          '--client',
          'cursor',
          '--env',
          envFilePath,
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(1);
        expect(result.stderr).toMatchInlineSnapshot(
          `"Error configuring client: Local configuration requires an instance (--instance) or URL. Please provide it via command line options or in your .env file."`,
        );
      });

      it('fails when env file has only instance', async () => {
        await project.write({
          '.env': 'GLEAN_INSTANCE=env-instance\n',
        });

        const result = await runBin(
          '--client',
          'cursor',
          '--env',
          envFilePath,
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(1);
        expect(result.stderr).toMatchInlineSnapshot(
          `"Error configuring client: Local configuration requires an API token (--token). Please provide it via command line options or in your .env file."`,
        );
      });

      it('fails when neither token nor instance provided', async () => {
        const result = await runBin('--client', 'cursor', {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        });

        expect(result.exitCode).toEqual(1);
        expect(result.stderr).toMatchInlineSnapshot(`
          "Error: You must provide either:
            1. Both --token and --instance for local configuration, or
            2. --url for remote configuration, or
            3. --env pointing to a .env file with configuration
          Run with --help for usage information"
        `);
      });
    });
  }

  describe('local', () => {
    it('can configure with custom instance and token', async () => {
      const result = await runBin(
        '--client',
        'cursor',
        '--instance',
        'custom-instance',
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
    });

    describe('Claude Code client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = claudeCodeConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          '--client',
          'claude-code',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Claude Code...
            Created new configuration file at: <TMP_DIR>/.claude.json

            Claude Code MCP configuration has been configured to: <TMP_DIR>/.claude.json

            To use it:
            1. Run \`claude mcp list\` and verify the server is listed
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it("adds config to existing file that doesn't have Glean config", async () => {
        const existingConfig = {
          'some-other-config': {
            options: {
              enabled: true,
            },
          },
          '.mcpServers': {
            'github-remote': {
              url: 'https://api.githubcopilot.com/mcp',
              authorization_token: 'Bearer $MY_TOKEN',
            },
          },
        } as ConfigFileContents;

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'claude-code',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Claude Code...
            Updated configuration file at: <TMP_DIR>/.claude.json

            Claude Code MCP configuration has been configured to: <TMP_DIR>/.claude.json

            To use it:
            1. Run \`claude mcp list\` and verify the server is listed
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "some-other-config": {
              "options": {
                "enabled": true
              }
            },
            ".mcpServers": {
              "github-remote": {
                "url": "https://api.githubcopilot.com/mcp",
                "authorization_token": "Bearer $MY_TOKEN"
              }
            },
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });
    });

    it('uses token auth when both token and instance provided via flags', async () => {
      const result = await runBin(
        '--client',
        'cursor',
        '--token',
        'test-token',
        '--instance',
        'test-instance',
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

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');
      const parsedConfig = JSON.parse(configFileContents);
      expect(parsedConfig).toMatchInlineSnapshot(`
        {
          "mcpServers": {
            "glean_local": {
              "args": [
                "-y",
                "@gleanwork/local-mcp-server",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "test-token",
                "GLEAN_INSTANCE": "test-instance",
              },
              "type": "stdio",
            },
          },
        }
      `);
    });

    it('uses token auth when both token and instance provided via env file', async () => {
      await project.write({
        '.env': 'GLEAN_API_TOKEN=env-token\nGLEAN_INSTANCE=env-instance\n',
      });

      const result = await runBin('--client', 'cursor', '--env', envFilePath, {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
        },
      });

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

      const configFileContents = fs.readFileSync(configFilePath, 'utf8');
      const parsedConfig = JSON.parse(configFileContents);
      expect(parsedConfig).toMatchInlineSnapshot(`
        {
          "mcpServers": {
            "glean_local": {
              "args": [
                "-y",
                "@gleanwork/local-mcp-server",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "env-token",
                "GLEAN_INSTANCE": "env-instance",
              },
              "type": "stdio",
            },
          },
        }
      `);
    });

    it('uses token auth when both token and instance provided via environment variables', async () => {
      const result = await runBin('--client', 'cursor', {
        env: {
          GLEAN_MCP_CONFIG_DIR: project.baseDir,
          GLEAN_API_TOKEN: 'process-env-token',
          GLEAN_INSTANCE: 'process-env-instance',
        },
      });

      expect(result.exitCode).toEqual(0);
      const configFileContents = fs.readFileSync(configFilePath, 'utf8');
      const parsedConfig = JSON.parse(configFileContents);
      expect(parsedConfig).toMatchInlineSnapshot(`
        {
          "mcpServers": {
            "glean_local": {
              "args": [
                "-y",
                "@gleanwork/local-mcp-server",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "process-env-token",
                "GLEAN_INSTANCE": "process-env-instance",
              },
              "type": "stdio",
            },
          },
        }
      `);
    });

    it('prioritizes flags over env file when both provided', async () => {
      await project.write({
        '.env': 'GLEAN_API_TOKEN=env-token\nGLEAN_INSTANCE=env-instance\n',
      });

      const result = await runBin(
        '--client',
        'cursor',
        '--token',
        'flag-token',
        '--instance',
        'flag-instance',
        '--env',
        envFilePath,
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(0);
      const configFileContents = fs.readFileSync(configFilePath, 'utf8');
      const parsedConfig = JSON.parse(configFileContents);
      expect(parsedConfig).toMatchInlineSnapshot(`
        {
          "mcpServers": {
            "glean_local": {
              "args": [
                "-y",
                "@gleanwork/local-mcp-server",
              ],
              "command": "npx",
              "env": {
                "GLEAN_API_TOKEN": "flag-token",
                "GLEAN_INSTANCE": "flag-instance",
              },
              "type": "stdio",
            },
          },
        }
      `);
    });

    it('warns when env file path does not exist', async () => {
      const nonExistentPath = path.join(project.baseDir, 'nonexistent.env');

      const result = await runBin(
        '--client',
        'cursor',
        '--env',
        nonExistentPath,
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(1);
      expect(
        normalizeOutput(result.stderr, project.baseDir),
      ).toMatchInlineSnapshot(
        `
        "Warning: .env file not found at <TMP_DIR>/nonexistent.env
        Error configuring client: Local configuration requires an instance (--instance) or URL. Please provide it via command line options or in your .env file."
      `,
      );
    });

    describe('Cursor client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = cursorConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          '--client',
          'cursor',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
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

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it("adds config to existing file that doesn't have Glean config", async () => {
        const existingConfig = {
          'some-other-config': {
            options: {
              enabled: true,
            },
          },
          mcpServers: {
            'github-remote': {
              url: 'https://api.githubcopilot.com/mcp',
              authorization_token: 'Bearer $MY_TOKEN',
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'cursor',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Cursor...
            Updated configuration file at: <TMP_DIR>/.cursor/mcp.json

            Cursor MCP configuration has been configured to: <TMP_DIR>/.cursor/mcp.json

            To use it:
            1. Restart Cursor
            2. Agent will now have access to Glean tools
            3. You'll be asked for approval when Agent uses these tools
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "some-other-config": {
              "options": {
                "enabled": true
              }
            },
            "mcpServers": {
              "github-remote": {
                "url": "https://api.githubcopilot.com/mcp",
                "authorization_token": "Bearer $MY_TOKEN"
              },
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('preserves existing custom-named MCP servers when adding Glean config', async () => {
        const existingConfig = {
          mcpServers: {
            'github-copilot': {
              command: 'github-copilot-cli',
              args: ['--mcp'],
              env: {
                GITHUB_TOKEN: 'gho_xxxxx',
              },
            },
            glean_analytics: {
              command: 'npx',
              args: ['@gleanwork/local-mcp-server'],
              env: {
                GLEAN_INSTANCE: 'old-instance',
              },
            },
          },
          'other-settings': {
            theme: 'dark',
            fontSize: 14,
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'local',
          '--client',
          'cursor',
          '--token',
          'new-token',
          '--instance',
          'new-instance',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              _SKIP_INSTANCE_PREFLIGHT: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "github-copilot": {
                "command": "github-copilot-cli",
                "args": [
                  "--mcp"
                ],
                "env": {
                  "GITHUB_TOKEN": "gho_xxxxx"
                }
              },
              "glean_analytics": {
                "command": "npx",
                "args": [
                  "@gleanwork/local-mcp-server"
                ],
                "env": {
                  "GLEAN_INSTANCE": "old-instance"
                }
              },
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "new-instance",
                  "GLEAN_API_TOKEN": "new-token"
                }
              }
            },
            "other-settings": {
              "theme": "dark",
              "fontSize": 14
            }
          }"
        `);
      });
    });

    describe('Claude client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = claudeConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);

        if (configDir) {
          fs.mkdirSync(configPath, { recursive: true });
        }
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          '--client',
          'claude',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Claude for Desktop...
            Created new configuration file at: <CLAUDE_CONFIG_DIR>/claude_desktop_config.json

            Claude for Desktop MCP configuration has been configured to: <CLAUDE_CONFIG_DIR>/claude_desktop_config.json

            To use it:
            1. Restart Claude Desktop
            2. MCP tools will be available in your conversations
            3. The model will have access to Glean search and other configured tools
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it("adds config to existing file that doesn't have Glean config", async () => {
        const existingConfig = {
          'some-other-config': {
            options: {
              enabled: true,
            },
          },
          mcpServers: {
            'github-remote': {
              url: 'https://api.githubcopilot.com/mcp',
              authorization_token: 'Bearer $MY_TOKEN',
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'claude',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Claude for Desktop...
            Updated configuration file at: <CLAUDE_CONFIG_DIR>/claude_desktop_config.json

            Claude for Desktop MCP configuration has been configured to: <CLAUDE_CONFIG_DIR>/claude_desktop_config.json

            To use it:
            1. Restart Claude Desktop
            2. MCP tools will be available in your conversations
            3. The model will have access to Glean search and other configured tools
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "some-other-config": {
              "options": {
                "enabled": true
              }
            },
            "mcpServers": {
              "github-remote": {
                "url": "https://api.githubcopilot.com/mcp",
                "authorization_token": "Bearer $MY_TOKEN"
              },
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('preserves existing custom-named MCP servers when adding Glean config', async () => {
        const existingConfig = {
          mcpServers: {
            'anthropic-tools': {
              command: 'anthropic-mcp',
              args: ['--mode', 'tools'],
            },
            glean_old: {
              command: 'old-command',
              args: ['old'],
            },
          },
          'claude-settings': {
            model: 'claude-3-opus',
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'remote',
          '--url',
          'https://my-be.glean.com/mcp/default',
          '--client',
          'claude',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              GLEAN_BETA_ENABLED: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "anthropic-tools": {
                "command": "anthropic-mcp",
                "args": [
                  "--mode",
                  "tools"
                ]
              },
              "glean_old": {
                "command": "old-command",
                "args": [
                  "old"
                ]
              },
              "glean_default": {
                "type": "stdio",
                "command": "npx",
                "args": [
                  "-y",
                  "mcp-remote@0.1.29",
                  "https://my-be.glean.com/mcp/default"
                ]
              }
            },
            "claude-settings": {
              "model": "claude-3-opus"
            }
          }"
        `);
      });
    });

    describe('Claude Code client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = claudeCodeConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          'local',
          '--client',
          'claude-code',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Claude Code...
            Created new configuration file at: <TMP_DIR>/.claude.json

            Claude Code MCP configuration has been configured to: <TMP_DIR>/.claude.json

            To use it:
            1. Run \`claude mcp list\` and verify the server is listed
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it("adds config to existing file that doesn't have Glean config", async () => {
        const existingConfig = {
          tools: [
            {
              name: 'some-other-tool',
              description: 'Another tool',
            },
          ],
        } as ConfigFileContents;

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'local',
          '--client',
          'claude-code',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Claude Code...
            Updated configuration file at: <TMP_DIR>/.claude.json

            Claude Code MCP configuration has been configured to: <TMP_DIR>/.claude.json

            To use it:
            1. Run \`claude mcp list\` and verify the server is listed
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "tools": [
              {
                "name": "some-other-tool",
                "description": "Another tool"
              }
            ],
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('preserves existing custom-named MCP servers when adding Glean config', async () => {
        const existingConfig = {
          tools: [
            {
              name: 'existing-tool',
              description: 'An existing tool',
            },
          ],
          mcpServers: {
            'my-custom-server': {
              command: 'custom-server',
              args: ['--start'],
            },
            glean_previous: {
              command: 'npx',
              args: ['old-glean'],
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'local',
          '--client',
          'claude-code',
          '--token',
          'test-token',
          '--instance',
          'test-instance',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              _SKIP_INSTANCE_PREFLIGHT: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "tools": [
              {
                "name": "existing-tool",
                "description": "An existing tool"
              }
            ],
            "mcpServers": {
              "my-custom-server": {
                "command": "custom-server",
                "args": [
                  "--start"
                ]
              },
              "glean_previous": {
                "command": "npx",
                "args": [
                  "old-glean"
                ]
              },
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "test-instance",
                  "GLEAN_API_TOKEN": "test-token"
                }
              }
            }
          }"
        `);
      });
    });

    describe('Windsurf client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = windsurfConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          '--client',
          'windsurf',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Windsurf...
            Created new configuration file at: <TMP_DIR>/.codeium/windsurf/mcp_config.json

            Windsurf MCP configuration has been configured to: <TMP_DIR>/.codeium/windsurf/mcp_config.json

            To use it:
            1. Open Windsurf Settings > Advanced Settings
            2. Scroll to the Cascade section
            3. Press the refresh button after configuration
            4. You should now see Glean in your available MCP servers
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it("adds config to existing file that doesn't have Glean config", async () => {
        const existingConfig = {
          'some-other-config': {
            options: {
              enabled: true,
            },
          },
          mcpServers: {
            'github-remote': {
              url: 'https://api.githubcopilot.com/mcp',
              authorization_token: 'Bearer $MY_TOKEN',
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'windsurf',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Windsurf...
            Updated configuration file at: <TMP_DIR>/.codeium/windsurf/mcp_config.json

            Windsurf MCP configuration has been configured to: <TMP_DIR>/.codeium/windsurf/mcp_config.json

            To use it:
            1. Open Windsurf Settings > Advanced Settings
            2. Scroll to the Cascade section
            3. Press the refresh button after configuration
            4. You should now see Glean in your available MCP servers
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);
        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "some-other-config": {
              "options": {
                "enabled": true
              }
            },
            "mcpServers": {
              "github-remote": {
                "url": "https://api.githubcopilot.com/mcp",
                "authorization_token": "Bearer $MY_TOKEN"
              },
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "env": {
                  "GLEAN_INSTANCE": "test-domain",
                  "GLEAN_API_TOKEN": "glean_api_test"
                }
              }
            }
          }"
        `);
      });

      it('preserves existing custom-named MCP servers when adding Glean config', async () => {
        const existingConfig = {
          mcpServers: {
            'windsurf-tools': {
              command: 'windsurf-mcp',
              args: ['--enable'],
            },
            glean_analytics: {
              type: 'http',
              url: 'https://old.glean.com/mcp',
            },
          },
          'windsurf-config': {
            theme: 'ocean',
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'remote',
          '--url',
          'https://new-be.glean.com/mcp/default',
          '--client',
          'windsurf',
          '--token',
          'auth-token',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              GLEAN_BETA_ENABLED: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "mcpServers": {
              "windsurf-tools": {
                "command": "windsurf-mcp",
                "args": [
                  "--enable"
                ]
              },
              "glean_analytics": {
                "type": "http",
                "url": "https://old.glean.com/mcp"
              },
              "glean_default": {
                "command": "npx",
                "args": [
                  "-y",
                  "mcp-remote@0.1.29",
                  "https://new-be.glean.com/mcp/default",
                  "--header",
                  "Authorization: Bearer auth-token"
                ]
              }
            },
            "windsurf-config": {
              "theme": "ocean"
            }
          }"
        `);
      });
    });

    describe('Goose client', () => {
      let configPath: string;
      let configFilePath: string;

      const { configDir, configFileName } = gooseConfigPath;

      beforeEach(() => {
        configPath = path.join(project.baseDir, configDir);
        configFilePath = path.join(configPath, configFileName);
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          '--client',
          'goose',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              _SKIP_INSTANCE_PREFLIGHT: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Goose...
            Created new configuration file at: <TMP_DIR>/.config/goose/config.yaml

            Goose MCP configuration has been configured to: <TMP_DIR>/.config/goose/config.yaml

            To use it:
            1. Restart Goose
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        // Verify it's valid YAML
        expect(() => yaml.parse(configFileContents)).not.toThrow();

        // Snapshot the actual YAML content
        expect(configFileContents).toMatchInlineSnapshot(`
          "extensions:
            glean_local:
              type: stdio
              command: npx
              args:
                - -y
                - "@gleanwork/local-mcp-server"
              env:
                GLEAN_INSTANCE: test-domain
                GLEAN_API_TOKEN: glean_api_test
          "
        `);
      });

      it("adds config to existing file that doesn't have Glean config", async () => {
        const existingConfig = {
          'some-other-config': {
            options: {
              enabled: true,
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'goose',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              _SKIP_INSTANCE_PREFLIGHT: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Goose...
            Updated configuration file at: <TMP_DIR>/.config/goose/config.yaml

            Goose MCP configuration has been configured to: <TMP_DIR>/.config/goose/config.yaml

            To use it:
            1. Restart Goose
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        // Verify it's valid YAML
        expect(() => yaml.parse(configFileContents)).not.toThrow();

        // Snapshot the actual YAML content
        expect(configFileContents).toMatchInlineSnapshot(`
          "some-other-config:
            options:
              enabled: true
          extensions:
            glean_local:
              type: stdio
              command: npx
              args:
                - -y
                - "@gleanwork/local-mcp-server"
              env:
                GLEAN_INSTANCE: test-domain
                GLEAN_API_TOKEN: glean_api_test
          "
        `);
      });

      it('configures remote server with HTTP transport', async () => {
        const result = await runBin(
          'remote',
          '--url',
          'https://my-be.glean.com/mcp/analytics',
          '--client',
          'goose',
          '--token',
          'test-token',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              GLEAN_BETA_ENABLED: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        expect(normalizeOutput(result.stdout, project.baseDir))
          .toMatchInlineSnapshot(`
            "Configuring Glean MCP for Goose...
            Created new configuration file at: <TMP_DIR>/.config/goose/config.yaml

            Goose MCP configuration has been configured to: <TMP_DIR>/.config/goose/config.yaml

            To use it:
            1. Restart Goose
            "
          `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        // Verify it's valid YAML
        expect(() => yaml.parse(configFileContents)).not.toThrow();

        // Snapshot the actual YAML content
        expect(configFileContents).toMatchInlineSnapshot(`
          "extensions:
            glean_analytics:
              type: http
              env: {}
              url: https://my-be.glean.com/mcp/analytics
              headers:
                Authorization: Bearer test-token
          "
        `);
      });

      it('uses "glean_default" as server name when URL contains /mcp/default for remote', async () => {
        const result = await runBin(
          'remote',
          '--url',
          'https://my-be.glean.com/mcp/default',
          '--client',
          'goose',
          '--token',
          'test-token',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              GLEAN_BETA_ENABLED: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        // Verify it's valid YAML
        expect(() => yaml.parse(configFileContents)).not.toThrow();

        // Snapshot the actual YAML content to show glean_default naming
        expect(configFileContents).toMatchInlineSnapshot(`
          "extensions:
            glean_default:
              type: http
              env: {}
              url: https://my-be.glean.com/mcp/default
              headers:
                Authorization: Bearer test-token
          "
        `);
      });

      it('preserves existing custom-named MCP servers when adding Glean config', async () => {
        const existingConfig = {
          GOOSE_PROVIDER: 'ollama',
          provider: 'ollama',
          GOOSE_MODE: 'approve',
          GOOSE_MODEL: 'gpt-o5s:20b',
          extensions: {
            'custom-mcp': {
              enabled: true,
              type: 'streamable_http',
              name: 'custom-mcp',
              uri: 'https://example.com/mcp',
              envs: {},
              env_keys: [],
              headers: {},
              description: 'Custom MCP server',
              timeout: 300,
              bundled: null,
              available_tools: [],
            },
            glean_existing: {
              type: 'stdio',
              command: 'old-command',
              args: ['old-arg'],
            },
          },
          ollama: {
            host: 'http://localhost:11434',
            model: 'llama3.1:8b',
          },
          OLLAMA_HOST: 'localhost',
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'remote',
          '--url',
          'https://my-be.glean.com/mcp/default',
          '--client',
          'goose',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              GLEAN_BETA_ENABLED: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(configFileContents).toMatchInlineSnapshot(`
          "GOOSE_PROVIDER: ollama
          provider: ollama
          GOOSE_MODE: approve
          GOOSE_MODEL: gpt-o5s:20b
          extensions:
            custom-mcp:
              enabled: true
              type: streamable_http
              name: custom-mcp
              uri: https://example.com/mcp
              envs: {}
              env_keys: []
              headers: {}
              description: Custom MCP server
              timeout: 300
              bundled: null
              available_tools: []
            glean_existing:
              type: stdio
              command: old-command
              args:
                - old-arg
            glean_default:
              type: http
              env: {}
              url: https://my-be.glean.com/mcp/default
              headers: {}
          ollama:
            host: http://localhost:11434
            model: llama3.1:8b
          OLLAMA_HOST: localhost
          "
        `);
      });
    });

    describe('VS Code client', () => {
      let configFilePath: string;

      beforeEach(() => {
        const platform = process.platform;

        if (platform === 'win32') {
          configFilePath = path.join(
            project.baseDir,
            'Code',
            'User',
            'mcp.json',
          );
        } else if (platform === 'darwin') {
          configFilePath = path.join(
            project.baseDir,
            'Library',
            'Application Support',
            'Code',
            'User',
            'mcp.json',
          );
        } else {
          configFilePath = path.join(
            project.baseDir,
            '.config',
            'Code',
            'User',
            'mcp.json',
          );
        }

        fs.mkdirSync(path.dirname(configFilePath), { recursive: true });
      });

      it('creates a new config file when none exists', async () => {
        const result = await runBin(
          '--client',
          'vscode',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        const normalized = normalizeOutput(result.stdout, project.baseDir);

        expect(normalized).toMatchInlineSnapshot(`
                "Configuring Glean MCP for Visual Studio Code...
                Created new configuration file at: <VS_CODE_CONFIG_DIR>/mcp.json

                To use it:
                1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
                2. Restart VS Code
                3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
                4. Click the "Tools" button to see and use Glean tools in Agent mode
                5. You'll be asked for approval when Agent uses these tools
                "
              `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(fs.existsSync(configFilePath)).toBe(true);

        const parsedContents = JSON.parse(configFileContents);
        expect(parsedContents).toMatchInlineSnapshot(`
          {
            "servers": {
              "glean_local": {
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                  "GLEAN_INSTANCE": "test-domain",
                },
                "type": "stdio",
              },
            },
          }
        `);
      });

      it("adds config to existing file that doesn't have Glean config", async () => {
        const existingConfig = {
          'editor.fontSize': 14,
          'workbench.colorTheme': 'Default Dark+',
          mcp: {
            servers: {
              'github-remote': {
                url: 'https://api.githubcopilot.com/mcp',
                authorization_token: 'Bearer $MY_TOKEN',
              },
            },
          },
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          '--client',
          'vscode',
          '--token',
          'glean_api_test',
          '--instance',
          'test-domain',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
            },
          },
        );

        expect(result.exitCode).toEqual(0);
        const normalized = normalizeOutput(result.stdout, project.baseDir);

        expect(normalized).toMatchInlineSnapshot(`
          "Configuring Glean MCP for Visual Studio Code...
          Updated configuration file at: <VS_CODE_CONFIG_DIR>/mcp.json

          To use it:
          1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
          2. Restart VS Code
          3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
          4. Click the "Tools" button to see and use Glean tools in Agent mode
          5. You'll be asked for approval when Agent uses these tools
          "
        `);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');
        const parsedConfig = JSON.parse(configFileContents);

        expect(parsedConfig).toMatchInlineSnapshot(`
          {
            "editor.fontSize": 14,
            "servers": {
              "github-remote": {
                "authorization_token": "Bearer $MY_TOKEN",
                "url": "https://api.githubcopilot.com/mcp",
              },
              "glean_local": {
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server",
                ],
                "command": "npx",
                "env": {
                  "GLEAN_API_TOKEN": "glean_api_test",
                  "GLEAN_INSTANCE": "test-domain",
                },
                "type": "stdio",
              },
            },
            "workbench.colorTheme": "Default Dark+",
          }
        `);
      });

      it('preserves existing custom-named MCP servers when adding Glean config', async () => {
        const existingConfig = {
          'editor.fontSize': 14,
          'workbench.colorTheme': 'Default Dark+',
          servers: {
            'vscode-extension-mcp': {
              command: 'vscode-ext',
              args: ['--mcp-mode'],
            },
            glean_previous: {
              type: 'http',
              url: 'https://old.glean.com/mcp',
            },
          },
          'terminal.integrated.shell.windows': 'C:\\Windows\\System32\\cmd.exe',
        };

        createConfigFile(configFilePath, existingConfig);

        const result = await runBin(
          'local',
          '--client',
          'vscode',
          '--token',
          'new-token',
          '--instance',
          'new-instance',
          {
            env: {
              GLEAN_MCP_CONFIG_DIR: project.baseDir,
              HOME: project.baseDir,
              USERPROFILE: project.baseDir,
              APPDATA: project.baseDir,
              _SKIP_INSTANCE_PREFLIGHT: 'true',
            },
          },
        );

        expect(result.exitCode).toEqual(0);

        const configFileContents = fs.readFileSync(configFilePath, 'utf8');

        expect(configFileContents).toMatchInlineSnapshot(`
          "{
            "editor.fontSize": 14,
            "workbench.colorTheme": "Default Dark+",
            "servers": {
              "vscode-extension-mcp": {
                "command": "vscode-ext",
                "args": [
                  "--mcp-mode"
                ]
              },
              "glean_previous": {
                "type": "http",
                "url": "https://old.glean.com/mcp"
              },
              "glean_local": {
                "command": "npx",
                "args": [
                  "-y",
                  "@gleanwork/local-mcp-server"
                ],
                "type": "stdio",
                "env": {
                  "GLEAN_INSTANCE": "new-instance",
                  "GLEAN_API_TOKEN": "new-token"
                }
              }
            },
            "terminal.integrated.shell.windows": "C:\\\\Windows\\\\System32\\\\cmd.exe"
          }"
        `);
      });
    });
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
        '--instance',
        'test-domain',
        {
          env: {
            GLEAN_MCP_CONFIG_DIR: project.baseDir,
          },
        },
      );

      expect(result.exitCode).toEqual(1);
      expect(result.stderr).toContain(
        'Remote configurations require a full URL (--url)',
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

    it('warns when --agents is used with --url', async () => {
      const result = await runBin(
        'remote',
        '--url',
        'https://my-be.glean.com/mcp/custom-agent',
        '--agents',
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

      expect(normalizeOutput(result.stderr, project.baseDir)).toContain(
        'Note: --agents flag is ignored when using --url',
      );

      const configFileContents = fs.readFileSync(
        path.join(project.baseDir, '.cursor', 'mcp.json'),
        'utf8',
      );
      const config = JSON.parse(configFileContents);

      expect(Object.keys(config.mcpServers)[0]).toBe('glean_agents');
    });

    it('warns when both --url and --instance are provided and ignores instance', async () => {
      const result = await runBin(
        'remote',
        '--url',
        'https://my-be.glean.com/mcp/analytics',
        '--instance',
        'test-instance',
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

      const output = normalizeOutput(
        result.stdout + result.stderr,
        project.baseDir,
      );
      expect(output).toContain(
        'Warning: Both --instance and --url were provided. The --instance flag will be ignored when --url is specified.',
      );

      const configPath = path.join(project.baseDir, '.cursor', 'mcp.json');
      const configFileContents = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configFileContents);
      expect(Object.keys(config.mcpServers)[0]).toBe('glean_analytics');

      expect(config.mcpServers.glean_analytics.type).toBe('http');
      expect(config.mcpServers.glean_analytics.url).toBe(
        'https://my-be.glean.com/mcp/analytics',
      );
    });
  });

  describe('init', () => {
    it('shows help output when --help is provided', async () => {
      const result = await runBin('init', '--help');

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
        "
            Usage
              Configure Glean MCP project-level tools for enhanced development experience.

              $ npx @gleanwork/configure-mcp-server init [--client <client-name>] [--agents] [options]

            Commands
              init        Initialize Glean MCP project tools

            Options for init
              --client, -c      MCP client to create project files for (cursor, claude-code)
              --agents          Create AGENTS.md file with Glean MCP instructions
              --server-name     Server name to use in templates (default: glean_default)
              --dryRun          Show what files would be created without creating them
              --help, -h        Show this help message

            Examples

              Initialize Cursor rules:
              npx @gleanwork/configure-mcp-server init --client cursor

              Initialize Claude Code agent:
              npx @gleanwork/configure-mcp-server init --client claude-code

              Create only AGENTS.md:
              npx @gleanwork/configure-mcp-server init --agents

              Create both Cursor files and AGENTS.md:
              npx @gleanwork/configure-mcp-server init --client cursor --agents

              Use custom server name:
              npx @gleanwork/configure-mcp-server init --client cursor --server-name my_glean

              Preview what would be created for Claude Code:
              npx @gleanwork/configure-mcp-server init --client claude-code --dryRun

            Project Files Created

              For Cursor:
                .cursor/rules/glean-mcp.mdc              Glean MCP usage rule

              For Claude Code:
                .claude/agents/glean-expert.md           Glean research agent

              For --agents:
                AGENTS.md                                Standard agent instructions file

            Note: This command creates project-level files in the current directory.
                  Make sure to run 'configure-mcp-server remote' first to set up
                  your MCP server connection at the host level.

            Version: v9.9.9

        "
      `);
    });

    it('shows help output when -h is provided', async () => {
      const result = await runBin('init', '-h');

      expect(result.exitCode).toEqual(0);
      expect(result.stderr).toMatchInlineSnapshot(`""`);
      expect(normalizeOutput(result.stdout, project.baseDir))
        .toMatchInlineSnapshot(`
        "
            Usage
              Configure Glean MCP project-level tools for enhanced development experience.

              $ npx @gleanwork/configure-mcp-server init [--client <client-name>] [--agents] [options]

            Commands
              init        Initialize Glean MCP project tools

            Options for init
              --client, -c      MCP client to create project files for (cursor, claude-code)
              --agents          Create AGENTS.md file with Glean MCP instructions
              --server-name     Server name to use in templates (default: glean_default)
              --dryRun          Show what files would be created without creating them
              --help, -h        Show this help message

            Examples

              Initialize Cursor rules:
              npx @gleanwork/configure-mcp-server init --client cursor

              Initialize Claude Code agent:
              npx @gleanwork/configure-mcp-server init --client claude-code

              Create only AGENTS.md:
              npx @gleanwork/configure-mcp-server init --agents

              Create both Cursor files and AGENTS.md:
              npx @gleanwork/configure-mcp-server init --client cursor --agents

              Use custom server name:
              npx @gleanwork/configure-mcp-server init --client cursor --server-name my_glean

              Preview what would be created for Claude Code:
              npx @gleanwork/configure-mcp-server init --client claude-code --dryRun

            Project Files Created

              For Cursor:
                .cursor/rules/glean-mcp.mdc              Glean MCP usage rule

              For Claude Code:
                .claude/agents/glean-expert.md           Glean research agent

              For --agents:
                AGENTS.md                                Standard agent instructions file

            Note: This command creates project-level files in the current directory.
                  Make sure to run 'configure-mcp-server remote' first to set up
                  your MCP server connection at the host level.

            Version: v9.9.9

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
