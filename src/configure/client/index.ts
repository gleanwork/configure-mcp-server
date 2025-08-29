/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */

import path from 'path';
import type { ConfigureOptions } from '../index.js';
import {
  MCPConfigRegistry,
  ClientId,
  CLIENT,
  type ServerConfig,
  type McpServersConfig,
  type GleanServerConfig,
  buildMcpServerName,
  buildConfiguration,
} from '@gleanwork/mcp-config-schema';
import mcpRemotePackageJson from 'mcp-remote/package.json' with { type: 'json' };

import claudeCodeClient from './claude-code.js';
import claudeDesktopClient from './claude-desktop.js';
import cursorClient from './cursor.js';
import gooseClient from './goose.js';
import vscodeClient from './vscode.js';
import windsurfClient from './windsurf.js';

const mcpRemoteVersion = mcpRemotePackageJson.version;

/**
 * Re-export types from the schema package for backward compatibility
 */
export type MCPServerConfig = ServerConfig;

/**
 * Extract the servers collection type from the wrapped config
 * The package's McpServersConfig is { mcpServers: ... }, but we need just the inner part
 */
export type MCPServersConfig = McpServersConfig extends { mcpServers: infer S }
  ? S
  : Record<string, ServerConfig>;

/**
 * Standard MCP configuration format (Claude, Cursor, Windsurf)
 */
export interface StandardMCPConfig {
  mcpServers: MCPServersConfig;
}

/**
 * VS Code configuration format
 */
export interface VSCodeConfig {
  servers: MCPServersConfig;
  [key: string]: unknown;
}

/**
 * Union of all possible MCP configuration formats
 */
export type MCPConfig =
  | StandardMCPConfig
  | VSCodeConfig
  | Record<string, any>; // Goose and other YAML-based configs

/**
 * Generic config file contents that might contain MCP configuration
 * Represents the parsed contents of client config files like VS Code settings.json
 */
export type ConfigFileContents = Record<string, unknown> & Partial<MCPConfig>;

/**
 * Interface for MCP client configuration details
 */
export interface MCPClientConfig {
  /** Display name for the client */
  displayName: string;

  /**
   * Path to the config file, supports OS-specific paths and client-specific options.
   * If GLEAN_MCP_CONFIG_DIR environment variable is set, it will override the default path.
   */
  configFilePath: (homedir: string, options?: ConfigureOptions) => string;

  /** Function to generate the config JSON for this client */
  configTemplate: (
    subdomainOrUrl?: string,
    apiToken?: string,
    options?: ConfigureOptions,
  ) => MCPConfig;

  /** Instructions displayed after successful configuration */
  successMessage: (configPath: string, options?: ConfigureOptions) => string;

  /**
   * Update existing configuration with new config
   * @param existingConfig Existing configuration object to update
   * @param newConfig New configuration to merge with existing
   * @param options Additional options that may affect merging logic
   * @returns Updated configuration object
   */
  updateConfig: (
    existingConfig: ConfigFileContents,
    newConfig: MCPConfig,
    options: ConfigureOptions,
  ) => ConfigFileContents;
}

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

  const serverData: GleanServerConfig = {
    transport: isRemote ? 'http' : 'stdio',
    serverUrl: isRemote ? instanceOrUrl : undefined,
    instance: !isRemote ? instanceOrUrl : undefined,
    apiToken: apiToken,
    serverName: isRemote
      ? buildMcpServerName({
          transport: 'http',
          serverUrl: instanceOrUrl,
          agents: options?.agents,
        })
      : undefined,
  };

  const configObj = buildConfiguration(clientId, serverData);
  
  const registry = new MCPConfigRegistry();
  const builder = registry.createBuilder(clientId);
  const servers = builder.getNormalizedServersConfig(configObj) as MCPServersConfig;

  if (isRemote) {
    for (const [, serverConfig] of Object.entries(servers)) {
      if (
        serverConfig &&
        'command' in serverConfig &&
        serverConfig.command === 'npx' &&
        'args' in serverConfig &&
        serverConfig.args
      ) {
        serverConfig.args = serverConfig.args.map((arg: string) => {
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
  const serverKey = clientInfo.configStructure.serverKey || 'mcpServers';

  // If no custom hook is provided, create default one using the correct serverKey
  const effectiveMcpServersHook = mcpServersHook || ((servers) => ({ [serverKey]: servers }));

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
      const newServers = (newConfig as any)[serverKey] as MCPServersConfig;
      const existingServers = ((result as any)[serverKey] as MCPServersConfig) || {};

      (result as any)[serverKey] = updateMcpServersConfig(
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
  'cursor': cursorClient,
  'goose': gooseClient,
  'vscode': vscodeClient,
  'windsurf': windsurfClient,
};
