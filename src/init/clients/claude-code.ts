/**
 * Claude Code client handler for Glean MCP project initialization
 */

import path from 'path';
import {
  CLAUDE_SEARCH_COMMAND_TEMPLATE,
  CLAUDE_CHAT_COMMAND_TEMPLATE,
  CLAUDE_READ_DOCUMENT_COMMAND_TEMPLATE,
  CLAUDE_CODE_SEARCH_COMMAND_TEMPLATE,
  CLAUDE_AGENT_TEMPLATE,
} from '../templates/index.js';

export interface InitFile {
  path: string;
  content: string;
}

/**
 * Generate Claude Code-specific project files
 */
export function generateClaudeCodeFiles(): Array<InitFile> {
  return [
    {
      path: path.join('.claude', 'commands', 'glean_search.md'),
      content: CLAUDE_SEARCH_COMMAND_TEMPLATE,
    },
    {
      path: path.join('.claude', 'commands', 'glean_chat.md'),
      content: CLAUDE_CHAT_COMMAND_TEMPLATE,
    },
    {
      path: path.join('.claude', 'commands', 'glean_read_document.md'),
      content: CLAUDE_READ_DOCUMENT_COMMAND_TEMPLATE,
    },
    {
      path: path.join('.claude', 'commands', 'glean_code_search.md'),
      content: CLAUDE_CODE_SEARCH_COMMAND_TEMPLATE,
    },
    {
      path: path.join('.claude', 'agents', 'glean-expert.md'),
      content: CLAUDE_AGENT_TEMPLATE,
    },
  ];
}
