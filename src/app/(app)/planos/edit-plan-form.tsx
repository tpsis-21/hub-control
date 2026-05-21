// @/app/(app)/planos/edit-plan-form.tsx
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
import type { Plan, PlanGroup } from "@/lib/types";
import { editPlanAction } from "./actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { editPlanSchema } from "@/lib/schemas";
import { logger } from '@/utils/production-logger'


type EditPlanFormProps = {
    plan: Plan;
    planGroups: PlanGroup[];
    children: React.ReactNode;
}

export function EditPlanForm({ plan, planGroups, children }: EditPlanFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editPlanSchema>>({
    resolver: zodResolver(editPlanSchema),
    defaultValues: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      priceBeforeDiscount: plan.price_before_discount,
      validity: plan.validity,
      countingType: 'month', // Valor padrão já que o campo não existe
      screens: plan.screens,
      panelPlanId: plan.panel_plan_id || "",
      restrictions: plan.restrictions || "",
      sendWelcomeMessage: plan.send_welcome_message,
      isPublic: plan.is_public,
      groupId: plan.group_id || 'none',
      caktoUrl: plan.cakto_url || '',
    },
  });

  function onSubmit(values: z.infer<typeof editPlanSchema>) {
    logger.debug('🔍 EditPlanForm - onSubmit chamado com valores:', JSON.stringify(values, null, 2));
    startTransition(async () => {
      try {
        logger.debug('🔍 EditPlanForm - Chamando editPlanAction...');
        const result = await editPlanAction(values);
        logger.debug('🔍 EditPlanForm - Resultado recebido:', JSON.stringify(result, null, 2));
        
        if (result.success) {
          logger.debug('✅ EditPlanForm - Sucesso na edição');
          toast({
            title: "Sucesso!",
            description: `Plano ${result.data?.name || ''} atualizado.`,
          });
          setOpen(false);
        } else {
          console.error('❌ EditPlanForm - Erro na edição:', result.error);
          toast({
            title: "Erro",
            description: result.error || "Não foi possível atualizar o plano.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('❌ EditPlanForm - Erro inesperado:', error);
        toast({
          title: "Erro",
          description: "Erro inesperado ao atualizar o plano.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Plano</DialogTitle>
          <DialogDescription>
            Atualize os dados do plano abaixo.
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
               <FormField
                  control={form.control}
                  name="panelPlanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Numérico do Plano</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 25, 99" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                                ID de 2 dígitos usado em APIs e importações (10-99)
                            </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
            <FormField
              control={form.control}
              name="caktoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Cakto (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://pay.cakto.com.br/..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Usado quando Cakto estiver habilitado em Integrações → Checkout.
                  </FormDescription>
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

