/**
 * Junie (JetBrains Agent) MCP Client Implementation
 *
 * https://www.jetbrains.com/help/junie/getting-started.html
 */

import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config';

const junieClient = createBaseClient(CLIENT.JUNIE, [
  'Restart Junie',
  'Agent will now have access to Glean tools',
  "You'll be asked for approval when Agent uses these tools",
]);

export default junieClient;
