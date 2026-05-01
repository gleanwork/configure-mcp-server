import { describe, it, expect } from 'vitest';
import junieClient from '../../configure/client/junie.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';
import path from 'path';

describe('Junie MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(junieClient.displayName).toBe('Junie (JetBrains)');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(homedir, '.junie', 'mcp', 'mcp.json');
    } else {
      // darwin and linux both use $HOME/.junie/mcp/mcp.json
      expectedPath = path.join(homedir, '.junie', 'mcp', 'mcp.json');
    }

    expect(junieClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Junie remote config template with URL', () => {
    const options: ConfigureOptions = { remote: true };
    const config = junieClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_default": {
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
    const message = junieClient.successMessage(configPath);

    expect(message).toContain('Junie (JetBrains) MCP configuration');
    expect(message).toContain(configPath);
    expect(message).toContain('Restart Junie');
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

    const updated = junieClient.updateConfig(existingConfig, newConfig, {});

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
