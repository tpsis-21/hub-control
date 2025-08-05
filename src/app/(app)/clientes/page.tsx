// @/app/(app)/clientes/page.tsx
import { getClientes } from "./actions";
import { getPlans } from "@/app/(app)/planos/actions";
import { getServers } from "@/app/(app)/servidores/actions";
import { ClientesTable } from "./table";

export const dynamic = 'force-dynamic';

export default async function ClientesPage({ searchParams }: any) {
    const params = await searchParams;
    const [filteredClients, allPlans, allServers] = await Promise.all([
        getClientes({
            q: typeof params?.q === 'string' ? params.q : undefined,
            status: params?.status,
            plan: params?.plan,
        }),
        getPlans(),
        getServers()
    ]);

    return (
        <ClientesTable 
            customers={filteredClients} 
            allPlans={allPlans}
            allServers={allServers}
        />
    );
}
