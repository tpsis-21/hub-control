// src/app/(app)/testes/convert-test-button.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { convertTestToCustomerAction } from "@/app/(app)/clientes/actions";
import type { Client, Plan } from "@/lib/types";
import { Zap } from "lucide-react";

type ConvertTestButtonProps = {
  customer: Client;
  plan?: Plan;
};

export function ConvertTestButton({ customer, plan }: ConvertTestButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleConvert = () => {
    if (!plan) {
       toast({
          title: "Erro",
          description: "Plano não encontrado para este teste.",
          variant: "destructive",
        });
        return;
    }

    startTransition(async () => {
      const result = await convertTestToCustomerAction(customer.id, plan.validity);
      if (result.success && result.customer) {
        toast({
          title: "Sucesso!",
          description: `${result.customer.name} foi convertido para cliente.`,
        });
        router.push(`/clientes/${result.customer.id}`);
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível converter o teste em cliente.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <DropdownMenuItem onClick={handleConvert} disabled={isPending || !plan}>
      <Zap className="mr-2 h-4 w-4" />
      {isPending ? "Convertendo..." : "Converter em Cliente"}
    </DropdownMenuItem>
  );
}
