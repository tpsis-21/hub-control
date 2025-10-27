// @/app/(app)/planos/page.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPlanForm } from "./add-plan-form";
import { getPlans, getPlanGroups } from "./actions";
import { PlanList } from "./plan-list";
import type { Plan, PlanGroup } from "@/lib/types";

export const dynamic = 'force-dynamic';
// Removido revalidate para garantir dados sempre atualizados

export default async function PlanosPage() {
  const [plans, planGroups]: [Plan[], PlanGroup[]] = await Promise.all([
    getPlans(),
    getPlanGroups()
  ]);

  const plansWithoutGroup = plans.filter(p => !p.group_id);
  
  return (
    <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Planos Individuais</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os seus planos de assinatura. Eles podem ser organizados em grupos.
                </CardDescription>
              </div>
              <AddPlanForm planGroups={planGroups}/>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
              {planGroups.map((group) => {
                  const groupedPlans = plans.filter(p => p.group_id === group.id);
                  if (groupedPlans.length === 0) return null;

                  return (
                      <div key={group.id}>
                          <h3 className="text-lg font-semibold mb-2">{group.name}</h3>
                          {group.description && <p className="text-sm text-muted-foreground mb-4">{group.description}</p>}
                          <PlanList plans={groupedPlans} planGroups={planGroups} />
                      </div>
                  );
              })}

              {plansWithoutGroup.length > 0 && (
                   <div>
                        <h3 className="text-lg font-semibold mb-2 mt-6">Planos Sem Grupo</h3>
                        <PlanList plans={plansWithoutGroup} planGroups={planGroups}/>
                    </div>
              )}

              {(plans.length === 0) && (
                <div className="text-center p-8 text-muted-foreground border rounded-lg">
                  Nenhum plano encontrado. Clique em &quot;Adicionar Plano&quot; para começar.
                </div>
              )}

          </CardContent>
        </Card>
    </div>
  );
}

