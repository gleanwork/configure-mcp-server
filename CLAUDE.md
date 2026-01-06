# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a CLI tool that configures MCP (Model Context Protocol) clients to connect to Glean's MCP servers. The package is published as `@gleanwork/configure-mcp-server` on npm and supports both local MCP servers (stdio transport) and remote MCP servers (HTTP transport with OAuth/DCR or bearer tokens).

## Development Commands

### Building
```bash
npm run build              # Clean build directory, compile TypeScript, and copy templates
npm run watch             # Watch mode for TypeScript compilation
```

The build process:
1. Removes the `build/` directory
2. Compiles TypeScript from `src/` to `build/`
3. Copies markdown templates from `src/init/templates/markdown/` to `build/init/templates/markdown/`

### Testing
```bash
npm test                  # Run tests once with Vitest
npm run test:watch        # Run tests in watch mode
npm run test:all          # Run linting, type checking, and tests
```

Tests are located in `src/test/**/*.test.ts` and use Vitest.

### Linting and Formatting
```bash
npm run lint              # Run all linters (ESLint, package.json, TypeScript)
npm run lint:eslint       # Run ESLint on TypeScript files (with --fix)
npm run lint:ts           # TypeScript type checking (noEmit)
npm run format            # Format all files with Prettier
```

### Running Locally
```bash
npm run go -- [command]   # Run the CLI using ts-node without building
node build/index.js [command]  # Run the built CLI
```

### Single Test Execution
To run a single test file:
```bash
npm test -- src/test/configure.test.ts
```

## Architecture

### Three Main Commands

1. **`local`** - Configures local MCP server (stdio transport)
   - Requires: `--client`, `--token`, `--instance` (or `--env`)
   - Uses `@gleanwork/local-mcp-server` package

2. **`remote`** - Configures remote MCP server (HTTP transport)
   - Requires: `--client`, `--url`
   - Optional: `--token` (if not provided, uses OAuth with Dynamic Client Registration)
   - Uses `mcp-remote` package as a proxy

3. **`init`** - Creates project-level files for AI coding tools
   - Creates client-specific configuration files (Cursor rules, Claude Code agents)
   - Can create `AGENTS.md` file

### Core Architecture

The codebase is organized into two main modules:

#### 1. Configuration Module (`src/configure/`)

Handles MCP server configuration for different clients. Key files:

- **`src/configure/index.ts`**: Main configuration orchestration
  - `configure()`: Main entry point that validates flags, loads credentials, and writes config files
  - `loadCredentials()`: Loads from CLI flags, .env files, or environment variables (precedence in that order)
  - `writeConfigFile()`: Handles JSON/YAML serialization and merging with existing configs
  - `validateFlags()`: Validates required parameters based on configuration type

- **`src/configure/types.ts`**: TypeScript type definitions
  - `ConfigureOptions`: CLI options interface
  - `StandardMCPConfig`: Format used by Claude Desktop, Cursor, Windsurf (uses `mcpServers` key)
  - `VSCodeConfig`: VS Code's format (uses `servers` key instead)
  - `MCPConfig`: Union type for all config formats

- **`src/configure/client/index.ts`**: Client abstraction layer
  - `createMcpServersConfig()`: Core function that generates MCP server configuration using `@gleanwork/mcp-config`
  - `createBaseClient()`: Factory for creating client configurations
  - `availableClients`: Registry of all supported MCP clients
  - Each client exports an `MCPClientConfig` with: `displayName`, `configFilePath()`, `configTemplate()`, `successMessage()`, `updateConfig()`

- **`src/configure/client/*.ts`**: Individual client implementations (cursor.ts, claude-code.ts, claude-desktop.ts, vscode.ts, windsurf.ts, goose.ts)

#### 2. Initialization Module (`src/init/`)

Creates project-level files for enhanced AI coding experience:

- **`src/init/installer.ts`**: Core installation logic
  - `initializeProject()`: Main entry point that creates client-specific files
  - Handles dry-run mode and file conflict detection

- **`src/init/clients/`**: Client-specific file generators
  - `cursor.ts`: Generates `.cursor/rules/glean-mcp.mdc`
  - `claude-code.ts`: Generates `.claude/agents/glean-expert.md`

- **`src/init/templates/`**: Template loading system
  - Templates are markdown files in `src/init/templates/markdown/`
  - Supports variable substitution (e.g., `{{serverName}}`)
  - Templates must be copied to `build/` during build process

### Key Dependencies

- **`@gleanwork/mcp-config`**: Provides the canonical configuration schema and builder for all MCP clients, plus Glean-specific helpers. This package re-exports from `@gleanwork/mcp-config-schema` and adds helpers like `createGleanEnv()`, `createGleanHeaders()`, and `createGleanRegistry()`.
- **`@gleanwork/mcp-server-utils`**: Shared utilities including logger and instance validation.
- **`mcp-remote`**: Proxy package for remote MCP servers over HTTP.
- **`commander`**: CLI framework (migrated from meow in v2.0.0).
- **`yaml`**: YAML parsing/serialization for Goose client.

### Configuration Flow

1. CLI arguments parsed by Commander.js (`src/index.ts`)
2. `validateFlags()` ensures required parameters present
3. `configure()` orchestrates the process:
   - Loads credentials from multiple sources (flags > env file > environment)
   - Validates instance connectivity (unless `_SKIP_INSTANCE_PREFLIGHT=true`)
   - Gets client-specific config via `availableClients[client]`
   - Calls `client.configTemplate()` to generate new config using `@gleanwork/mcp-config`
   - For remote configs, pins `mcp-remote` version from package.json
   - Merges with existing config if present using `client.updateConfig()`
   - Writes JSON or YAML file

### Transport Types

- **stdio**: Local MCP server runs as a subprocess, communicates via stdin/stdout
  - Command: `npx -y @gleanwork/local-mcp-server`
  - Requires: instance name and API token as env vars

- **HTTP**: Remote MCP server accessed over HTTP
  - Command: `npx -y mcp-remote@<version>`
  - Args include server URL and auth method (DCR OAuth or bearer token)
  - OAuth with DCR is preferred (no token management needed)

### Config File Locations

Each client has platform-specific paths defined in `@gleanwork/mcp-config`. The `GLEAN_MCP_CONFIG_DIR` environment variable can override the default directory.

### Important Patterns

- **Backward compatibility**: The `claude` client name is aliased to `claude-desktop`
- **Flag conflicts**: `--instance` is ignored if `--url` is also provided
- **Config merging**: Only updates Glean-related servers (keys starting with `glean` or `glean_`)
- **Template copying**: The build process must copy markdown templates to `build/init/templates/markdown/`

## Common Development Tasks

### Adding a New MCP Client

1. Create `src/configure/client/your-client.ts`
2. Use `createBaseClient()` from `index.ts` or implement `MCPClientConfig` interface
3. Add to `availableClients` map in `src/configure/client/index.ts`
4. Add corresponding `CLIENT.YOUR_CLIENT` constant to `@gleanwork/mcp-config-schema` package (which is re-exported by `@gleanwork/mcp-config`)
5. Add tests in `src/test/configure/your-client.test.ts`

### Adding Init Templates

1. Create markdown file in `src/init/templates/markdown/`
2. Add template name to `TemplateName` enum in `src/init/templates/index.ts`
3. Update template loader in `src/init/templates/index.ts`
4. Ensure `npm run copy-templates` copies it during build

### Testing Environment Variables

Set `_SKIP_INSTANCE_PREFLIGHT=true` to bypass instance validation during testing.

## TypeScript Configuration

- **Target**: ES2017 with ES2022 lib
- **Module**: NodeNext (ESM)
- **Strict mode**: Enabled
- **Output**: `build/` directory with source maps and declaration files
- **JSON imports**: Enabled via `resolveJsonModule` for package.json imports
