// @/app/(app)/planos/grupos/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanGroupList } from "./plan-group-list";
import { getPlanGroups, getPlans } from "../actions";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Garantir que os dados sejam sempre buscados do servidor

export default async function PlanosGruposPage() {
    const [planGroups, plans] = await Promise.all([
        getPlanGroups(),
        getPlans(),
    ]);

    return (
                <Card>
                    <CardHeader>
                        <CardTitle>Gerenciar Grupos de Planos</CardTitle>
                        <CardDescription>
                            Agrupe planos para organizá-los na área do cliente. Um cliente verá apenas os planos do grupo ao qual pertence para renovação.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PlanGroupList initialGroups={planGroups} initialPlans={plans}/>
                    </CardContent>
                </Card>
    );
}

