import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config-schema';

const gooseClient = createBaseClient(CLIENT.GOOSE, ['Restart Goose']);



export default gooseClient;
