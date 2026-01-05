import { describe, it, expect } from 'vitest';
import jetbrainsClient from '../../configure/client/jetbrains.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';

describe('JetBrains MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(jetbrainsClient.displayName).toBe('JetBrains AI Assistant');
  });

  it('should throw error when trying to get config path (not file-configurable)', () => {
    // JetBrains AI Assistant doesn't support file-based configuration
    // Configuration must be done via IDE UI
    expect(() => jetbrainsClient.configFilePath(homedir)).toThrow(
      'Unsupported platform',
    );
  });

  it('should generate a valid JetBrains MCP config template with instance', () => {
    const config = jetbrainsClient.configTemplate(
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

  it('should generate a valid JetBrains remote config template with URL (uses mcp-remote)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = jetbrainsClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    // JetBrains only supports stdio, so remote uses mcp-remote proxy
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
    const message = jetbrainsClient.successMessage(configPath);

    expect(message).toContain('JetBrains AI Assistant MCP configuration');
    expect(message).toContain(configPath);
    expect(message).toContain('Restart your JetBrains IDE');
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

    const updated = jetbrainsClient.updateConfig(existingConfig, newConfig, {});

    expect(updated).toMatchObject({
      mcpServers: {
        other: {},
        glean: newConfig.mcpServers.glean,
      },
    });
  });
});
