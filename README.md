# @gleanwork/configure-mcp-server

![CI Build](https://github.com/gleanwork/configure-mcp-server/actions/workflows/ci.yml/badge.svg)
[![npm version](https://badge.fury.io/js/@gleanwork%2Fconfigure-mcp-server.svg)](https://badge.fury.io/js/@gleanwork%2Fconfigure-mcp-server)
[![License](https://img.shields.io/npm/l/@gleanwork%2Fconfigure-mcp-server.svg)](https://github.com/gleanwork/configure-mcp-server/blob/main/LICENSE)

This package is for configuring popular MCP clients to connect to Glean's API using [@gleanwork/local-mcp-server](https://github.com/gleanwork/configure-mcp-server/tree/main/packages/local-mcp-server).

## Configuration

### API Tokens

You'll need Glean [API credentials](https://developers.glean.com/client/authentication#glean-issued-tokens), and specifically a [user-scoped API token](https://developers.glean.com/client/authentication#user). API Tokens require the following scopes: `chat`, `search`. You should speak to your Glean administrator to provision these tokens.

### Configure Environment Variables

1. Set up your Glean API credentials:

   ```bash
   export GLEAN_INSTANCE=instance_name
   export GLEAN_API_TOKEN=your_api_token
   ```

   Note: For backward compatibility, `GLEAN_SUBDOMAIN` is still supported, but `GLEAN_INSTANCE` is preferred.

1. (Optional) For [global tokens](https://developers.glean.com/indexing/authentication/permissions#global-tokens) that support impersonation:

   ```bash
   export GLEAN_ACT_AS=user@example.com
   ```

## Client Configuration

You can specify your token and instance on the command line.

```bash
# Configure for Cursor
npx @gleanwork/configure-mcp-server --client cursor --token your_api_token --instance instance_name

# Configure for Claude Desktop
npx @gleanwork/configure-mcp-server --client claude --token your_api_token --instance instance_name

# Configure for VS Code
npx @gleanwork/configure-mcp-server --client vscode --token your_api_token --instance instance_name

# Configure for Windsurf
npx @gleanwork/configure-mcp-server --client windsurf --token your_api_token --instance instance_name

# Configure for Goose
npx @gleanwork/configure-mcp-server --client goose --token your_api_token --instance instance_name
```

Alternatively, you can use an environment file:

```bash
npx @gleanwork/configure-mcp-server --client cursor --env path/to/.env.glean
```

The environment file should contain:

```bash
GLEAN_INSTANCE=instance_name
GLEAN_API_TOKEN=your_api_token
```

After configuration:

- For Cursor: Restart Cursor and the agent will have access to Glean tools
- For Claude Desktop: Restart Claude and use the hammer icon to access Glean tools
- For Windsurf: Open Settings > Advanced Settings, scroll to Cascade section, and press refresh
- For Goose: Restart Goose to load the new configuration

## Project Initialization

You can initialize project-level tools and prompts for enhanced development experience:

```bash
# Initialize Cursor rules
npx @gleanwork/configure-mcp-server init --client cursor

# Initialize Claude Code agents
npx @gleanwork/configure-mcp-server init --client claude-code

# Create AGENTS.md file
npx @gleanwork/configure-mcp-server init --agents

# Preview files without creating them
npx @gleanwork/configure-mcp-server init --client cursor --dryRun
```

This creates client-specific files:

- **Cursor**: `.cursor/rules/glean-mcp.mdc` - Usage rules and examples
- **Claude Code**: `.claude/agents/*.md` - AI agents for enhanced development
- **AGENTS.md**: Project-level documentation following the agents.md standard

### Server Name Configuration

By default, the CLI uses `glean_default` as the server name in generated templates. If your Glean MCP server is configured with a different name, you can specify it using the `--server-name` flag:

```bash
# Use custom server name with Cursor
npx @gleanwork/configure-mcp-server init --client cursor --server-name my_company_glean

# Use custom server name with Claude Code
npx @gleanwork/configure-mcp-server init --client claude-code --server-name enterprise_glean

# Combine with other options
npx @gleanwork/configure-mcp-server init --client cursor --agents --server-name acme_glean
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
