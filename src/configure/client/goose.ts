import { createBaseClient } from './index.js';
import { CLIENT } from '@gleanwork/mcp-config';

const gooseClient = createBaseClient(CLIENT.GOOSE, ['Restart Goose']);



export default gooseClient;
