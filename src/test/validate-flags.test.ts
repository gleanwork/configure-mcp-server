import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockConsole } from 'console-test-helpers';
import { validateFlags } from '../configure/index.js';

describe('validateFlags', () => {
  let resetConsole: () => void;
  let consoleState: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    ({ resetConsole, consoleState } = mockConsole());
    originalEnv = { ...process.env };

    delete process.env.GLEAN_API_TOKEN;
    delete process.env.GLEAN_INSTANCE;
    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_URL;
    delete process.env.GLEAN_SERVER_URL;
  });

  afterEach(() => {
    resetConsole();
    process.env = originalEnv;
  });

  it('should return false when client is not provided', async () => {
    const result = await validateFlags(
      undefined,
      'token',
      'instance',
      undefined,
      undefined,
    );

    expect(result).toBe(false);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`
      "Error: --client parameter is required
      Run with --help for usage information"
    `);
  });

  it('should return true when both token/instance and env are provided (flags take priority)', async () => {
    const result = await validateFlags(
      'client',
      'token',
      'instance',
      undefined,
      'env-path',
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return false when neither instance nor url is provided and no environment variables', async () => {
    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(false);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`
      "Error: You must provide either:
        1. Both --token and --server-url for local configuration, or
        2. --url for remote configuration, or
        3. --env pointing to a .env file with configuration
      Run with --help for usage information"
    `);
  });

  it('should return true but show warning when only token is provided', async () => {
    const result = await validateFlags(
      'client',
      'token',
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`
      "
      "Warning: Configuring without complete credentials.
      You must provide either:
        1. Both --token and --server-url, or
        2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_SERVER_URL

      Continuing with configuration, but you will need to set credentials manually later."
      "
    `);
  });

  it('should return true when only instance is provided (warning shown)', async () => {
    const result = await validateFlags(
      'client',
      undefined,
      'instance',
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`""`);
  });

  it('should return true when both token and instance are provided', async () => {
    const result = await validateFlags(
      'client',
      'token',
      'instance',
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when env path is provided', async () => {
    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      'env-path',
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when both token and instance are available via environment variables', async () => {
    process.env.GLEAN_API_TOKEN = 'env-token';
    process.env.GLEAN_INSTANCE = 'env-instance';

    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when token and subdomain are available via environment variables', async () => {
    process.env.GLEAN_API_TOKEN = 'env-token';
    process.env.GLEAN_SUBDOMAIN = 'env-subdomain';

    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when token and base URL are available via environment variables', async () => {
    process.env.GLEAN_API_TOKEN = 'env-token';
    process.env.GLEAN_URL = 'https://example.glean.com';

    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true but show warning when only token is available via environment', async () => {
    process.env.GLEAN_API_TOKEN = 'env-token';
    delete process.env.GLEAN_INSTANCE;
    delete process.env.GLEAN_SUBDOMAIN;
    delete process.env.GLEAN_URL;

    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`
      "
      "Warning: Configuring without complete credentials.
      You must provide either:
        1. Both --token and --server-url, or
        2. --env pointing to a .env file containing GLEAN_API_TOKEN and GLEAN_SERVER_URL

      Continuing with configuration, but you will need to set credentials manually later."
      "
    `);
  });

  it('should return true when only instance is available via environment (warning shown)', async () => {
    delete process.env.GLEAN_API_TOKEN;
    process.env.GLEAN_INSTANCE = 'env-instance';

    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toMatchInlineSnapshot(`""`);
  });

  it('should return true when token flag is provided but instance comes from environment', async () => {
    process.env.GLEAN_INSTANCE = 'env-instance';

    const result = await validateFlags(
      'client',
      'flag-token',
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when instance flag is provided but token comes from environment', async () => {
    process.env.GLEAN_API_TOKEN = 'env-token';

    const result = await validateFlags(
      'client',
      undefined,
      'flag-instance',
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when serverUrl flag is provided with token', async () => {
    const result = await validateFlags(
      'client',
      'token',
      undefined,
      undefined,
      undefined,
      'https://my-company-be.glean.com',
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });

  it('should return true when GLEAN_SERVER_URL environment variable is set', async () => {
    process.env.GLEAN_SERVER_URL = 'https://my-company-be.glean.com';
    process.env.GLEAN_API_TOKEN = 'env-token';

    const result = await validateFlags(
      'client',
      undefined,
      undefined,
      undefined,
      undefined,
    );

    expect(result).toBe(true);
    expect(consoleState.getState('error')).toEqual('');
  });
});
