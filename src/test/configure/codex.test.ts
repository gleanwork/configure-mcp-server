import { describe, it, expect } from 'vitest';
import codexClient from '../../configure/client/codex.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';
import path from 'path';

describe('Codex MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(codexClient.displayName).toBe('Codex');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(homedir, '.codex', 'config.toml');
    } else {
      // darwin and linux both use $HOME/.codex/config.toml
      expectedPath = path.join(homedir, '.codex', 'config.toml');
    }

    expect(codexClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Codex MCP config template with instance', () => {
    const config = codexClient.configTemplate('example-instance', 'test-token');

    expect(config).toMatchInlineSnapshot(`
      {
        "mcp_servers": {
          "glean_local": {
            "args": [
              "-y",
              "@gleanwork/local-mcp-server",
            ],
            "command": "npx",
            "env": {
              "GLEAN_API_TOKEN": "test-token",
              "GLEAN_INSTANCE": "example-instance",
            },
            "headers": undefined,
            "url": undefined,
          },
        },
      }
    `);
  });

  it('should generate a valid Codex remote config template with URL (native HTTP)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = codexClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    // Codex supports native HTTP transport
    expect(config).toMatchInlineSnapshot(`
      {
        "mcp_servers": {
          "glean_default": {
            "args": undefined,
            "command": undefined,
            "env": undefined,
            "headers": {
              "Authorization": "Bearer test-token",
            },
            "url": "https://example-instance-be.glean.com/mcp/default",
          },
        },
      }
    `);
  });

  it('should include success message with instructions', () => {
    const configPath = '/path/to/config';
    const message = codexClient.successMessage(configPath);

    expect(message).toContain('Codex MCP configuration has been configured');
    expect(message).toContain(configPath);
    expect(message).toContain('Restart Codex');
  });

  it('should update config correctly', () => {
    const existingConfig = { mcp_servers: { other: {} } };
    const newConfig: MCPConfig = {
      mcp_servers: {
        glean: {
          command: 'npx',
          args: ['-y', '@gleanwork/local-mcp-server'],
          env: {},
        },
      },
    };

    const updated = codexClient.updateConfig(existingConfig, newConfig, {});

    expect(updated).toMatchObject({
      mcp_servers: {
        other: {},
        glean: (newConfig as any).mcp_servers.glean,
      },
    });
  });
});
