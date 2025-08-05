// @/app/(app)/planos/grupos/plan-group-list.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Plan, PlanGroup } from "@/lib/types";
import { AddPlanGroupForm } from "./add-plan-group-form";
import { EditPlanGroupForm } from "./edit-plan-group-form";
import { DeletePlanGroupDialog } from "./delete-plan-group-dialog";


type PlanGroupListProps = {
    initialGroups: PlanGroup[];
    initialPlans: Plan[];
}

export function PlanGroupList({ initialGroups, initialPlans }: PlanGroupListProps) {
  const [groups, setGroups] = useState<PlanGroup[]>(initialGroups);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);

  // Sincronizar estado local com dados iniciais quando mudarem
  useEffect(() => {
    setGroups(initialGroups);
    setPlans(initialPlans);
  }, [initialGroups, initialPlans]);

  const handleGroupDeleted = (deletedGroupId: string) => {
    setGroups(prev => prev.filter(group => group.id !== deletedGroupId));
    // Atualizar planos para remover a referência ao grupo excluído
    setPlans(prev => prev.map(plan => 
      plan.groupId === deletedGroupId 
        ? { ...plan, groupId: undefined }
        : plan
    ));
  };

  const handleGroupAdded = (newGroup: PlanGroup) => {
    setGroups(prev => [...prev, newGroup]);
  };

  const handleGroupUpdated = (updatedGroup: PlanGroup) => {
    setGroups(prev => prev.map(group => 
      group.id === updatedGroup.id ? updatedGroup : group
    ));
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-end">
            <AddPlanGroupForm onGroupAdded={handleGroupAdded} />
        </div>
        
        {groups.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border rounded-lg">
                Nenhum grupo de planos cadastrado. Clique em &quot;Adicionar Grupo&quot; para começar.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => {
                    const groupPlans = plans.filter(p => p.groupId === group.id);
                    return (
                        <Card key={group.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{group.name}</CardTitle>
                                {group.description && (
                                    <CardDescription>
                                        {group.description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="flex-grow">
                            {groupPlans.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {groupPlans.map(p => (
                                            <Badge key={p.id} variant="secondary">{p.name}</Badge>
                                        ))}
                                    </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum plano associado a este grupo.</p>
                            )}
                            </CardContent>
                             <CardFooter className="border-t pt-4 justify-end gap-2">
                                <EditPlanGroupForm group={group} onGroupUpdated={handleGroupUpdated} />
                                <DeletePlanGroupDialog groupId={group.id} groupName={group.name} onGroupDeleted={handleGroupDeleted} />
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        )}
    </div>
  );
}
