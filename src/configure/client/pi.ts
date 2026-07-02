/**
 * Pi MCP Client Implementation
 *
 * https://github.com/nicobailon/pi-mcp-adapter
 */

import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config-glean';

const piClient = createBaseClient(CLIENT.PI, [
  'Restart Pi',
  'Agent will now have access to Glean tools via the MCP adapter',
]);

export default piClient;
