"use server";

import { createServerSupabaseClientForActions } from '@/lib/supabase/clients/server';
import { mapDatabaseClientToClient } from '@/lib/database-mappers';
import type { Client, Plan, Server } from '@/lib/types';
import { logger } from '@/utils/production-logger';

/** Colunas mínimas para métricas do dashboard (evita over-fetch de senhas/histórico) */
const DASHBOARD_CLIENT_COLUMNS =
  'id,name,status,start_date,expiration_date,plan_id,created_at,email,manager_id,iptv_username,unique_link';

const DASHBOARD_PLAN_COLUMNS =
  'id,name,price,group_id,panel_plan_id,validity,screens,is_public,price_before_discount,send_welcome_message,restrictions';

const DASHBOARD_SERVER_COLUMNS =
  'id,name,url,status,integration_type,test_automation,renewal_automation,payment_gateway,send_expiration_reminder,send_usage_instructions,test_config';

function mapPlanRow(plan: Record<string, unknown>): Plan {
  return {
    ...(plan as Plan),
    groupId: plan.group_id as string | undefined,
    panelPlanId: plan.panel_plan_id as string | undefined,
    priceBeforeDiscount: plan.price_before_discount as number | undefined,
    sendWelcomeMessage: plan.send_welcome_message as boolean | undefined,
    isPublic: plan.is_public as boolean | undefined,
    countingType: plan.counting_type as string | undefined,
  } as Plan;
}

function mapServerRow(server: Record<string, unknown>): Server {
  return {
    id: server.id as string,
    name: server.name as string,
    url: server.url as string,
    apiKey: server.api_key as string | undefined,
    status: server.status as Server['status'],
    integrationType: server.integration_type as string | undefined,
    testAutomation: server.test_automation as boolean | undefined,
    renewalAutomation: server.renewal_automation as boolean | undefined,
    paymentGateway: server.payment_gateway as boolean | undefined,
    sendExpirationReminder: server.send_expiration_reminder as boolean | undefined,
    sendUsageInstructions: server.send_usage_instructions as boolean | undefined,
    testConfig: server.test_config as Server['testConfig'],
    panelServerId: server.panel_server_id as string | undefined,
  } as Server;
}

export type DashboardPageData = {
  clients: Client[];
  tests: Client[];
  plans: Plan[];
  servers: Server[];
};

export async function getDashboardPageData(): Promise<DashboardPageData> {
  const supabase = await createServerSupabaseClientForActions();

  const [clientsRes, testsRes, plansRes, serversRes] = await Promise.all([
    supabase.from('clients').select(DASHBOARD_CLIENT_COLUMNS),
    supabase.from('clients').select(DASHBOARD_CLIENT_COLUMNS).eq('status', 'Em teste'),
    supabase.from('plans').select(DASHBOARD_PLAN_COLUMNS),
    supabase.from('servers').select(DASHBOARD_SERVER_COLUMNS),
  ]);

  if (clientsRes.error) {
    logger.error('Dashboard: erro ao buscar clientes', clientsRes.error.message);
  }
  if (testsRes.error) {
    logger.error('Dashboard: erro ao buscar testes', testsRes.error.message);
  }
  if (plansRes.error) {
    logger.error('Dashboard: erro ao buscar planos', plansRes.error.message);
  }
  if (serversRes.error) {
    logger.error('Dashboard: erro ao buscar servidores', serversRes.error.message);
  }

  const clients = (clientsRes.data || []).map((row) =>
    mapDatabaseClientToClient(row as Parameters<typeof mapDatabaseClientToClient>[0])
  );
  const tests = (testsRes.data || []).map((row) =>
    mapDatabaseClientToClient(row as Parameters<typeof mapDatabaseClientToClient>[0])
  );
  const plans = (plansRes.data || []).map(mapPlanRow);
  const servers = (serversRes.data || []).map(mapServerRow);

  return { clients, tests, plans, servers };
}
