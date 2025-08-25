/**
 * VS Code MCP Client Implementation
 *
 * https://code.visualstudio.com/docs/copilot/chat/mcp-servers
 */
import path from 'path';
import { createBaseClient, createMcpServersConfig, updateMcpServersConfig, createUniversalPathResolver, } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config-schema';
/**
 * Creates VS Code workspace configuration format
 */
function createVSCodeWorkspaceConfig(instanceOrUrl, apiToken, options) {
    return {
        servers: createMcpServersConfig(instanceOrUrl, apiToken, options, CLIENT.VSCODE),
    };
}
const vscodeClient = createBaseClient(CLIENT.VSCODE, [
    'Enable MCP support in VS Code by adding "chat.mcp.enabled": true to your user settings',
    'Restart VS Code',
    'Open the Chat view (Ctrl+Alt+I or ⌃⌘I) and select "Agent" mode from the dropdown',
    'Click the "Tools" button to see and use Glean tools in Agent mode',
    "You'll be asked for approval when Agent uses these tools",
]);
// Override configFilePath to handle workspace vs global
vscodeClient.configFilePath = (homedir, options) => {
    if (options === null || options === void 0 ? void 0 : options.workspace) {
        return path.join(process.cwd(), '.vscode', 'mcp.json');
    }
    // Use the universal resolver for global config
    return createUniversalPathResolver(CLIENT.VSCODE)(homedir, options);
};
// Override configTemplate to handle workspace vs global format
vscodeClient.configTemplate = (instanceOrUrl, apiToken, options) => {
    if (options === null || options === void 0 ? void 0 : options.workspace) {
        return createVSCodeWorkspaceConfig(instanceOrUrl, apiToken, options);
    }
    return {
        mcp: {
            servers: createMcpServersConfig(instanceOrUrl, apiToken, options, CLIENT.VSCODE),
        },
    };
};
// Override successMessage to handle workspace vs global
vscodeClient.successMessage = (configPath, options) => {
    if (options === null || options === void 0 ? void 0 : options.workspace) {
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
// Override updateConfig to handle workspace vs global format
vscodeClient.updateConfig = (existingConfig, newConfig, options) => {
    if (options === null || options === void 0 ? void 0 : options.workspace) {
        const workspaceNewConfig = newConfig;
        const result = Object.assign({}, existingConfig);
        result.servers = updateMcpServersConfig(result.servers || {}, workspaceNewConfig.servers);
        return result;
    }
    const globalNewConfig = newConfig;
    const result = Object.assign({}, existingConfig);
    result.mcp = result.mcp || { servers: {} };
    result.mcp.servers = updateMcpServersConfig(result.mcp.servers || {}, globalNewConfig.mcp.servers);
    return result;
};
export default vscodeClient;
//# sourceMappingURL=vscode.js.map