// @/app/(app)/planos/add-plan-form.tsx
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addPlanAction } from "./actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlanGroup } from "@/lib/types";
import { planSchema } from "@/lib/schemas";

export function AddPlanForm({ planGroups }: { planGroups: PlanGroup[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      price: 29.90,
      priceBeforeDiscount: undefined,
      validity: 30,
      countingType: 'month' as const,
      screens: 1,
      restrictions: "",
      sendWelcomeMessage: true,
      isPublic: true,
      groupId: 'none',
    },
  });

  function onSubmit(values: z.infer<typeof planSchema>) {
    startTransition(async () => {
      const result = await addPlanAction(values);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: `Plano ${result.plan?.name || ''} adicionado.`,
        });
        setOpen(false);
        form.reset();
      } else {
         toast({
          title: "Erro",
          description: result.error || "Não foi possível adicionar o plano.",
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
          Adicionar Plano
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Plano</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para criar um novo plano.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Nome do Plano</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Plano Básico Mensal" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                      <FormLabel>Preço Final (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="priceBeforeDiscount"
                render={({ field }) => (
                  <FormItem>
                      <FormLabel>Preço Original (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 90.00" {...field} value={field.value || ''} />
                      </FormControl>
                       <FormDescription className="text-xs">
                          Preço antes do desconto. Será exibido riscado junto com o badge de desconto.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="countingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Contagem</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Reset validity when counting type changes
                      if (value === 'month') {
                        form.setValue('validity', 30); // 1 mês = 30 dias
                      } else {
                        form.setValue('validity', 30); // 30 dias
                      }
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="month">Por Mês</SelectItem>
                        <SelectItem value="days">Por 30 Dias</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="validity"
                render={({ field }) => {
                  const countingType = form.watch('countingType');
                  const isMonthly = countingType === 'month';
                  
                  return (
                    <FormItem>
                      <FormLabel>Validade {isMonthly ? '(meses)' : '(dias)'}</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a validade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isMonthly ? (
                            // Opções para contagem mensal (em dias equivalentes)
                            <>
                              <SelectItem value="30">1 mês</SelectItem>
                              <SelectItem value="60">2 meses</SelectItem>
                              <SelectItem value="90">3 meses</SelectItem>
                              <SelectItem value="180">6 meses</SelectItem>
                              <SelectItem value="365">12 meses</SelectItem>
                            </>
                          ) : (
                            // Opções para contagem por dias
                            <>
                              <SelectItem value="30">30 dias</SelectItem>
                              <SelectItem value="60">60 dias</SelectItem>
                              <SelectItem value="90">90 dias</SelectItem>
                              <SelectItem value="180">180 dias</SelectItem>
                              <SelectItem value="365">365 dias</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="screens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telas</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {/* ID numérico será gerado automaticamente (2 dígitos: 10-99) */}
                 <FormField
                    control={form.control}
                    name="groupId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Grupo de Planos</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o grupo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {planGroups.map(group => (
                                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <FormDescription>
                           Para agrupar na área do cliente.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
            </div>
             <FormField
                control={form.control}
                name="restrictions"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descrição/Restrições (Opcional)</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Ex: Qualidade 4k, Canais adultos"
                        className="resize-y h-20"
                        {...field}
                        />
                    </FormControl>
                     <FormDescription>
                       Informações adicionais sobre o plano.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
              control={form.control}
              name="sendWelcomeMessage"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Enviar mensagem de boas-vindas</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Público (Visível ao cliente)</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adicionando..." : "Adicionar Plano"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
