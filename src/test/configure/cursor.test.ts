import { describe, it, expect } from 'vitest';
import cursorClient from '../../configure/client/cursor.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';
import path from 'path';

describe('Cursor MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(cursorClient.displayName).toBe('Cursor');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(homedir, '.cursor', 'mcp.json');
    } else {
      // darwin and linux both use $HOME/.cursor/mcp.json
      expectedPath = path.join(homedir, '.cursor', 'mcp.json');
    }

    expect(cursorClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Cursor MCP config template with instance', () => {
    const config = cursorClient.configTemplate('example-instance', 'test-token');

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

  it('should generate a valid Cursor remote config template with URL (native HTTP)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = cursorClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    // Cursor supports native HTTP transport
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_default": {
            "headers": {
              "Authorization": "Bearer test-token",
            },
            "type": "http",
            "url": "https://example-instance-be.glean.com/mcp/default",
          },
        },
      }
    `);
  });

  it('should include success message with instructions', () => {
    const configPath = '/path/to/config';
    const message = cursorClient.successMessage(configPath);

    expect(message).toContain('Cursor MCP configuration has been configured');
    expect(message).toContain(configPath);
    expect(message).toContain('Restart Cursor');
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

    const updated = cursorClient.updateConfig(existingConfig, newConfig, {});

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
