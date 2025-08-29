/**
 * Template loading utilities for Glean MCP project initialization
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Available template names for loading from markdown files
 */
export enum TemplateName {
  CURSOR_RULE = 'cursor/glean-mcp-rule',
  CLAUDE_SEARCH_COMMAND = 'claude/commands/search',
  CLAUDE_CHAT_COMMAND = 'claude/commands/chat',
  CLAUDE_READ_DOCUMENT_COMMAND = 'claude/commands/read-document',
  CLAUDE_CODE_SEARCH_COMMAND = 'claude/commands/code-search',
  CLAUDE_AGENT = 'claude/agents/glean-expert',
  AGENTS_MD = 'project/agents',
}

/**
 * Template variables for substitution
 */
export interface TemplateVariables {
  serverName: string;
  // Future: agentName, orgHint, year, etc.
}

/**
 * Cache for loaded raw templates to avoid repeated file reads
 */
const templateCache = new Map<TemplateName, string>();

/**
 * Load a raw template from markdown file without variable substitution
 */
async function loadRawTemplate(name: TemplateName): Promise<string> {
  // Check cache first
  if (templateCache.has(name)) {
    return templateCache.get(name)!;
  }

  try {
    const templatePath = path.join(__dirname, 'markdown', `${name}.md`);
    const content = await fs.readFile(templatePath, 'utf-8');

    // Cache the result
    templateCache.set(name, content);

    return content;
  } catch (error) {
    throw new Error(
      `Failed to load template '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Substitute variables in template content
 */
function substituteVariables(
  content: string,
  variables?: TemplateVariables,
): string {
  if (!variables) return content;

  return content.replace(/\{\{SERVER_NAME\}\}/g, variables.serverName);
  // Add more substitutions as needed
}

/**
 * Load a template from markdown file with optional variable substitution
 */
export async function loadTemplate(
  name: TemplateName,
  variables?: TemplateVariables,
): Promise<string> {
  const rawContent = await loadRawTemplate(name);
  return substituteVariables(rawContent, variables);
}

/**
 * Legacy function for backward compatibility - uses default server name
 */
export async function loadTemplateWithDefaults(
  name: TemplateName,
): Promise<string> {
  return loadTemplate(name, { serverName: 'glean_default' });
}
