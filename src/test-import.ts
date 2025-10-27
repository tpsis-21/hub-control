import { Server } from './lib/types';
import { logger } from '@/utils/production-logger'

logger.debug('Import test successful', undefined, "DEBUG");

export const testServer: Server = {
  id: 'test',
  name: 'Test Server',
  status: 'Online',
  integrationType: 'none',
  testAutomation: false,
  renewalAutomation: false,
  paymentGateway: false,
  sendExpirationReminder: false,
  sendUsageInstructions: false
};
