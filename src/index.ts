#!/usr/bin/env node

import { Command } from 'commander';
import {
  configure,
  listSupportedClients,
  validateFlags,
} from './configure/index.js';
import { availableClients } from './configure/client/index.js';
import { initializeProject } from './init/index.js';
import { Logger, trace, LogLevel } from '@gleanwork/mcp-server-utils/logger';
import { VERSION } from './common/version.js';
import { checkAndOpenLaunchWarning } from '@gleanwork/mcp-server-utils/util';

async function getClientList(): Promise<string> {
  const clients = Object.entries(availableClients);
  if (clients.length === 0) {
    return 'No clients available';
  }
  const longestName = Math.max(...clients.map(([key]) => key.length));
  return clients
    .map(([key, config]) => `  ${key.padEnd(longestName + 2)} ${config.displayName}`)
    .join('\n');
}

async function main() {
  await checkAndOpenLaunchWarning(VERSION);

  const clientList = Object.keys(availableClients).join(', ');
  const clientListFormatted = await getClientList();

  const program = new Command();

  program
    .name('configure-mcp-server')
    .description('Configure popular MCP clients to add Glean as an MCP server')
    .version(VERSION, '-v, --version', 'Output the current version')
    .addHelpText(
      'after',
      `
Available MCP Clients:
${clientListFormatted}

Available MCP Servers:
  local     Glean's local MCP server with access to common tools (search, chat, read_documents, etc.)
  remote    Glean's remote MCP servers hosted in your Glean instance
`,
    );

  program
    .command('local')
    .description("Configure Glean's local MCP server for a given client")
    .option('-c, --client <client>', `MCP client to configure (${clientList})`)
    .option('-i, --instance <instance>', 'Glean instance name')
    .option('-t, --token <token>', 'Glean API token (required)')
    .option(
      '-e, --env <path>',
      'Path to .env file containing GLEAN_INSTANCE and GLEAN_API_TOKEN',
    )
    .option(
      '--workspace',
      'Create workspace configuration instead of global (VS Code only)',
    )
    .option('--trace', 'Enable trace logging')
    .action(async (options) => {
      if (options.trace) {
        Logger.getInstance().setLogLevel(LogLevel.TRACE);
      }

      trace(process.title, `ppid/pid: [${process.ppid} / ${process.pid}]`);
      trace(process.execPath, process.execArgv, process.argv);

      const { client, token, instance, env, workspace } = options;

      if (workspace && client && client !== 'vscode') {
        console.error(
          'Error: --workspace option is only available for VS Code client',
        );
        process.exit(1);
      }

      if (!(await validateFlags(client, token, instance, undefined, env))) {
        process.exit(1);
      }

      try {
        await configure(client, {
          token,
          instance,
          envPath: env,
          workspace,
        });
      } catch (error: any) {
        console.error(`Configuration failed: ${error.message}`);
        process.exit(1);
      }
    });

  program
    .command('remote')
    .description("Configure Glean's remote MCP server for a given client")
    .option('-c, --client <client>', `MCP client to configure (${clientList})`)
    .option(
      '-u, --url <url>',
      'Full MCP server URL (required, e.g., https://my-be.glean.com/mcp/default)',
    )
    .option(
      '-t, --token <token>',
      'Glean API token (optional, OAuth will be used if not provided)',
    )
    .option(
      '-e, --env <path>',
      'Path to .env file containing GLEAN_URL and optionally GLEAN_API_TOKEN',
    )
    .option(
      '--workspace',
      'Create workspace configuration instead of global (VS Code only)',
    )
    .option('--trace', 'Enable trace logging')
    .action(async (options) => {
      if (options.trace) {
        Logger.getInstance().setLogLevel(LogLevel.TRACE);
      }

      trace(process.title, `ppid/pid: [${process.ppid} / ${process.pid}]`);
      trace(process.execPath, process.execArgv, process.argv);

      const { client, token, url, env, workspace } = options;

      if (workspace && client && client !== 'vscode') {
        console.error(
          'Error: --workspace option is only available for VS Code client',
        );
        process.exit(1);
      }

      if (!(await validateFlags(client, token, undefined, url, env))) {
        process.exit(1);
      }

      try {
        await configure(client, {
          token,
          url,
          envPath: env,
          remote: true,
          workspace,
        });
      } catch (error: any) {
        console.error(`Configuration failed: ${error.message}`);
        process.exit(1);
      }
    });

  program
    .command('init')
    .description(
      'Initialize Glean MCP project tools for enhanced development experience',
    )
    .option(
      '-c, --client <client>',
      'MCP client to create project files for (cursor, claude-code)',
    )
    .option('--agents', 'Create AGENTS.md file with Glean MCP instructions')
    .option(
      '--server-name <name>',
      'Server name to use in templates',
      'glean_default',
    )
    .option(
      '--dryRun',
      'Show what files would be created without creating them',
    )
    .action(async (options) => {
      const { client, agents, dryRun, serverName } = options;

      try {
        await initializeProject({
          client,
          agentsMd: Boolean(agents),
          dryRun: Boolean(dryRun),
          serverName: serverName || 'glean_default',
        });
      } catch (error: any) {
        console.error(`Initialization failed: ${error.message}`);
        process.exit(1);
      }
    });

  program
    .command('help')
    .description('Show detailed help including supported clients')
    .action(async () => {
      program.help();
      await listSupportedClients();
    });

  Logger.getInstance().setLogLevel(LogLevel.INFO);

  await program.parseAsync(process.argv);

  if (!process.argv.slice(2).length) {
    program.help();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
