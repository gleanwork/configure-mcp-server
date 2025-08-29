/**
 * Glean MCP Project Initialization Module
 * 
 * Handles creation of project-level files for enhanced AI coding experience
 */

import { VERSION } from '../common/version.js';

export { initializeProject } from './installer.js';
export type { InitOptions } from './installer.js';

/**
 * Display help information for the init command
 */
export function showInitHelp(): void {
  console.log(`
    Usage
      Configure Glean MCP project-level tools for enhanced development experience.

      $ npx @gleanwork/configure-mcp-server init [--client <client-name>] [--agents] [options]

    Commands
      init        Initialize Glean MCP project tools

    Options for init
      --client, -c    MCP client to create project files for (cursor, claude-code)
      --agents        Create AGENTS.md file with Glean MCP instructions
      --dryRun        Show what files would be created without creating them
      --help, -h      Show this help message

    Examples

      Initialize Cursor rules:
      npx @gleanwork/configure-mcp-server init --client cursor

      Initialize Claude Code commands and agents:
      npx @gleanwork/configure-mcp-server init --client claude-code

      Create only AGENTS.md:
      npx @gleanwork/configure-mcp-server init --agents

      Create both Cursor files and AGENTS.md:
      npx @gleanwork/configure-mcp-server init --client cursor --agents

      Preview what would be created for Claude Code:
      npx @gleanwork/configure-mcp-server init --client claude-code --dryRun

    Project Files Created

      For Cursor:
        .cursor/rules/glean-mcp.mdc              Glean MCP usage rule

      For Claude Code:
        .claude/commands/glean_search.md         Enterprise search command
        .claude/commands/glean_chat.md           Glean chat synthesis command
        .claude/commands/glean_read_document.md  Document reader command
        .claude/commands/glean_code_search.md    Code search command
        .claude/agents/glean-expert.md           Glean research agent

      For --agents:
        AGENTS.md                                Standard agent instructions file

    Note: This command creates project-level files in the current directory.
          Make sure to run 'configure-mcp-server remote' first to set up
          your MCP server connection at the host level.

    Version: v${VERSION}

`);
}
