# @gleanwork/connect-mcp-server

Connect an MCP client to Glean's remote MCP servers for tools and agents.

This is a fork of the excellent [mcp-remote](https://github.com/geelen/mcp-remote) that provides OAuth support with discovery fallback to `openid-configuration`.  For more details see [this issue](https://github.com/modelcontextprotocol/typescript-sdk/issues/616).

> **Note**
> Glean's remote MCP is currently in private beta and is not yet generally available to all customers.

## Development

### Release Process

This package uses [release-it](https://github.com/release-it/release-it) to manage releases. To release a new version:

1. Make sure you have the `GITHUB_AUTH` environment variable set with a GitHub token that has repo access
2. Run `npm run release` or `pnpm release`
3. Follow the interactive prompts to select the version and confirm the release

The release process will:
- Run checks and tests
- Build the package
- Update the version in package.json
- Create a git tag
- Push to GitHub
- Create a GitHub release
- Publish to npm
