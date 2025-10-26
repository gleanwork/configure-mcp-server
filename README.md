# @gleanwork/configure-mcp-server

![CI Build](https://github.com/gleanwork/configure-mcp-server/actions/workflows/ci.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@gleanwork%2Fconfigure-mcp-server.svg)](https://badge.fury.io/js/@gleanwork%2Fconfigure-mcp-server)
[![License](https://img.shields.io/npm/l/@gleanwork%2Fconfigure-mcp-server.svg)](https://github.com/gleanwork/configure-mcp-server/blob/main/LICENSE)

A command-line utility for configuring popular MCP clients to connect to Glean's MCP servers.

## Overview

This package configures MCP clients to connect to:

- **Remote MCP servers** (primary): URL-based servers that use OAuth with Dynamic Client Registration (DCR) for authentication
- **Local MCP server** (experimental): Locally-installed server instances using `@gleanwork/local-mcp-server`

## Authentication

**OAuth with Dynamic Client Registration (Recommended)**: Automatic authentication with no manual token management required. This is the preferred method for remote MCP servers.

**Bearer Tokens**: For MCP hosts that don't support OAuth, you can use user-scoped Client API tokens with the `MCP` scope. Contact your Glean administrator to provision these tokens.

## Configuration

### Remote MCP Servers (Recommended)

Configure your client to connect to a remote MCP server using OAuth:

```bash
npx -y @gleanwork/configure-mcp-server remote --url https://your-instance-be.glean.com/mcp/default --client cursor
```

Supported clients: `cursor`, `claude-desktop`, `claude-code`, `vscode`, `windsurf`, `goose`

For clients that don't support OAuth, you can specify a token:

```bash
npx -y @gleanwork/configure-mcp-server remote --url https://your-instance-be.glean.com/mcp/default --client cursor --token your-api-token
```

### Local MCP Server

For local server installations, specify both token and instance:

```bash
npx -y @gleanwork/configure-mcp-server local --client cursor --token your-api-token --instance instance-name
```

You can also use an environment file:

```bash
npx -y @gleanwork/configure-mcp-server local --client cursor --env path/to/.env.glean
```

The environment file should contain:

```bash
GLEAN_INSTANCE=instance-name
GLEAN_API_TOKEN=your-api-token
```

Note: For backward compatibility, `GLEAN_SUBDOMAIN` is still supported, but `GLEAN_INSTANCE` is preferred.

### Post-Configuration Steps

- **Cursor**: Restart Cursor and the agent will have access to Glean tools
- **Claude Desktop**: Restart Claude and use the hammer icon to access Glean tools
- **Windsurf**: Open Settings > Advanced Settings, scroll to Cascade section, and press refresh
- **Goose**: Restart Goose to load the new configuration

## Project Initialization

You can initialize project-level tools and prompts for enhanced development experience:

```bash
# Initialize Cursor rules
npx -y @gleanwork/configure-mcp-server init --client cursor

# Initialize Claude Code agents
npx -y @gleanwork/configure-mcp-server init --client claude-code

# Create AGENTS.md file
npx -y @gleanwork/configure-mcp-server init --agents

# Preview files without creating them
npx -y @gleanwork/configure-mcp-server init --client cursor --dryRun
```

This creates client-specific files:

- **Cursor**: `.cursor/rules/glean-mcp.mdc` - Usage rules and examples
- **Claude Code**: `.claude/agents/*.md` - AI agents for enhanced development
- **AGENTS.md**: Project-level documentation following the agents.md standard

### Server Name Configuration

By default, the CLI uses `glean_default` as the server name in generated templates. If your Glean MCP server is configured with a different name, you can specify it using the `--server-name` flag:

```bash
# Use custom server name with Cursor
npx -y @gleanwork/configure-mcp-server init --client cursor --server-name my_company_glean

# Use custom server name with Claude Code
npx -y @gleanwork/configure-mcp-server init --client claude-code --server-name enterprise_glean

# Combine with other options
npx -y @gleanwork/configure-mcp-server init --client cursor --agents --server-name acme_glean
```

This ensures that all generated prompts and configurations reference the correct server name for your MCP setup. The server name must match the name you used when configuring your MCP server connection.

## Contributing

Please see [CONTRIBUTING.md](https://github.com/gleanwork/configure-mcp-server/blob/main/CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Support

- Documentation: [docs.glean.com](https://docs.glean.com)
- Issues: [GitHub Issues](https://github.com/gleanwork/configure-mcp-server/issues)
- Email: [support@glean.com](mailto:support@glean.com)
