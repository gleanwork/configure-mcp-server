/**
 * VS Code MCP Client Implementation
 *
 * https://code.visualstudio.com/docs/copilot/chat/mcp-servers
 */

import path from 'path';
import {
  createBaseClient,
  updateMcpServersConfig,
  createUniversalPathResolver,
} from './index.js';
import type {
  ConfigureOptions,
  VSCodeConfig,
  MCPConfig,
  MCPServersConfig,
  ConfigFileContents,
} from '../types.js';
import {
  CLIENT,
  type MCPConnectionOptions,
  buildMcpServerName,
  createGleanEnv,
  createGleanUrlEnv,
  createGleanHeaders,
  createGleanRegistry,
} from '@gleanwork/mcp-config';


/**
 * Creates configuration using the mcp-config builder
 */
function createVSCodeConfig(
  instanceOrUrl?: string,
  apiToken?: string,
  options?: ConfigureOptions,
): MCPConfig {
  const isRemote = options?.remote === true;

  // For stdio transport, determine if we have a URL or instance name
  const getEnvVars = () => {
    if (isRemote || !instanceOrUrl) return undefined;
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
  const builder = registry.createBuilder(CLIENT.VSCODE);
  return builder.buildConfiguration(serverData) as VSCodeConfig;
}

const vscodeClient = createBaseClient(CLIENT.VSCODE, [
  'Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings',
  'Restart VS Code',
  'Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown',
  'Click the "Tools" button to see and use Glean tools in Agent mode',
  "You'll be asked for approval when Agent uses these tools",
]);

// Override configFilePath to handle workspace vs global
vscodeClient.configFilePath = (homedir: string, options?: ConfigureOptions) => {
  if (options?.workspace) {
    return path.join(process.cwd(), '.vscode', 'mcp.json');
  }
  // Use the universal resolver for global config
  return createUniversalPathResolver(CLIENT.VSCODE)(homedir, options);
};

vscodeClient.configTemplate = (
  instanceOrUrl?: string,
  apiToken?: string,
  options?: ConfigureOptions,
): MCPConfig => {
  return createVSCodeConfig(instanceOrUrl, apiToken, options);
};

// Override successMessage to handle workspace vs global
vscodeClient.successMessage = (
  configPath: string,
  options?: ConfigureOptions,
) => {
  if (options?.workspace) {
    return `
VS Code workspace MCP configuration has been configured: ${configPath}

To use it:
1. Restart VS Code
2. Open the Chat view (⌃⌘I on Mac, Ctrl+Alt+I on Windows/Linux) and select "Agent" mode
3. Click the "Tools" button to see and use Glean tools in Agent mode
4. You'll be asked for approval when Agent uses these tools

Notes:
- This configuration is specific to this workspace
- Configuration is at: ${configPath}
`;
  }

  return `
VS Code MCP configuration has been configured in your user settings: ${configPath}

To use it:
1. Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings
2. Restart VS Code
3. Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown
4. Click the "Tools" button to see and use Glean tools in Agent mode
5. You'll be asked for approval when Agent uses these tools
`;
};

// Override updateConfig to use the schema-generated format
vscodeClient.updateConfig = (
  existingConfig: ConfigFileContents,
  newConfig: MCPConfig,
  options?: ConfigureOptions,
): ConfigFileContents => {
  const configAsVSCode = newConfig as VSCodeConfig;
  const result = { ...existingConfig } as ConfigFileContents & VSCodeConfig;
  
  // Handle migration from old format (mcp.servers) to new format (servers)
  let existingServers: MCPServersConfig = result.servers || {};
  const mcp = result.mcp;
  if (mcp && typeof mcp === 'object' && 'servers' in mcp && mcp.servers && typeof mcp.servers === 'object') {
    // Migrate old format servers to new format
    existingServers = { ...existingServers, ...(mcp.servers as MCPServersConfig) };
    // Remove the old mcp property
    delete result.mcp;
  }
  
  result.servers = updateMcpServersConfig(
    existingServers,
    configAsVSCode.servers,
  );
  return result;
};

export default vscodeClient;
