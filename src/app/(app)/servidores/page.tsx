// @/app/(app)/servidores/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServers } from "./actions";
import { ServersTable } from "./servers-table";
import { NATVCreditsDisplay } from "@/components/integrations/natv-credits-display";
import { IntegrationMetrics } from "@/components/integrations/integration-metrics";

export const dynamic = 'force-dynamic';

export default async function ServidoresPage() {
  const servers = await getServers();

  return (
    <div className="space-y-6">
      {/* Área de Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NATVCreditsDisplay />
        <IntegrationMetrics />
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciamento de Servidores</CardTitle>
              <CardDescription>
                Adicione e gerencie seus servidores de IPTV. Ative automações para otimizar seu fluxo de trabalho.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ServersTable initialServers={servers} />
        </CardContent>
      </Card>
    </div>
  );
}
