/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */
import type { ConfigureOptions } from '../index.js';
import { ClientId, type ServerConfig, type McpServersConfig } from '@gleanwork/mcp-config-schema';
/**
 * Re-export types from the schema package for backward compatibility
 */
export type MCPServerConfig = ServerConfig;
/**
 * Extract the servers collection type from the wrapped config
 * The package's McpServersConfig is { mcpServers: ... }, but we need just the inner part
 */
export type MCPServersConfig = McpServersConfig extends {
    mcpServers: infer S;
} ? S : Record<string, ServerConfig>;
/**
 * Standard MCP configuration format (Claude, Cursor, Windsurf)
 */
export interface StandardMCPConfig {
    mcpServers: MCPServersConfig;
}
/**
 * VS Code global configuration format
 */
export interface VSCodeGlobalConfig {
    mcp: {
        servers: MCPServersConfig;
    };
    [key: string]: unknown;
}
/**
 * VS Code workspace configuration format
 */
export interface VSCodeWorkspaceConfig {
    servers: MCPServersConfig;
    [key: string]: unknown;
}
/**
 * Union of all possible MCP configuration formats
 */
export type MCPConfig = StandardMCPConfig | VSCodeGlobalConfig | VSCodeWorkspaceConfig | Record<string, any>;
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
    configTemplate: (subdomainOrUrl?: string, apiToken?: string, options?: ConfigureOptions) => MCPConfig;
    /** Instructions displayed after successful configuration */
    successMessage: (configPath: string, options?: ConfigureOptions) => string;
    /**
     * Update existing configuration with new config
     * @param existingConfig Existing configuration object to update
     * @param newConfig New configuration to merge with existing
     * @param options Additional options that may affect merging logic
     * @returns Updated configuration object
     */
    updateConfig: (existingConfig: ConfigFileContents, newConfig: MCPConfig, options: ConfigureOptions) => ConfigFileContents;
}
/**
 * Creates a standard MCP server configuration template
 */
export declare function createConfigTemplate(instanceOrUrl?: string, apiToken?: string, options?: ConfigureOptions): StandardMCPConfig;
export declare function createMcpServersConfig(instanceOrUrl?: string, apiToken?: string, options?: ConfigureOptions, clientId?: ClientId): MCPServersConfig;
/**
 * Creates a universal path resolver using the package's config metadata
 */
export declare function createUniversalPathResolver(clientId: ClientId): (homedir: string, options?: ConfigureOptions) => string;
/**
 * Creates a success message with standardized format
 */
export declare function createSuccessMessage(clientName: string, configPath: string, instructions: string[]): string;
/**
 * Creates a base client configuration that can be extended
 */
export declare function createBaseClient(clientId: ClientId, instructions: string[], pathResolverOverride?: (homedir: string, options?: ConfigureOptions) => string, mcpServersHook?: (servers: MCPServersConfig, options?: ConfigureOptions) => MCPConfig): MCPClientConfig;
export declare function updateMcpServersConfig(existingConfig: MCPServersConfig, newConfig: MCPServersConfig): {
    [x: string]: {
        type: "http";
        url: string;
    } | {
        command: string;
        args: string[];
        type?: "stdio" | undefined;
        env?: Record<string, string> | undefined;
    } | {
        cmd: string;
        args: string[];
        type?: "stdio" | undefined;
        env?: Record<string, string> | undefined;
    };
};
/**
 * Map of all available MCP clients
 * Will be populated dynamically by scanning the client directory
 */
export declare const availableClients: Record<string, MCPClientConfig>;
export declare function ensureClientsLoaded(): Promise<void>;
//# sourceMappingURL=index.d.ts.map