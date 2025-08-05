// @/app/(app)/clientes/add-customer-form.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { PlusCircle, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Plan, Server } from "@/lib/types";
import { addCustomerAction } from "./actions";
import { Textarea } from "@/components/ui/textarea";
import { addCustomerSchema } from "@/lib/schemas";
import { useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { DateInput } from "@/components/ui/date-input";
import { generateManagerId } from "@/lib/id-generators";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


export function AddCustomerForm({ plans, servers }: { plans: Plan[], servers: Server[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Função movida para @/lib/id-generators

  const form = useForm<z.infer<typeof addCustomerSchema>>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      name: "",
      iptvUsername: "",
      iptvUserId: "",
      iptvPassword: "",
      managerId: generateManagerId(),
      email: "",
      whatsapp: "",
      planId: "",
      serverId: "none",
      notes: "",
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias a partir de hoje
    },
  });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Função para avançar o foco ao pressionar Enter
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputRefs.current[idx + 1];
      if (next) {
        next.focus();
      } else {
        // Se for o último campo, submete o formulário
        form.handleSubmit(onSubmit)();
      }
    }
  }

  const regenerateManagerId = () => {
    const newId = generateManagerId();
    form.setValue("managerId", newId);
  };

  // Função para combinar refs
  const combineRefs = (index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  };

  function onSubmit(values: z.infer<typeof addCustomerSchema>) {
    startTransition(async () => {
      const result = await addCustomerAction(values, plans);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: result.customer ? `Cliente ${result.customer?.name || ''} adicionado.` : "Cliente adicionado.",
        });
        setOpen(false);
        form.reset();
      } else {
        toast({
          title: "Erro",
          description: result.error || "Não foi possível adicionar o cliente.",
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
          Adicionar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para criar um novo cliente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: João da Silva"
                      {...field}
                      ref={combineRefs(0)}
                      onKeyDown={e => handleKeyDown(e, 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="iptvUsername"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Usuário IPTV</FormLabel>
                    <FormControl>
                        <Input
                          placeholder="Ex: joao.silva"
                          {...field}
                          ref={combineRefs(1)}
                          onKeyDown={e => handleKeyDown(e, 1)}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="iptvPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Senha IPTV (Opcional)</FormLabel>
                    <FormControl>
                        <Input
                          type="text"
                          {...field}
                          ref={combineRefs(2)}
                          onKeyDown={e => handleKeyDown(e, 2)}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="iptvUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID IPTV (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 12345"
                        {...field}
                        ref={combineRefs(3)}
                        onKeyDown={e => handleKeyDown(e, 3)}
                      />
                    </FormControl>
                    <FormDescription>Obrigatório se o gateway estiver ativo.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Gestor</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ex: A1"
                          {...field}
                          ref={combineRefs(4)}
                          onKeyDown={e => handleKeyDown(e, 4)}
                          readOnly
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={regenerateManagerId}
                          className="px-3"
                        >
                          🔄
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      ID gerado automaticamente. Clique em 🔄 para gerar um novo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: cliente@email.com"
                      {...field}
                      ref={combineRefs(5)}
                      onKeyDown={e => handleKeyDown(e, 5)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 5511999999999 (código país + DDD + número)"
                      {...field}
                      ref={combineRefs(6)}
                      onKeyDown={e => handleKeyDown(e, 6)}
                    />
                  </FormControl>
                  <FormDescription>
                    Digite apenas números. Para números nacionais: DDD + número (ex: 11999999999).
                    Para internacionais: código do país + DDD + número (ex: 5511999999999).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Plano</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="serverId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Servidor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o servidor" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectItem value="none">Nenhum (Manual)</SelectItem>
                           {servers.map((server) => (
                                <SelectItem key={server.id} value={server.id}>
                                {server.name}
                                </SelectItem>
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
                name="expirationDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Vencimento</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione uma data"
                        disabled={(date) => date < new Date()}
                      />
                    </FormControl>
                    <FormDescription>
                      Data em que o plano do cliente irá vencer. Digite no formato dd/mm/aaaa ou use o calendário.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            {/* Preferências de Comunicação */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Preferências de Comunicação</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="receiveEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Receber E-mails</FormLabel>
                        <FormDescription className="text-xs">
                          Avisos, lembretes e notificações por e-mail
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receiveWhatsapp"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Receber WhatsApp</FormLabel>
                        <FormDescription className="text-xs">
                          Avisos, lembretes e notificações por WhatsApp
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

             <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notas Internas (Opcional)</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Adicione observações sobre o cliente aqui..."
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
                {isPending ? "Adicionando..." : "Adicionar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
