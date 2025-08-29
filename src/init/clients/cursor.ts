/**
 * Cursor client handler for Glean MCP project initialization
 */

import path from 'path';
import { CURSOR_RULE_TEMPLATE } from '../templates/index.js';

export interface InitFile {
  path: string;
  content: string;
}

/**
 * Generate Cursor-specific project files
 */
export function generateCursorFiles(): Array<InitFile> {
  return [
    {
      path: path.join('.cursor', 'rules', 'glean-mcp.mdc'),
      content: CURSOR_RULE_TEMPLATE,
    },
  ];
}
