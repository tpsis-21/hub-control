// @/app/(app)/planos/grupos/add-plan-group-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { planGroupSchema } from "@/lib/schemas";
import type { PlanGroup } from "@/lib/types";

type AddPlanGroupFormProps = {
  onGroupAdded: (group: PlanGroup) => void;
};

export function AddPlanGroupForm({ onGroupAdded }: AddPlanGroupFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof planGroupSchema>>({
    resolver: zodResolver(planGroupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  function onSubmit(values: z.infer<typeof planGroupSchema>) {
    startTransition(async () => {
      try {
        const response = await fetch('/api/plan-groups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          toast({
            title: "Sucesso!",
            description: `Grupo "${result.planGroup?.name || ''}" adicionado.`,
          });
          setOpen(false);
          form.reset();
          // Atualizar a lista local com o novo grupo
          if (result.planGroup) {
            onGroupAdded(result.planGroup);
          }
        } else {
          toast({
            title: "Erro",
            description: result.error || 'Não foi possível adicionar o grupo.',
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Erro ao adicionar grupo:', error);
        toast({
          title: "Erro",
          description: 'Erro de conexão. Tente novamente.',
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Grupo de Planos</DialogTitle>
          <DialogDescription>
            Crie um novo grupo para organizar seus planos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Grupo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Planos Bronze" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Planos básicos com canais SD e HD"
                      className="resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adicionando..." : "Adicionar Grupo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

