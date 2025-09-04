/**
 * Claude Code client handler for Glean MCP project initialization
 */

import path from 'path';
import type { InitFile } from '../../types/index.js';
import { loadTemplate, TemplateName } from '../templates/index.js';

/**
 * Generate Claude Code-specific project files
 */
export async function generateClaudeCodeFiles(
  serverName = 'glean_default',
): Promise<InitFile[]> {
  const variables = { serverName };

  return [
    {
      path: path.join('.claude', 'agents', 'glean-expert.md'),
      content: await loadTemplate(TemplateName.CLAUDE_AGENT, variables),
    },
  ];
}
