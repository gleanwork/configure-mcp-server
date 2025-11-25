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
      expectedPath = path.join(homedir, '.junie', 'mcp.json');
    } else {
      // darwin and linux both use $HOME/.junie/mcp.json
      expectedPath = path.join(homedir, '.junie', 'mcp.json');
    }

    expect(junieClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Junie MCP config template with instance', () => {
    const config = junieClient.configTemplate('example-instance', 'test-token');

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

  it('should generate a valid Junie remote config template with URL (uses mcp-remote)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = junieClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    // Junie only supports stdio, so remote uses mcp-remote proxy
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_default": {
            "args": [
              "-y",
              "mcp-remote@0.1.29",
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

    expect(updated).toMatchObject({
      mcpServers: {
        other: {},
        glean: newConfig.mcpServers.glean,
      },
    });
  });
});
