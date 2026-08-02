---
name: configure-mcp-server
description: Use the configure-mcp-server CLI to set up a developer's MCP client (Cursor, Claude Code/Desktop, VS Code, Windsurf, Goose) to connect to Glean's MCP server — remote (OAuth/DCR, recommended) or local. Load when configuring Glean MCP in an editor or scripting that setup.
---

# configure-mcp-server

A command-line utility that writes the config a given MCP client needs to connect to Glean's MCP server. It handles the per-client config file format and location, and the Glean-specific server entry, so a user doesn't hand-edit those files.

## When to use

Load this skill when configuring an MCP client to talk to Glean — e.g. "set up Cursor (or Claude Code/Desktop, VS Code, Windsurf, Goose) to use the Glean MCP server" — or when initializing project-level AI-tool files. This is **single-user, interactive** setup (run by the developer for their own machine); fleet-wide provisioning across all users on managed devices is `glean-mdm`, not this.

## Install & import

No install needed — it's a CLI, run via npx:

```bash
npx -y @gleanwork/configure-mcp-server <command> [flags]
```

The set of supported clients and their per-client config-file paths comes from the `@gleanwork/mcp-config` registry, not from flags you invent.

## Authoritative API

The command surface is the source of truth. Read it rather than guessing flags or client names:

- `npx @gleanwork/configure-mcp-server --help` and each subcommand's `--help` (`remote`, `local`, `init`)
- the commander definitions in `src/index.ts` and the option/validation types in `src/configure/`
- the supported-client list and config paths in `@gleanwork/mcp-config`

Don't transcribe the flag list — check `--help`.

## Usage patterns

- **Prefer `remote` with OAuth/DCR.** `remote --url <glean-mcp-url> --client <client>` is the recommended path and needs no token — Dynamic Client Registration handles auth. Only pass `--token` for clients that don't support OAuth (a user-scoped Client API token with the `MCP` scope).
- **`local` is experimental.** It configures a local `@gleanwork/local-mcp-server` over stdio and needs credentials: `--token` plus `--server-url` (or an `--env <file>` with `GLEAN_SERVER_URL` / `GLEAN_API_TOKEN`).
- **Use `--server-url`, not `--instance`.** `--instance` / `GLEAN_INSTANCE` / `GLEAN_SUBDOMAIN` are deprecated in favor of the full `GLEAN_SERVER_URL`.
- **Pick a supported client name** (`cursor`, `claude-code`, `claude-desktop`, `vscode`, `windsurf`, `goose`); `claude` is an alias for `claude-desktop`. Config merging only touches Glean-related server entries, preserving the rest.
- **Restart the client after configuring** (Cursor/Claude/Goose) or refresh it (Windsurf) before the Glean tools appear.
- **`init`** writes project-level files for AI coding tools (e.g. Cursor rules, a Claude Code agent) and can create an `AGENTS.md`.

## Common mistakes

- **Reaching for `local` when `remote` is the recommended path** — remote + OAuth/DCR is primary and token-free; local is experimental.
- **Assuming `remote` needs a `--token`** — it doesn't with OAuth/DCR; only supply one for non-OAuth clients.
- **Using `--instance` / `GLEAN_INSTANCE`** — deprecated; use `--server-url` / `GLEAN_SERVER_URL`.
- **Inventing client names** — use the supported set from `@gleanwork/mcp-config`.
- **Expecting tools to appear without restarting/refreshing the client** after configuration.

## Version notes

Check the installed version with `npx @gleanwork/configure-mcp-server --version` (or `npm ls @gleanwork/configure-mcp-server`). Remote (OAuth/DCR) is the primary, GA path; local is experimental. The CLI framework moved from meow to commander in v2.0.0 — consult `CHANGELOG.md` for breaking changes after an upgrade rather than trusting older flag examples.
