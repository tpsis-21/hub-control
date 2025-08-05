// @/app/(app)/clientes/edit-customer-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CalendarIcon } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateInput } from "@/components/ui/date-input";
import { useToast } from "@/hooks/use-toast";
import type { Plan, Client, Server } from "@/lib/types";
import { editCustomerAction } from "./actions";
import { editCustomerSchema } from "@/lib/schemas";

type EditCustomerFormProps = {
    customer: Client;
    plans: Plan[];
    servers: Server[];
    children: React.ReactNode;
}

export function EditCustomerForm({ customer, plans, servers, children }: EditCustomerFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editCustomerSchema>>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      id: customer.id,
      name: customer.name,
      iptvUsername: customer.iptvUsername,
      iptvUserId: customer.iptvUserId || "",
      iptvPassword: customer.iptvPassword || "",
      managerId: customer.managerId || "",
      email: customer.email || "",
      whatsapp: customer.whatsapp || "",
      planId: customer.planId,
      serverId: customer.serverId || "none",
      status: customer.status,
      expirationDate: new Date(customer.expirationDate),
      notes: customer.notes || "",
      receiveEmail: customer.receiveEmail ?? true,
      receiveWhatsapp: customer.receiveWhatsapp ?? true,
    },
  });

  function onSubmit(values: z.infer<typeof editCustomerSchema>) {
    startTransition(async () => {
      // Converte a data de volta para o formato ISO string para a server action
      const result = await editCustomerAction({
        ...values,
        expirationDate: values.expirationDate.toISOString(),
      });
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: result.customer ? `Cliente ${result.customer?.name || ''} atualizado.` : "Cliente atualizado.",
        });
        setOpen(false); // Fecha o modal após o sucesso
      } else {
         toast({
          title: "Erro",
          description: result.error || "Não foi possível atualizar o cliente.",
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
          <DialogTitle>Editar {customer.status === 'Em teste' ? 'Teste' : 'Cliente'}</DialogTitle>
          <DialogDescription>
            Atualize os dados abaixo.
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
                    <Input placeholder="Ex: João da Silva" {...field} value={field.value || ''} />
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
                        <Input placeholder="Ex: joao.silva" {...field} value={field.value || ''} />
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
                        <Input type="text" {...field} value={field.value || ''} />
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
                      <Input placeholder="Ex: 12345" {...field} value={field.value || ''} />
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
                    <FormLabel>ID do Gestor (Somente Leitura)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: GESTOR01" 
                        {...field} 
                        value={field.value || ''} 
                        readOnly 
                        className="bg-muted cursor-not-allowed"
                      />
                    </FormControl>
                    <FormDescription className="text-amber-600">
                      ⚠️ O ID do gestor não pode ser alterado após a criação do cliente por questões de segurança e integridade dos dados.
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
                    <Input placeholder="Ex: cliente@email.com" {...field} value={field.value || ''} />
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
                    <Input placeholder="Ex: 5511999998888" {...field} value={field.value || ''} />
                  </FormControl>
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
            <div className="grid grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                      <SelectItem value="Em teste">Em teste</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                        disabled={(date) => date < new Date("1900-01-01")}
                      />
                    </FormControl>
                    <FormDescription>
                      Data em que o plano do cliente irá vencer. Digite no formato dd/mm/aaaa ou use o calendário.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
             />
            </div>

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
