import { describe, it, expect } from 'vitest';
import gooseClient from '../../configure/client/goose.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';
import path from 'path';

describe('Goose MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(gooseClient.displayName).toBe('Goose');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(
        process.env.APPDATA || '',
        'goose',
        'config.yaml',
      );
    } else {
      // darwin and linux both use $HOME/.config/goose/config.yaml
      expectedPath = path.join(
        homedir,
        '.config',
        'goose',
        'config.yaml',
      );
    }

    expect(gooseClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Goose MCP config template with instance', () => {
    const config = gooseClient.configTemplate('example-instance', 'test-token');

    expect(config).toMatchInlineSnapshot(`
      {
        "extensions": {
          "glean_local": {
            "args": [
              "-y",
              "@gleanwork/local-mcp-server",
            ],
            "bundled": null,
            "cmd": "npx",
            "description": null,
            "enabled": true,
            "env_keys": [],
            "envs": {
              "GLEAN_API_TOKEN": "test-token",
              "GLEAN_INSTANCE": "example-instance",
            },
            "name": "glean_local",
            "timeout": 300,
            "type": "stdio",
          },
        },
      }
    `);
  });

  it('should generate a valid Goose remote config template with URL (native HTTP)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = gooseClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    // Goose supports native HTTP transport
    expect(config).toMatchInlineSnapshot(`
      {
        "extensions": {
          "glean_default": {
            "available_tools": [],
            "bundled": null,
            "description": "",
            "enabled": true,
            "env_keys": [],
            "envs": {},
            "headers": {
              "Authorization": "Bearer test-token",
            },
            "name": "glean_default",
            "timeout": 300,
            "type": "streamable_http",
            "uri": "https://example-instance-be.glean.com/mcp/default",
          },
        },
      }
    `);
  });

  it('should include success message with instructions', () => {
    const configPath = '/path/to/config';
    const message = gooseClient.successMessage(configPath);

    expect(message).toContain('Goose MCP configuration has been configured');
    expect(message).toContain(configPath);
    expect(message).toContain('Restart Goose');
  });

  it('should update config correctly', () => {
    const existingConfig = { extensions: { other: {} } };
    const newConfig: MCPConfig = {
      extensions: {
        glean: {
          command: 'npx',
          args: ['-y', '@gleanwork/local-mcp-server'],
          env: {},
        },
      },
    } as unknown as MCPConfig;

    const updated = gooseClient.updateConfig(existingConfig, newConfig, {});

    expect(updated).toMatchInlineSnapshot(`
      {
        "extensions": {
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
