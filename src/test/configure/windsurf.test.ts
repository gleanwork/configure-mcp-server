import { describe, it, expect } from 'vitest';
import windsurfClient from '../../configure/client/windsurf.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';
import path from 'path';

describe('Windsurf MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(windsurfClient.displayName).toBe('Windsurf');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(homedir, '.codeium', 'windsurf', 'mcp_config.json');
    } else {
      // darwin and linux both use $HOME/.codeium/windsurf/mcp_config.json
      expectedPath = path.join(homedir, '.codeium', 'windsurf', 'mcp_config.json');
    }

    expect(windsurfClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Windsurf MCP config template with instance', () => {
    const config = windsurfClient.configTemplate(
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
          },
        },
      }
    `);
  });

  it('should generate a valid Windsurf remote config template with URL (native HTTP)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = windsurfClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    // Windsurf supports native HTTP transport with headers
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_default": {
            "headers": {
              "Authorization": "Bearer test-token",
            },
            "serverUrl": "https://example-instance-be.glean.com/mcp/default",
          },
        },
      }
    `);
  });

  it('should include success message with instructions', () => {
    const configPath = '/path/to/config';
    const message = windsurfClient.successMessage(configPath);

    expect(message).toContain(
      'Windsurf MCP configuration has been configured',
    );
    expect(message).toContain(configPath);
    expect(message).toContain('Windsurf Settings');
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

    const updated = windsurfClient.updateConfig(existingConfig, newConfig, {});

    expect(updated).toMatchObject({
      mcpServers: {
        other: {},
        glean: (newConfig as any).mcpServers.glean,
      },
    });
  });
});
