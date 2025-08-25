/**
 * Configuration module for Glean MCP Server
 *
 * Handles configuration of MCP settings for different host applications:
 * - Claude Desktop
 * - Windsurf
 * - Cursor
 */
export type { MCPConfig, ConfigFileContents } from './client/index.js';
/**
 * Configure options interface
 */
export interface ConfigureOptions {
    token?: string;
    instance?: string;
    remote?: boolean;
    agents?: boolean;
    url?: string;
    envPath?: string;
    workspace?: boolean;
}
/**
 * Handles the configuration process for the specified MCP client
 *
 * @param client - The MCP client to configure for (cursor, claude, windsurf, vscode)
 * @param options - Configuration options including token, instance, url, envPath, and workspace
 */
export declare function configure(client: string, options: ConfigureOptions): Promise<void>;
/**
 * Lists all supported MCP clients
 */
export declare function listSupportedClients(): Promise<void>;
/**
 * Validates client and credential parameters
 * Returns true if validation passes, false if it fails (with appropriate error messages)
 */
export declare function validateFlags(client: string | undefined, token: string | undefined, instance: string | undefined, url: string | undefined, env: string | undefined): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map