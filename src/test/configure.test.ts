import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configure, ConfigureOptions } from '../configure/index.js';
import { validateInstance } from '@gleanwork/mcp-server-utils/util';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { Logger } from '@gleanwork/mcp-server-utils/logger';

vi.mock('@gleanwork/mcp-server-utils/util', () => ({
  validateInstance: vi.fn(),
}));

describe('configure', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalHome: string;
  let originalExit: typeof process.exit;
  let originalConsoleError: typeof console.error;
  let consoleErrorOutput: string[];

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalHome = os.homedir();
    originalExit = process.exit;
    originalConsoleError = console.error;
    consoleErrorOutput = [];

    process.exit = vi.fn() as any;
    console.error = vi.fn((...args) => {
      consoleErrorOutput.push(args.join(' '));
    }) as any;

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.HOME = tempDir;
    os.homedir = () => tempDir;

    vi.mocked(validateInstance).mockResolvedValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
    os.homedir = () => originalHome;
    process.exit = originalExit;
    console.error = originalConsoleError;

    fs.rmSync(tempDir, { recursive: true, force: true });

    vi.clearAllMocks();
    Logger.reset();
  });

  it('should configure remote server using API token', async () => {
    const options: ConfigureOptions = {
      token: 'test-token',
      url: 'https://test-instance-be.glean.com/mcp/default',
      remote: true,
    };

    await configure('cursor', options);

    const configPath = path.join(tempDir, '.cursor', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "glean_default": {
            "headers": {
              "Authorization": "Bearer test-token",
            },
            "type": "http",
            "url": "https://test-instance-be.glean.com/mcp/default",
          },
        },
      }
    `);
  });

  // The local (stdio) path has been removed from Glean's mcp-config registry
  // (see @gleanwork/mcp-config-glean >= 5.0.0). Attempting to configure without
  // `remote: true` surfaces the "serverPackage not configured" error from the
  // builder; the CLI wrapper intercepts this earlier via
  // ensureLocalServerAvailable() (covered in cli.test.ts).
  it('throws when configuring stdio/local against a remote-only registry', async () => {
    await expect(
      configure('cursor', { token: 'test-token', instance: 'test-instance' }),
    ).resolves.toBeUndefined();

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(consoleErrorOutput.some((line) => /serverPackage/i.test(line))).toBe(true);
  });
});
