/**
 * Core installer logic for Glean MCP project initialization
 */

import fs from 'fs/promises';
import path from 'path';
import {
  generateCursorFiles,
  generateClaudeCodeFiles,
  type InitFile,
} from './clients/index.js';
import { loadTemplate, TemplateName } from './templates/index.js';

export interface InitOptions {
  client?: string;
  agentsMd?: boolean;
  dryRun?: boolean;
  serverName?: string;
}

/**
 * Get client-specific files for the given client
 */
async function getClientFiles(
  client: string,
  serverName: string,
): Promise<InitFile[]> {
  const clientLower = client.toLowerCase();
  if (clientLower === 'cursor') {
    return await generateCursorFiles(serverName);
  }
  if (clientLower === 'claude-code') {
    return await generateClaudeCodeFiles(serverName);
  }
  throw new Error(`Unsupported client: ${client}`);
}

/**
 * Initialize Glean MCP project files
 */
export async function initializeProject(options: InitOptions): Promise<void> {
  const filesToCreate: InitFile[] = [];
  const serverName = options.serverName || 'glean_default';

  // Add client-specific files
  if (options.client) {
    filesToCreate.push(...(await getClientFiles(options.client, serverName)));
  }

  // Add AGENTS.md if requested
  if (options.agentsMd) {
    filesToCreate.push({
      path: 'AGENTS.md',
      content: await loadTemplate(TemplateName.AGENTS_MD, { serverName }),
    });
  }

  // Validate we have something to do
  if (filesToCreate.length === 0) {
    throw new Error('Must specify --client <name> or --agents-md (or both)');
  }

  if (options.dryRun) {
    console.log('Files that would be created:');
    for (const file of filesToCreate) {
      console.log(`  ${file.path}`);
    }
    return;
  }

  // Create the files
  let createdCount = 0;
  let skippedCount = 0;

  for (const file of filesToCreate) {
    try {
      const fullPath = path.resolve(file.path);
      const dir = path.dirname(fullPath);

      // Check if file already exists
      let fileExists = false;
      try {
        await fs.access(fullPath);
        fileExists = true;
      } catch {
        // File doesn't exist, we can proceed to create it
        fileExists = false;
      }

      if (fileExists) {
        console.log(`Skipping ${file.path} (already exists)`);
        skippedCount++;
        continue;
      }

      // Create directory if needed
      await fs.mkdir(dir, { recursive: true });

      // Write the file
      await fs.writeFile(fullPath, file.content, 'utf-8');
      console.log(`Created ${file.path}`);
      createdCount++;
    } catch (error) {
      console.error(`Error creating ${file.path}:`, error);
      throw error;
    }
  }

  // Summary
  console.log(`\nInitialization complete:`);
  console.log(`  Created: ${createdCount} files`);
  if (skippedCount > 0) {
    console.log(`  Skipped: ${skippedCount} files (already exist)`);
  }
}
