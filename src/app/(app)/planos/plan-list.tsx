// @/app/(app)/planos/plan-list.tsx
"use client";

import { MoreHorizontal, Eye, EyeOff, Copy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { EditPlanForm } from "./edit-plan-form";
import { deletePlanAction } from "./actions";
import { useTransition, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Plan, PlanGroup } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { TablePriceDisplay } from "@/components/ui/price-display";

function DeletePlanDialog({ planId, planName, onOpenChange }: { planId: string, planName: string, onOpenChange: (open: boolean) => void }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deletePlanAction(planId);
            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: "Plano excluído.",
                });
                onOpenChange(false);
            } else {
                toast({
                    title: "Erro ao Excluir",
                    description: result.error || "Não foi possível excluir o plano.",
                    variant: "destructive",
                });
            }
        });
    }

    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente o plano <span className="font-bold">{planName}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                    {isPending ? "Excluindo..." : "Confirmar Exclusão"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );
}

export function PlanList({ plans, planGroups }: { plans: Plan[], planGroups: PlanGroup[] }) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

    if (plans.length === 0) {
        return <p className="text-sm text-muted-foreground px-4 py-8 text-center">Nenhum plano para exibir.</p>;
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Telas</TableHead>
                        <TableHead>Público</TableHead>
                        <TableHead>
                            <span className="sr-only">Ações</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {plans.map((plan) => {
                        const handleCopyId = () => {
                            navigator.clipboard.writeText(plan.panelPlanId || '');
                            toast({
                                title: "ID copiado!",
                                description: `ID ${plan.panelPlanId} copiado para a área de transferência.`,
                            });
                        };

                        return (
                        <TableRow key={plan.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {plan.panelPlanId || 'N/A'}
                                    </Badge>
                                    {plan.panelPlanId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={handleCopyId}
                                            title="Copiar ID"
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell>
                                <TablePriceDisplay
                                    price={plan.price}
                                    priceBeforeDiscount={plan.priceBeforeDiscount}
                                />
                            </TableCell>
                            <TableCell>{plan.validity} dias</TableCell>
                            <TableCell>{plan.screens}</TableCell>
                            <TableCell>
                                {plan.isPublic ?
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Eye className="h-4 w-4 mr-1.5" /> Visível</Badge> :
                                    <Badge variant="outline"><EyeOff className="h-4 w-4 mr-1.5" /> Oculto</Badge>
                                }
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Toggle menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <EditPlanForm plan={plan} planGroups={planGroups}>
                                            <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                                Editar
                                            </button>
                                        </EditPlanForm>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                            onSelect={() => {
                                                setSelectedPlan(plan);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                        >
                                            Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            {selectedPlan && (
                <DeletePlanDialog
                    planId={selectedPlan.id}
                    planName={selectedPlan.name}
                    onOpenChange={setIsDeleteDialogOpen}
                />
            )}
            </AlertDialog>
        </div>
    )
}
