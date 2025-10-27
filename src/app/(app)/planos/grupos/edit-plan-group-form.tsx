// @/app/(app)/planos/grupos/edit-plan-group-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { editPlanGroupAction } from "../actions";
import { editPlanGroupSchema } from "@/lib/schemas";
import type { PlanGroup } from "@/lib/types";
import { Edit } from "lucide-react";

type EditPlanGroupFormProps = {
    group: PlanGroup;
    onGroupUpdated: (group: PlanGroup) => void;
}

export function EditPlanGroupForm({ group, onGroupUpdated }: EditPlanGroupFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editPlanGroupSchema>>({
    resolver: zodResolver(editPlanGroupSchema),
    defaultValues: {
      id: group.id,
      name: group.name,
      description: group.description || "",
    },
  });

  function onSubmit(values: z.infer<typeof editPlanGroupSchema>) {
    startTransition(async () => {
      const result = await editPlanGroupAction(values);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: `Grupo ${result.group?.name || ''} atualizado.`,
        });
        setOpen(false);
        // Atualizar a lista local com o grupo editado
        if (result.group) {
          onGroupUpdated(result.group);
        }
      } else {
         toast({
          title: "Erro",
          description: result.error || "Não foi possível atualizar o grupo.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Grupo de Planos</DialogTitle>
          <DialogDescription>
            Atualize os dados do grupo abaixo.
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
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

