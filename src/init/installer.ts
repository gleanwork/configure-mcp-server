/**
 * Core installer logic for Glean MCP project initialization
 */

import fs from 'fs';
import path from 'path';
import {
  generateCursorFiles,
  generateClaudeCodeFiles,
  type InitFile,
} from './clients/index.js';
import { AGENTS_MD_TEMPLATE } from './templates/index.js';

export interface InitOptions {
  client?: string;
  agentsMd?: boolean;
  dryRun?: boolean;
}

/**
 * Initialize Glean MCP project files
 */
export async function initializeProject(options: InitOptions): Promise<void> {
  const filesToCreate: Array<InitFile> = [];

  // Add client-specific files
  if (options.client) {
    switch (options.client.toLowerCase()) {
      case 'cursor':
        filesToCreate.push(...generateCursorFiles());
        break;
      case 'claude-code':
        filesToCreate.push(...generateClaudeCodeFiles());
        break;
      default:
        throw new Error(`Unsupported client: ${options.client}`);
    }
  }

  // Add AGENTS.md if requested
  if (options.agentsMd) {
    filesToCreate.push({
      path: 'AGENTS.md',
      content: AGENTS_MD_TEMPLATE,
    });
  }

  // Validate we have something to do
  if (filesToCreate.length === 0) {
    throw new Error(
      'Must specify --client <name> or --agents-md (or both)',
    );
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
    const fullPath = path.resolve(file.path);
    const dir = path.dirname(fullPath);

    // Check if file already exists
    if (fs.existsSync(fullPath)) {
      console.log(`Skipping ${file.path} (already exists)`);
      skippedCount++;
      continue;
    }

    // Create directory if needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(fullPath, file.content, 'utf-8');
    console.log(`Created ${file.path}`);
    createdCount++;
  }

  // Summary
  console.log(`\nInitialization complete:`);
  console.log(`  Created: ${createdCount} files`);
  if (skippedCount > 0) {
    console.log(`  Skipped: ${skippedCount} files (already exist)`);
  }
}
