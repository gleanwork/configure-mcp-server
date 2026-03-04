/**
 * Configuration types for Glean MCP Server
 */

import type {
  MCPConnectionOptions,
  MCPServersRecord,
  MCPConfig as SchemaMCPConfig,
  StandardMCPConfig as SchemaStandardMCPConfig,
  VSCodeMCPConfig,
} from '@gleanwork/mcp-config';

/**
 * Configure options interface
 */
export interface ConfigureOptions {
  token?: string;
  instance?: string;
  remote?: boolean;
  url?: string;
  envPath?: string;
  workspace?: boolean;
}

/**
 * Re-export types from the schema package for backward compatibility
 */
export type MCPServerConfig = MCPConnectionOptions;

/**
 * Servers collection type (inner content of config)
 */
export type MCPServersConfig = MCPServersRecord;

/**
 * Standard MCP configuration format (Claude, Cursor, Windsurf)
 */
export type StandardMCPConfig = SchemaStandardMCPConfig;

/**
 * VS Code configuration format
 */
export type VSCodeConfig = VSCodeMCPConfig;

/**
 * Union of all possible MCP configuration formats
 */
export type MCPConfig = SchemaMCPConfig;

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
