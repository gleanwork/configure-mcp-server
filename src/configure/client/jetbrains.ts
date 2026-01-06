/**
 * JetBrains MCP Client Implementation
 *
 * https://plugins.jetbrains.com/docs/intellij/model-context-protocol.html
 */

import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config';

const jetbrainsClient = createBaseClient(CLIENT.JETBRAINS, [
  'Restart your JetBrains IDE',
  'Agent will now have access to Glean tools',
  "You'll be asked for approval when Agent uses these tools",
]);

export default jetbrainsClient;
