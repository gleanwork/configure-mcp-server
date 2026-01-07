import { describe, it, expect } from 'vitest';
import claudeCodeClient from '../../configure/client/claude-code.js';
import type { ConfigureOptions, MCPConfig } from '../../configure/index.js';
import os from 'os';
import path from 'path';

describe('Claude Code MCP Client', () => {
  const homedir = os.homedir();

  it('should have the correct display name', () => {
    expect(claudeCodeClient.displayName).toBe('Claude Code');
  });

  it('should generate the correct config path based on platform', () => {
    const platform = process.platform;
    let expectedPath: string;

    if (platform === 'win32') {
      expectedPath = path.join(homedir, '.claude.json');
    } else {
      // darwin and linux both use $HOME/.claude.json
      expectedPath = path.join(homedir, '.claude.json');
    }

    expect(claudeCodeClient.configFilePath(homedir)).toBe(expectedPath);
  });

  it('should generate a valid Claude Code MCP config template with instance', () => {
    const config = claudeCodeClient.configTemplate(
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

  it('should generate a valid Claude Code remote config template with URL (native HTTP)', () => {
    const options: ConfigureOptions = { remote: true };
    const config = claudeCodeClient.configTemplate(
      'https://example-instance-be.glean.com/mcp/default',
      'test-token',
      options,
    );

    // Claude Code supports native HTTP transport
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

  it('should include success message with instructions for local config', () => {
    const configPath = '/path/to/config';
    const message = claudeCodeClient.successMessage(configPath);

    expect(message).toContain(
      'Claude Code MCP configuration has been configured',
    );
    expect(message).toContain(configPath);
    expect(message).toContain('claude mcp list');
  });

  it('should include success message with remote instructions for remote config', () => {
    const configPath = '/path/to/config';
    const options: ConfigureOptions = { remote: true };
    const message = claudeCodeClient.successMessage(configPath, options);

    expect(message).toContain(
      'Claude Code MCP configuration has been configured',
    );
    expect(message).toContain(configPath);
    expect(message).toContain('claude mcp list');
    expect(message).toContain('provided URL');
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

    const updated = claudeCodeClient.updateConfig(existingConfig, newConfig, {});

    expect(updated).toMatchObject({
      mcpServers: {
        other: {},
        glean: (newConfig as any).mcpServers.glean,
      },
    });
  });
});
