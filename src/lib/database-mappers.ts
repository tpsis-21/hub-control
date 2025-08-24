// Utilitários para mapear dados entre o banco (snake_case) e o frontend (camelCase)

import type { Client, Plan, Settings } from './types';
import type { Database } from './database.types';

type DatabaseClient = Database['public']['Tables']['clients']['Row'];
type DatabasePlan = Database['public']['Tables']['plans']['Row'];
type DatabaseSettings = Database['public']['Tables']['settings']['Row'];
type DatabaseNotification = Database['public']['Tables']['notifications']['Row'];
type DatabasePayment = Database['public']['Tables']['payments']['Row'];

/**
 * Mapeia dados do banco (snake_case) para o frontend (camelCase)
 */
export function mapDatabaseClientToClient(dbClient: DatabaseClient): Client {
  return {
    id: dbClient.id,
    name: dbClient.name,
    iptvUsername: dbClient.iptv_username,
    iptvUserId: dbClient.iptv_user_id || undefined,
    iptvPassword: dbClient.iptv_password || undefined,
    managerId: dbClient.manager_id || undefined,
    email: dbClient.email || undefined,
    whatsapp: dbClient.whatsapp || undefined,
    startDate: dbClient.start_date,
    expirationDate: dbClient.expiration_date,
    status: dbClient.status,
    planId: dbClient.plan_id,
    serverId: dbClient.server_id || undefined,
    notes: dbClient.notes || undefined,
    paymentHistory: Array.isArray(dbClient.payment_history) ? dbClient.payment_history : [],
    uniqueLink: dbClient.unique_link || undefined,
  };
}

/**
 * Mapeia dados do frontend (camelCase) para o banco (snake_case)
 */
export function mapClientToDatabaseClient(client: Omit<Client, 'id'>): Omit<DatabaseClient, 'id'> {
  return {
    name: client.name,
    iptv_username: client.iptvUsername || '',
    iptv_user_id: client.iptvUserId || null,
    iptv_password: client.iptvPassword || null,
    manager_id: client.managerId || null,
    email: client.email || null,
    whatsapp: client.whatsapp || null,
    start_date: client.startDate,
    expiration_date: client.expirationDate,
    status: client.status,
    plan_id: client.planId,
    server_id: client.serverId || null,
    notes: client.notes || null,
    payment_history: client.paymentHistory || [],
    unique_link: client.uniqueLink || null,
    created_at: client.created_at || new Date().toISOString(),
    updated_at: client.updated_at || new Date().toISOString(),
  };
}

/**
 * Mapeia dados de atualização do frontend para o banco
 */
export function mapClientUpdateToDatabaseUpdate(update: Partial<Client>): Partial<DatabaseClient> {
  const mapped: Partial<DatabaseClient> = {};
  
  if (update.name !== undefined) mapped.name = update.name;
  if (update.iptvUsername !== undefined) mapped.iptv_username = update.iptvUsername;
  if (update.iptvUserId !== undefined) mapped.iptv_user_id = update.iptvUserId || null;
  if (update.iptvPassword !== undefined) mapped.iptv_password = update.iptvPassword || null;
  if (update.managerId !== undefined) mapped.manager_id = update.managerId || null;
  if (update.email !== undefined) mapped.email = update.email || null;
  if (update.whatsapp !== undefined) mapped.whatsapp = update.whatsapp || null;
  if (update.startDate !== undefined) mapped.start_date = update.startDate;
  if (update.expirationDate !== undefined) mapped.expiration_date = update.expirationDate;
  if (update.status !== undefined) mapped.status = update.status;
  if (update.planId !== undefined) mapped.plan_id = update.planId;
  if (update.serverId !== undefined) mapped.server_id = update.serverId || null;
  if (update.notes !== undefined) mapped.notes = update.notes || null;
  if (update.paymentHistory !== undefined) mapped.payment_history = update.paymentHistory;
  if (update.uniqueLink !== undefined) mapped.unique_link = update.uniqueLink;
  
  return mapped;
}