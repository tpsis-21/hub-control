"use client";

import { useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteTestAction } from "./supabase-actions";

type DeleteTestDialogProps = {
  customerId: string;
  customerName: string;
  onOpenChange: (open: boolean) => void;
};

export function DeleteTestDialog({ customerId, customerName, onOpenChange }: DeleteTestDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTestAction(customerId);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: "Teste excluído.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Erro ao Excluir",
          description: result.error || "Não foi possível excluir o teste.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Teste</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o teste "{customerName}"? 
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
