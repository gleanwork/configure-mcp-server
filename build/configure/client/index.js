/**
 * Client module for MCP Clients
 *
 * Common interfaces and types for MCP client implementations
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import { MCPConfigRegistry, CLIENT, buildMcpServerName, } from '@gleanwork/mcp-config-schema';
import mcpRemotePackageJson from 'mcp-remote/package.json' with { type: 'json' };
const mcpRemoteVersion = mcpRemotePackageJson.version;
/**
 * Creates a standard MCP server configuration template
 */
export function createConfigTemplate(instanceOrUrl = '<glean instance name>', apiToken, options) {
    return {
        mcpServers: createMcpServersConfig(instanceOrUrl, apiToken, options),
    };
}
export function createMcpServersConfig(instanceOrUrl = '<glean instance name or URL>', apiToken, options, clientId = CLIENT.CURSOR) {
    var _a;
    const registry = new MCPConfigRegistry();
    const builder = registry.createBuilder(clientId);
    const isRemote = (options === null || options === void 0 ? void 0 : options.remote) === true;
    const configOutput = builder.buildConfiguration({
        mode: isRemote ? 'remote' : 'local',
        serverUrl: isRemote ? instanceOrUrl : undefined,
        instance: !isRemote ? instanceOrUrl : undefined,
        apiToken: apiToken,
        serverName: isRemote
            ? buildMcpServerName({
                mode: 'remote',
                serverUrl: instanceOrUrl,
                agents: options === null || options === void 0 ? void 0 : options.agents,
            })
            : undefined,
        includeWrapper: false,
    });
    let parsed;
    try {
        parsed = JSON.parse(configOutput);
    }
    catch (_b) {
        try {
            parsed = yaml.parse(configOutput);
        }
        catch (yamlError) {
            throw new Error(`Failed to parse configuration output: ${yamlError}`);
        }
    }
    let servers;
    if (parsed.mcpServers) {
        servers = parsed.mcpServers;
    }
    else if ((_a = parsed.mcp) === null || _a === void 0 ? void 0 : _a.servers) {
        servers = parsed.mcp.servers;
    }
    else if (parsed.servers) {
        servers = parsed.servers;
    }
    else if (parsed.extensions) {
        servers = {};
        for (const [name, ext] of Object.entries(parsed.extensions)) {
            servers[name] = {
                type: ext.type,
                command: ext.cmd,
                args: ext.args,
                env: ext.envs,
            };
        }
    }
    else if (clientId === CLIENT.GOOSE) {
        servers = {};
        for (const [name, ext] of Object.entries(parsed)) {
            servers[name] = {
                type: ext.type || 'stdio',
                command: ext.cmd,
                args: ext.args,
                env: ext.envs,
            };
        }
    }
    else {
        servers = parsed;
    }
    if (isRemote) {
        for (const [serverName, serverConfig] of Object.entries(servers)) {
            if (serverConfig &&
                'command' in serverConfig &&
                serverConfig.command === 'npx' &&
                'args' in serverConfig &&
                serverConfig.args) {
                serverConfig.args = serverConfig.args.map((arg) => {
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
export function createUniversalPathResolver(clientId) {
    return (homedir, options) => {
        const registry = new MCPConfigRegistry();
        const clientInfo = registry.getConfig(clientId);
        if (!clientInfo) {
            throw new Error(`Unknown client: ${clientId}`);
        }
        const configPaths = clientInfo.configPath;
        if (process.env.GLEAN_MCP_CONFIG_DIR) {
            const platform = process.platform;
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
        const platform = process.platform;
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
export function createSuccessMessage(clientName, configPath, instructions) {
    return `
${clientName} MCP configuration has been configured to: ${configPath}

To use it:
${instructions.map((instr, i) => `${i + 1}. ${instr}`).join('\n')}
`;
}
/**
 * Creates a base client configuration that can be extended
 */
export function createBaseClient(clientId, instructions, pathResolverOverride, mcpServersHook = (servers) => ({ mcpServers: servers })) {
    const registry = new MCPConfigRegistry();
    const clientInfo = registry.getConfig(clientId);
    if (!clientInfo) {
        throw new Error(`Unknown client: ${clientId}`);
    }
    const displayName = clientInfo.displayName;
    return {
        displayName,
        configFilePath: pathResolverOverride || createUniversalPathResolver(clientId),
        configTemplate: (instanceOrUrl, apiToken, options) => {
            const servers = createMcpServersConfig(instanceOrUrl, apiToken, options, clientId);
            return mcpServersHook(servers, options);
        },
        successMessage: (configPath) => createSuccessMessage(displayName, configPath, instructions),
        updateConfig: (existingConfig, newConfig) => {
            const standardNewConfig = newConfig;
            const result = Object.assign({}, existingConfig);
            result.mcpServers = updateMcpServersConfig(result.mcpServers || {}, standardNewConfig.mcpServers);
            return result;
        },
    };
}
export function updateMcpServersConfig(existingConfig, newConfig) {
    const result = Object.assign({}, existingConfig);
    for (const serverName in newConfig) {
        if (serverName === 'glean' || serverName.startsWith('glean_')) {
            result[serverName] = newConfig[serverName];
        }
    }
    return result;
}
/**
 * Map of all available MCP clients
 * Will be populated dynamically by scanning the client directory
 */
export const availableClients = {};
/**
 * Dynamically load all client modules in the client directory
 */
async function loadClientModules() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const clientDir = __dirname;
    try {
        const files = fs.readdirSync(clientDir);
        const isJsOrTs = (file) => file.endsWith('.js') || file.endsWith('.ts');
        const clientFiles = files.filter((file) => isJsOrTs(file) && file !== 'index.js' && !file.endsWith('.d.ts'));
        for (const file of clientFiles) {
            const clientName = path.basename(path.basename(file, '.js'), '.ts');
            try {
                const clientModule = await import(`./${clientName}.js`);
                if (clientModule.default) {
                    availableClients[clientName] = clientModule.default;
                }
            }
            catch (error) {
                console.error(`Error loading client module ${clientName}: ${error}`);
            }
        }
    }
    catch (error) {
        console.error(`Error loading client modules: ${error}`);
    }
}
/**
 * Ensures all client modules are loaded before using them
 * Returns a promise that resolves when loading is complete
 */
let clientsLoaded = false;
let loadPromise = null;
export async function ensureClientsLoaded() {
    if (clientsLoaded) {
        return Promise.resolve();
    }
    if (!loadPromise) {
        loadPromise = loadClientModules().then(() => {
            clientsLoaded = true;
        });
    }
    return loadPromise;
}
void ensureClientsLoaded().catch((error) => {
    console.error('Failed to load client modules:', error);
});
//# sourceMappingURL=index.js.map