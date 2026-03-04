import { describe, it, expect } from 'vitest';
import claudeDesktopClient from '../../configure/client/claude-desktop.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';
import path from 'path';

describe('Claude Desktop MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(claudeDesktopClient.displayName).toBe('Claude for Desktop');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(
        process.env.APPDATA || '',
        'Claude',
        'claude_desktop_config.json',
      );
    } else if (platform === 'darwin') {
      expectedPath = path.join(
        homedir,
        'Library',
        'Application Support',
        'Claude',
        'claude_desktop_config.json',
      );
    } else {
      expectedPath = path.join(
        homedir,
        '.config',
        'Claude',
        'claude_desktop_config.json',
      );
    }

    expect(claudeDesktopClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Claude Desktop MCP config template with instance', () => {
    const config = claudeDesktopClient.configTemplate(
      'example-instance',
      'test-token',
    );

    expect(config).toMatchInlineSnapshot(`
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
              "GLEAN_INSTANCE": "example-instance",
            },
            "type": "stdio",
          },
        },
      }
    `);
  });

  it('should generate a valid Claude Desktop remote config template with URL (native HTTP)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = claudeDesktopClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    // Claude Desktop supports native HTTP transport
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_default": {
            "args": [
              "-y",
              "mcp-remote@0.1.37",
              "https://example-instance-be.glean.com/mcp/default",
              "--header",
              "Authorization: Bearer test-token",
            ],
            "command": "npx",
            "type": "stdio",
          },
        },
      }
    `);
  });

  it('should include success message with instructions', () => {
    const configPath = '/path/to/config';
    const message = claudeDesktopClient.successMessage(configPath);

    expect(message).toContain(
      'Claude for Desktop MCP configuration has been configured',
    );
    expect(message).toContain(configPath);
    expect(message).toContain('Restart Claude Desktop');
  });

  it('should update config correctly', () => {
    const existingConfig = { mcpServers: { other: {} } };
    const newConfig: MCPConfig = {
      mcpServers: {
        glean: {
          command: 'npx',
          args: ['-y', '@gleanwork/local-mcp-server'],
          env: {},
        },
      },
    };

    const updated = claudeDesktopClient.updateConfig(
      existingConfig,
      newConfig,
      {},
    );

    expect(updated).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean": {
            "args": [
              "-y",
              "@gleanwork/local-mcp-server",
            ],
            "command": "npx",
            "env": {},
          },
          "other": {},
        },
      }
    `);
  });
});
