// @/app/(app)/testes/page.tsx
import { getTestes } from "../clientes/actions";
import { getPlans } from "@/app/(app)/planos/actions";
import { getServers } from "@/app/(app)/servidores/actions";
import { TestesTable } from "./table";

export const dynamic = 'force-dynamic';

export default async function TestesPage() {
  const [testCustomers, allPlans, allServers] = await Promise.all([
      getTestes(),
      getPlans(),
      getServers()
  ]);

  return (
    <TestesTable 
        customers={testCustomers}
        allPlans={allPlans}
        allServers={allServers}
    />
  );
}

