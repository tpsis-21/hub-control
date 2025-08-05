// @/app/(app)/dashboard/page.tsx
import { getClientes } from "@/app/(app)/clientes/actions";
import { getPlans } from "@/app/(app)/planos/actions";
import { getServers } from "@/app/(app)/servidores/actions";
import { DashboardContent } from "./dashboard-content";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // 1. Fetch all data on the server
  const [allClients, allPlans, allServers] = await Promise.all([
    getClientes({}),
    getPlans(),
    getServers(),
  ]);

  return (
    <DashboardContent 
        clients={allClients} 
        plans={allPlans}
        servers={allServers}
    />
  );
}