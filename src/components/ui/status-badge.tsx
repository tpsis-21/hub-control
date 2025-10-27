"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/lib/types";

const statusConfig = {
  'Ativo': { color: 'bg-green-500', text: 'text-green-800' },
  'Inativo': { color: 'bg-gray-500', text: 'text-gray-800' },
  'Bloqueado': { color: 'bg-red-500', text: 'text-red-800' },
  'Em teste': { color: 'bg-yellow-500', text: 'text-yellow-800' },
};

type StatusBadgeProps = {
  customer: Client;
  onStatusChange?: (customerId: string, newStatus: Client['status']) => Promise<{ success: boolean; error?: string }>;
  allowedStatuses?: Client['status'][];
  disabled?: boolean;
};

export function StatusBadge({ 
  customer, 
  onStatusChange, 
  allowedStatuses,
  disabled = false 
}: StatusBadgeProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: Client['status']) => {
    if (!onStatusChange) return;
    
    startTransition(async () => {
      const result = await onStatusChange(customer.id, newStatus);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: `Status de ${customer.name} atualizado.`,
        });
      } else {
        toast({
          title: "Erro",
          description: result.error || "Não foi possível atualizar o status.",
          variant: "destructive",
        });
      }
    });
  };

  const availableStatuses = allowedStatuses || (Object.keys(statusConfig) as Array<Client['status']>);
  const config = statusConfig[customer.status] || statusConfig['Inativo'];

  // Se não há função de mudança de status ou está desabilitado, apenas mostra o badge
  if (!onStatusChange || disabled) {
    return (
      <div className="flex w-fit items-center gap-2 text-xs h-7 px-3 py-1 rounded-md border bg-background">
        <span className={cn("h-2 w-2 rounded-full", config.color)}></span>
        {customer.status}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex w-fit items-center gap-2 text-xs h-7" 
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className={cn("h-2 w-2 rounded-full", config.color)}></span>
          )}
          {customer.status}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
        {availableStatuses
          .filter(status => status !== customer.status)
          .map((status) => (
            <DropdownMenuItem
              key={status}
              disabled={isPending}
              onSelect={() => handleStatusChange(status)}
            >
              <span className={cn("h-2 w-2 rounded-full mr-2", statusConfig[status]?.color)}></span>
              {status}
            </DropdownMenuItem>
          ))
        }
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
