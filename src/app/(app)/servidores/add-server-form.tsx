// @/app/(app)/servidores/add-server-form.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { PlusCircle, Bot, Code, Tv, EyeOff, KeyRound, RadioTower, Bell, BookOpen, CreditCard, RefreshCw } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { addServerAction } from "./actions";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { serverFormSchema } from "@/lib/schemas";


export function AddServerForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serverFormSchema>>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      name: "",
      integrationType: "none",
      url: "",
      apiKey: "",
      status: "Online",
      testAutomation: false,
      renewalAutomation: false,
      paymentGateway: false,
      sendExpirationReminder: true,
      sendUsageInstructions: true,
      testConfig: {
          type: 'none',
          chatbotLink: '',
          chatbotMessage: 'Olá, gostaria de um teste para o usuário {{USUARIO_IPTV}} no plano {{PLANO}}',
          apiEndpoint: "/users/create",
          apiHeaders: '{ "Content-Type": "application/json", "Authorization": "Bearer {{API_KEY}}" }',
          apiBody: '{ "username": "{{USUARIO_IPTV}}", "password": "{{SENHA_IPTV}}", "plan_id": {{ID_PLANO_PAINEL}} }',
          testDurationMinutes: 240,
          responseUsernamePath: 'data.username',
          responsePasswordPath: 'data.password',
          responseUserIdPath: 'data.id',
          responseExpirationPath: 'data.expires_at'
      }
    },
  });

  const integrationType = useWatch({ control: form.control, name: 'integrationType' });
  const testAutomationEnabled = useWatch({ control: form.control, name: 'testAutomation' });
  const testConfigType = useWatch({ control: form.control, name: 'testConfig.type' });

  const isManualIntegration = integrationType === 'none';

  useEffect(() => {
    if (isManualIntegration) {
      form.setValue('testAutomation', false);
      form.setValue('renewalAutomation', false);
      form.setValue('paymentGateway', false);
    }
  }, [isManualIntegration, form]);


  function onSubmit(values: z.infer<typeof serverFormSchema>) {
    startTransition(async () => {
      const result = await addServerAction(values);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: `Servidor ${result.server?.name || ''} adicionado.`,
        });
        setOpen(false);
        form.reset();
      } else {
         toast({
          title: "Erro",
          description: result.error || "Não foi possível adicionar o servidor.",
          variant: "destructive",
        });
      }
    });
  }

  const pixbotDurations = [
      { value: 30, label: "30 minutos" },
      { value: 60, label: "1 hora" },
      { value: 120, label: "2 horas" },
      { value: 180, label: "3 horas" },
      { value: 240, label: "4 horas" },
      { value: 300, label: "5 horas" },
      { value: 360, label: "6 horas" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Servidor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Servidor</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para registrar um novo servidor de IPTV.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Servidor</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Servidor Principal" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>
                    Um nome para identificar este servidor facilmente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="integrationType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Integração</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de painel" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="none">
                            <div className="flex items-center gap-2"><EyeOff className="w-4 h-4" /> Nenhuma (Manual)</div>
                        </SelectItem>
                         <SelectItem value="natv">
                            <div className="flex items-center gap-2"><RadioTower className="w-4 h-4" /> NATV</div>
                        </SelectItem>
                        <SelectItem value="pixbot">
                            <div className="flex items-center gap-2"><Tv className="w-4 h-4" /> Servidor na TV (Pixbot)</div>
                        </SelectItem>
                         <SelectItem value="generic">
                            <div className="flex items-center gap-2"><Code className="w-4 h-4" /> Genérico / Outro</div>
                        </SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                        <SelectItem value="Instável">Instável</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
           

            {(integrationType === 'generic' || integrationType === 'pixbot') && (
                <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>URL Base da API</FormLabel>
                    <FormControl>
                        <Input placeholder="http://exemplo.com:8080" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>
                       Endereço principal da API do seu painel, sem a barra no final.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            {!isManualIntegration && (
                <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Chave de API (API Key / Bearer Token)</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="******************" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>
                        Sua chave de autenticação para a API.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            
            {!isManualIntegration && <Separator className="my-6" />}
             
            {!isManualIntegration && (
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Automações</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="testAutomation"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="flex items-center gap-2"><KeyRound className="w-4 h-4"/> Teste Automático</FormLabel>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isManualIntegration}
                                        />
                                    </FormControl>
                                </div>
                                 <FormDescription>Gera testes automaticamente via API.</FormDescription>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="renewalAutomation"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="flex items-center gap-2"><RefreshCw className="w-4 h-4"/> Renovação Automática</FormLabel>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isManualIntegration}
                                        />
                                    </FormControl>
                                </div>
                                 <FormDescription>Renova clientes automaticamente.</FormDescription>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="paymentGateway"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="flex items-center gap-2"><CreditCard className="w-4 h-4"/> Cobrança Automática</FormLabel>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isManualIntegration}
                                        />
                                    </FormControl>
                                </div>
                                <FormDescription>Integra com gateway de pagamento.</FormDescription>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="sendExpirationReminder"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="flex items-center gap-2"><Bell className="w-4 h-4"/> Lembretes de Venc.</FormLabel>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isManualIntegration}
                                        />
                                    </FormControl>
                                </div>
                                <FormDescription>Envia avisos de vencimento.</FormDescription>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="sendUsageInstructions"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <FormLabel className="flex items-center gap-2"><BookOpen className="w-4 h-4"/> Instruções de Uso</FormLabel>
                                    <FormControl>
                                        <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isManualIntegration}
                                        />
                                    </FormControl>
                                </div>
                                 <FormDescription>Envia dicas para novos clientes.</FormDescription>
                                </FormItem>
                            )}
                        />
                    </div>
                 </div>
             )}
            
            {testAutomationEnabled && integrationType === 'natv' && (
                 <div className="p-4 border rounded-md space-y-4">
                     <Alert variant="default" className="bg-blue-50 border-blue-200">
                        <RadioTower className="h-4 w-4" />
                        <AlertTitle>Configuração para NATV</AlertTitle>
                        <AlertDescription>
                           Defina a duração padrão para os testes gerados via API. A URL da API é fixa e não precisa ser inserida.
                        </AlertDescription>
                    </Alert>
                    <FormField
                        control={form.control}
                        name="testConfig.testDurationMinutes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Duração do Teste (em minutos)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Ex: 60" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormDescription>Padrão é 60 minutos se não for preenchido.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
            )}

            {testAutomationEnabled && integrationType === 'pixbot' && (
                <div className="p-4 border rounded-md space-y-4">
                     <Alert variant="default" className="bg-blue-50 border-blue-200">
                        <KeyRound className="h-4 h-4" />
                        <AlertTitle>Configuração para &quot;Servidor na TV&quot;</AlertTitle>
                        <AlertDescription>
                           Esta integração usa a API do Pixbot. Defina a duração do teste abaixo.
                        </AlertDescription>
                    </Alert>
                    <FormField
                        control={form.control}
                        name="testConfig.testDurationMinutes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Duração do Teste</FormLabel>
                            <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={String(field.value)}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a duração do teste" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {pixbotDurations.map(d => (
                                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>Define a validade do teste gerado via API.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
            
            {testAutomationEnabled && integrationType === 'generic' && (
                <div className="space-y-4 p-4 border rounded-md">
                    <h4 className="font-medium text-foreground">Configuração da Automação de Teste</h4>
                     <FormField
                        control={form.control}
                        name="testConfig.type"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Conexão para Teste</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo de conexão" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                <SelectItem value="api">
                                    <div className="flex items-center gap-2"><Code className="w-4 h-4" /> API</div>
                                </SelectItem>
                                <SelectItem value="chatbot">
                                    <div className="flex items-center gap-2"><Bot className="w-4 h-4" /> Chatbot</div>
                                </SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    {testConfigType === 'chatbot' && (
                        <>
                            <FormField
                                control={form.control}
                                name="testConfig.chatbotLink"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Link do Chatbot (WhatsApp)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://wa.me/..." {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="testConfig.chatbotMessage"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Mensagem a ser Enviada</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ex: Quero um teste para {{USUARIO_IPTV}}" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Use as tags disponíveis para personalizar a mensagem.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    )}
                    {testConfigType === 'api' && (
                        <div className="space-y-4">
                             <FormField
                                control={form.control}
                                name="testConfig.apiEndpoint"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Endpoint da API</FormLabel>
                                    <FormControl>
                                        <Input placeholder="/users/create" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>O caminho específico para a criação de teste. Ex: /api/v1/users</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="testConfig.apiHeaders"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Headers da API (JSON)</FormLabel>
                                    <FormControl>
                                        <Textarea rows={4} placeholder='{ "Authorization": "Bearer SEU_TOKEN" }' {...field} value={field.value || ''} />
                                    </FormControl>
                                     <FormDescription>Use {"{{API_KEY}}"} para inserir a chave salva acima.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="testConfig.apiBody"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Body da Requisição (JSON)</FormLabel>
                                    <FormControl>
                                        <Textarea rows={5} placeholder='{ "user": "{{USUARIO_IPTV}}", "plan": "{{ID_PLANO_PAINEL}}" }' {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Use as tags disponíveis para personalizar o corpo da requisição.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Separator />
                             <h4 className="font-medium text-foreground pt-2">Mapeamento de Resposta da API</h4>
                              <FormDescription>
                                Especifique o caminho (JSONPath) para extrair os dados da resposta da API. Ex: `data.user.login`
                             </FormDescription>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="testConfig.responseUsernamePath"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Caminho para &quot;username&quot;</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: data.username" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="testConfig.responsePasswordPath"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Caminho para &quot;password&quot;</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: data.password" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="testConfig.responseUserIdPath"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Caminho para &quot;ID do Usuário&quot;</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: data.id" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                             </div>
                        </div>
                    )}
                </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adicionando..." : "Adicionar Servidor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

