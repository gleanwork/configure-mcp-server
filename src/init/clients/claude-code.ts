/**
 * Claude Code client handler for Glean MCP project initialization
 */

import path from 'path';
import type { InitFile } from '../../types/index.js';
import { loadTemplate, TemplateName } from '../templates/index.js';

/**
 * Generate Claude Code-specific project files
 */
export async function generateClaudeCodeFiles(): Promise<InitFile[]> {
  // Load all templates in parallel for better performance
  const templateResults = await Promise.allSettled([
    loadTemplate(TemplateName.CLAUDE_SEARCH_COMMAND),
    loadTemplate(TemplateName.CLAUDE_CHAT_COMMAND),
    loadTemplate(TemplateName.CLAUDE_READ_DOCUMENT_COMMAND),
    loadTemplate(TemplateName.CLAUDE_CODE_SEARCH_COMMAND),
    loadTemplate(TemplateName.CLAUDE_AGENT),
  ]);

  // Process all results in a single iteration
  const templateNames = [
    'CLAUDE_SEARCH_COMMAND',
    'CLAUDE_CHAT_COMMAND',
    'CLAUDE_READ_DOCUMENT_COMMAND',
    'CLAUDE_CODE_SEARCH_COMMAND',
    'CLAUDE_AGENT',
  ];

  const successfulTemplates: string[] = [];
  const failedTemplates: string[] = [];
  const errors: string[] = [];

  templateResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulTemplates.push(result.value);
    } else {
      failedTemplates.push(templateNames[index]);
      errors.push(result.reason);
    }
  });

  if (failedTemplates.length > 0) {
    throw new Error(
      `Failed to load templates: ${failedTemplates.join(', ')}. Errors: ${errors.join('; ')}`,
    );
  }

  // Extract successful results (guaranteed to have all 5 if we reach here)
  const [
    searchTemplate,
    chatTemplate,
    readTemplate,
    codeSearchTemplate,
    agentTemplate,
  ] = successfulTemplates;

  return [
    {
      path: path.join('.claude', 'commands', 'glean_search.md'),
      content: searchTemplate,
    },
    {
      path: path.join('.claude', 'commands', 'glean_chat.md'),
      content: chatTemplate,
    },
    {
      path: path.join('.claude', 'commands', 'glean_read_document.md'),
      content: readTemplate,
    },
    {
      path: path.join('.claude', 'commands', 'glean_code_search.md'),
      content: codeSearchTemplate,
    },
    {
      path: path.join('.claude', 'agents', 'glean-expert.md'),
      content: agentTemplate,
    },
  ];
}
