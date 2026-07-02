import { describe, it, expect } from 'vitest';
import piClient from '../../configure/client/pi.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';
import path from 'path';

describe('Pi MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(piClient.displayName).toBe('Pi');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(homedir, '.config', 'mcp', 'mcp.json');
    } else {
      expectedPath = path.join(homedir, '.config', 'mcp', 'mcp.json');
    }

    expect(piClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Pi remote config template with URL (native HTTP)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = piClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_default": {
            "auth": "bearer",
            "headers": {
              "Authorization": "Bearer test-token",
            },
            "url": "https://example-instance-be.glean.com/mcp/default",
          },
        },
      }
    `);
  });

  it('should generate OAuth config when no token is provided', () => {
    const options: ConfigureOptions = { remote: true };
    const config = piClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      undefined,
      options,
    );

    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_default": {
            "auth": "oauth",
            "url": "https://example-instance-be.glean.com/mcp/default",
          },
        },
      }
    `);
  });

  it('should include success message with instructions', () => {
    const configPath = '/path/to/config';
    const message = piClient.successMessage(configPath);

    expect(message).toContain('Pi MCP configuration has been configured');
    expect(message).toContain(configPath);
    expect(message).toContain('Restart Pi');
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

    const updated = piClient.updateConfig(existingConfig, newConfig, {});

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
