import { Server } from './lib/types';

console.log('Import test successful');

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