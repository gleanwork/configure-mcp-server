/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */

import path from 'path';
import {
  MCPConfigRegistry,
  ClientId,
  CLIENT,
  type MCPConnectionOptions,
  buildMcpServerName,
  createGleanEnv,
  createGleanUrlEnv,
  createGleanHeaders,
  createGleanRegistry,
} from '@gleanwork/mcp-config';

import mcpRemotePackageJson from 'mcp-remote/package.json' with { type: 'json' };
import type {
  ConfigureOptions,
  MCPServersConfig,
  StandardMCPConfig,
  MCPConfig,
  ConfigFileContents,
  MCPClientConfig,
} from '../types.js';

import claudeCodeClient from './claude-code.js';
import claudeDesktopClient from './claude-desktop.js';
import codexClient from './codex.js';
import cursorClient from './cursor.js';
import gooseClient from './goose.js';
import jetbrainsClient from './jetbrains.js';
import junieClient from './junie.js';
import vscodeClient from './vscode.js';
import windsurfClient from './windsurf.js';

const mcpRemoteVersion = mcpRemotePackageJson.version;

// Re-export types from the central types file for backward compatibility
export type {
  MCPServerConfig,
  MCPServersConfig,
  StandardMCPConfig,
  VSCodeConfig,
  MCPConfig,
  ConfigFileContents,
  MCPClientConfig,
} from '../types.js';

/**
 * Creates a standard MCP server configuration template
 */
export function createConfigTemplate(
  instanceOrUrl = '<glean instance name>',
  apiToken?: string,
  options?: ConfigureOptions,
): StandardMCPConfig {
  return {
    mcpServers: createMcpServersConfig(instanceOrUrl, apiToken, options),
  };
}

export function createMcpServersConfig(
  instanceOrUrl = '<glean instance name or URL>',
  apiToken?: string,
  options?: ConfigureOptions,
  clientId: ClientId = CLIENT.CURSOR,
): MCPServersConfig {
  const isRemote = options?.remote === true;

  // For stdio transport, determine if we have a URL or instance name
  const getEnvVars = () => {
    if (isRemote) return undefined;
    if (URL.canParse(instanceOrUrl)) {
      return createGleanUrlEnv(instanceOrUrl, apiToken);
    }
    return createGleanEnv(instanceOrUrl, apiToken);
  };

  const serverData: MCPConnectionOptions = {
    transport: isRemote ? 'http' : 'stdio',
    serverUrl: isRemote ? instanceOrUrl : undefined,
    env: getEnvVars(),
    headers: isRemote && apiToken ? createGleanHeaders(apiToken) : undefined,
    serverName: isRemote
      ? buildMcpServerName({
          transport: 'http',
          serverUrl: instanceOrUrl,
        })
      : undefined,
  };

  const registry = createGleanRegistry();
  const builder = registry.createBuilder(clientId);
  const configObj = builder.buildConfiguration(serverData);

  // Get client config to extract servers using the correct property name
  const clientInfo = registry.getConfig(clientId);
  if (!clientInfo) {
    throw new Error(`Unknown client: ${clientId}`);
  }
  const serversPropertyName =
    clientInfo.configStructure.serversPropertyName || 'mcpServers';

  // Extract servers directly from the config without normalization
  // This preserves client-specific properties (e.g., Goose's cmd, envs, timeout, etc.)
  const servers = (configObj as Record<string, unknown>)[
    serversPropertyName
  ] as MCPServersConfig;

  if (isRemote) {
    // Get the correct property names for this client's stdio config
    const stdioMapping = clientInfo.configStructure.stdioPropertyMapping;
    const commandProp = stdioMapping?.commandProperty || 'command';
    const argsProp = stdioMapping?.argsProperty || 'args';

    for (const [, serverConfig] of Object.entries(servers)) {
      // Type guard for stdio server config with command and args
      // (some clients use mcp-remote as a bridge for HTTP transport)
      if (
        serverConfig &&
        typeof serverConfig === 'object' &&
        commandProp in serverConfig &&
        argsProp in serverConfig
      ) {
        const config = serverConfig as Record<string, unknown>;
        const commandValue = config[commandProp];
        const argsValue = config[argsProp];

        // Assert expected types - fail fast if assumptions are wrong
        if (commandValue !== 'npx') continue;
        if (!Array.isArray(argsValue)) {
          throw new Error(
            `Expected ${argsProp} to be an array, got ${typeof argsValue}`,
          );
        }

        config[argsProp] = argsValue.map((arg: unknown) => {
          if (typeof arg !== 'string') {
            throw new Error(`Expected arg to be a string, got ${typeof arg}`);
          }
          if (arg === 'mcp-remote' || arg.startsWith('mcp-remote@')) {
            return `mcp-remote@${mcpRemoteVersion}`;
          }
          return arg;
        });
      }
    }
  }

  return servers;
}

/**
 * Creates a universal path resolver using the package's config metadata
 */
export function createUniversalPathResolver(clientId: ClientId) {
  return (homedir: string, options?: ConfigureOptions) => {
    const registry = new MCPConfigRegistry();
    const clientInfo = registry.getConfig(clientId);
    if (!clientInfo) {
      throw new Error(`Unknown client: ${clientId}`);
    }
    const configPaths = clientInfo.configPath;

    if (process.env.GLEAN_MCP_CONFIG_DIR) {
      const platform = process.platform as 'darwin' | 'linux' | 'win32';
      const pathTemplate = configPaths[platform];

      if (!pathTemplate) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Extract the path after $HOME or %USERPROFILE%
      const relativePath = pathTemplate
        .replace(/^\$HOME[\\/]?/, '')
        .replace(/^%USERPROFILE%[\\/]?/, '');
      return path.join(process.env.GLEAN_MCP_CONFIG_DIR, relativePath);
    }

    const platform = process.platform as 'darwin' | 'linux' | 'win32';
    const pathTemplate = configPaths[platform];

    if (!pathTemplate) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    return pathTemplate
      .replace('$HOME', homedir)
      .replace('%USERPROFILE%', homedir)
      .replace(/\\/g, path.sep);
  };
}

/**
 * Creates a success message with standardized format
 */
export function createSuccessMessage(
  clientName: string,
  configPath: string,
  instructions: string[],
) {
  return `
${clientName} MCP configuration has been configured to: ${configPath}

To use it:
${instructions.map((instr, i) => `${i + 1}. ${instr}`).join('\n')}
`;
}

/**
 * Creates a base client configuration that can be extended
 */
export function createBaseClient(
  clientId: ClientId,
  instructions: string[],
  pathResolverOverride?: (
    homedir: string,
    options?: ConfigureOptions,
  ) => string,
  mcpServersHook?: (
    servers: MCPServersConfig,
    options?: ConfigureOptions,
  ) => MCPConfig,
): MCPClientConfig {
  const registry = new MCPConfigRegistry();
  const clientInfo = registry.getConfig(clientId);
  if (!clientInfo) {
    throw new Error(`Unknown client: ${clientId}`);
  }
  const displayName = clientInfo.displayName;
  const serversPropertyName = clientInfo.configStructure.serversPropertyName || 'mcpServers';

  // If no custom hook is provided, create default one using the correct serversPropertyName
  // Cast through unknown required because TypeScript can't verify computed property names match the union
  const effectiveMcpServersHook: (servers: MCPServersConfig, options?: ConfigureOptions) => MCPConfig =
    mcpServersHook || ((servers) => ({ [serversPropertyName]: servers }) as unknown as MCPConfig);

  return {
    displayName,

    configFilePath:
      pathResolverOverride || createUniversalPathResolver(clientId),

    configTemplate: (
      instanceOrUrl?: string,
      apiToken?: string,
      options?: ConfigureOptions,
    ) => {
      const servers = createMcpServersConfig(
        instanceOrUrl,
        apiToken,
        options,
        clientId,
      );
      return effectiveMcpServersHook(servers, options);
    },

    successMessage: (configPath) =>
      createSuccessMessage(displayName, configPath, instructions),

    updateConfig: (
      existingConfig: ConfigFileContents,
      newConfig: MCPConfig,
    ) => {
      const result = { ...existingConfig } as ConfigFileContents;

      // Get the servers from the new config using the correct key
      const newServers = (newConfig as any)[serversPropertyName] as MCPServersConfig;
      const existingServers = ((result as any)[serversPropertyName] as MCPServersConfig) || {};

      (result as any)[serversPropertyName] = updateMcpServersConfig(
        existingServers,
        newServers,
      );
      return result;
    },
  };
}

export function updateMcpServersConfig(
  existingConfig: MCPServersConfig,
  newConfig: MCPServersConfig,
) {
  const result = { ...existingConfig };

  for (const serverName in newConfig) {
    if (serverName === 'glean' || serverName.startsWith('glean_')) {
      result[serverName] = newConfig[serverName];
    }
  }

  return result;
}

/**
 * Map of all available MCP clients
 */
export const availableClients: Record<string, MCPClientConfig> = {
  'claude-code': claudeCodeClient,
  'claude-desktop': claudeDesktopClient,
  'codex': codexClient,
  'cursor': cursorClient,
  'goose': gooseClient,
  'jetbrains': jetbrainsClient,
  'junie': junieClient,
  'vscode': vscodeClient,
  'windsurf': windsurfClient,
};
