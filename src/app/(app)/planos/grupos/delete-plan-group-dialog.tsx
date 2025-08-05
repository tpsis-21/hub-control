// @/app/(app)/planos/grupos/delete-plan-group-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deletePlanGroupAction } from "../actions";

type DeletePlanGroupDialogProps = {
  groupId: string;
  groupName: string;
  onGroupDeleted: (groupId: string) => void;
};

export function DeletePlanGroupDialog({ groupId, groupName, onGroupDeleted }: DeletePlanGroupDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deletePlanGroupAction(groupId);
            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: `Grupo "${groupName}" excluído.`,
                });
                setIsOpen(false);
                onGroupDeleted(groupId);
                // Forçar recarregamento mais agressivo da página
                setTimeout(() => {
                    router.refresh();
                    // Forçar recarregamento completo se necessário
                    window.location.reload();
                }, 200);
            } else {
                toast({
                    title: "Erro",
                    description: result.error || "Não foi possível excluir o grupo.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o grupo <span className="font-bold">{groupName}</span>. Os planos associados não serão excluídos, apenas desvinculados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                        {isPending ? "Excluindo..." : "Confirmar Exclusão"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
