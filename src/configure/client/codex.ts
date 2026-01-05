/**
 * Codex MCP Client Implementation
 *
 * https://codex.ai/docs/mcp
 */

import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config';

const codexClient = createBaseClient(CLIENT.CODEX, [
  'Restart Codex',
  'Agent will now have access to Glean tools',
  "You'll be asked for approval when Agent uses these tools",
]);

export default codexClient;
