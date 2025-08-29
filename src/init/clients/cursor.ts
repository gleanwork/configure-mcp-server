/**
 * Cursor client handler for Glean MCP project initialization
 */

import path from 'path';
import type { InitFile } from '../../types/index.js';
import { loadTemplate, TemplateName } from '../templates/index.js';

/**
 * Generate Cursor-specific project files
 */
export async function generateCursorFiles(): Promise<Array<InitFile>> {
  return [
    {
      path: path.join('.cursor', 'rules', 'glean-mcp.mdc'),
      content: await loadTemplate(TemplateName.CURSOR_RULE),
    },
  ];
}
