// @/app/(app)/configuracoes/page.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/app/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Globe, Server, Mail as MailIcon, CreditCard, ShieldQuestion, KeyRound, Copy, HelpCircle, Film, MessageSquare, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { getSettings, saveSettingsAction, generateNewApiKeyAction } from "./actions";
import type { Settings } from "@/lib/types";
import { settingsSchema } from "@/lib/schemas";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSettingsForm } from "@/components/auth/user-settings-form";


const settingsFormSchema = settingsSchema;

function SettingsCard({ 
    title, 
    description, 
    children, 
    form,
    fieldsToSave,
}: { 
    title: string; 
    description: string; 
    children: React.ReactNode; 
    form: ReturnType<typeof useForm<z.infer<typeof settingsFormSchema>>>;
    fieldsToSave: string[];
}) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const onSubmit = (values: z.infer<typeof settingsFormSchema>) => {
        startTransition(async () => {
            const dataToSave: any = {};
            fieldsToSave.forEach(field => {
                const key = field as string;
                const value = (values as any)[field];
                dataToSave[key] = value;
            });
            // Garantir que manualTestDuration tenha um valor padrão
            if (dataToSave.manualTestDuration === undefined) {
                dataToSave.manualTestDuration = 30;
            }
            const result = await saveSettingsAction(dataToSave);
            if (result.success) {
                toast({ title: "Sucesso!", description: `${title} salvas com sucesso.` });
            } else {
                toast({ title: "Erro", description: result.error || "Não foi possível salvar.", variant: "destructive" });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {children}
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}


function ApiIntegrationConfigCard({ form, settings }: { form: any, settings: Settings }) {
    const { toast } = useToast();
    const [isGenerating, startGeneratingTransition] = useTransition();
    const [apiEndpoint, setApiEndpoint] = useState('');

     useEffect(() => {
        // Garantir que window só seja acessado no lado do cliente
        if (typeof window !== 'undefined') {
            setApiEndpoint(`${window.location.origin}/api/v1/bot`);
        }
    }, []);

    const handleCopy = (textToCopy: string, fieldName: string) => {
        navigator.clipboard.writeText(textToCopy);
        toast({ title: "Copiado!", description: `${fieldName} copiado para a área de transferência.` });
    };

    const handleGenerateKey = () => {
        startGeneratingTransition(async () => {
            const result = await generateNewApiKeyAction();
             if (result.success && result.newApiKey) {
                form.setValue('botApiKey', result.newApiKey);
                toast({ title: "Sucesso!", description: "Nova chave de API gerada." });
            } else {
                toast({ title: "Erro", description: result.error || "Falha ao gerar nova chave.", variant: "destructive" });
            }
        });
    };
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>API para Chatbots</CardTitle>
                <CardDescription>
                    Use esta URL e chave para integrar com serviços externos e automatizar a criação de testes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="api-endpoint">URL do Endpoint</Label>
                    <div className="flex items-center gap-2">
                        <Input id="api-endpoint" value={apiEndpoint} readOnly />
                         <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(apiEndpoint, 'URL do Endpoint')}>
                            <Copy className="h-4 w-4" />
                         </Button>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="api-key">API Key (Chave de Autenticação)</Label>
                    <div className="flex items-center gap-2">
                         <Input id="api-key" type="password" value={settings.botApiKey} readOnly />
                          <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(settings.botApiKey, 'API Key')}>
                            <Copy className="h-4 w-4" />
                         </Button>
                    </div>
                 </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-between items-center">
                 <Button type="button" onClick={handleGenerateKey} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Gerar Nova Chave
                </Button>
                 <Button asChild variant="link">
                    <Link href="/documentacao/api-chatbots"><BookOpen className="w-4 h-4 mr-2" />Ver Documentação</Link>
                 </Button>
            </CardFooter>
        </Card>
    )
}

function PageSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
            <div className="space-y-6">
                 {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)}
            </div>
        </div>
    );
}

export default function ConfiguracoesPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof settingsFormSchema>>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            manualTestDuration: 4,
            bpixClientId: "",
            bpixClientSecret: "",
            bpixToken: "",
            clientAreaSupportLink: "",
            clientAreaContentRequestLink: "",
            botApiKey: "",
            whatsappApiEndpoint: "",
            whatsappApiKey: "",
            smtpHost: "",
            smtpUser: "",
            smtpPass: "",
        },
    });

    useEffect(() => {
        getSettings().then(data => {
            setSettings(data);
            form.reset(data);
        }).catch(() => {
            toast({ title: "Erro", description: "Não foi possível carregar as configurações.", variant: "destructive" });
        });
    }, [form, toast]);

    if (!settings) {
        return (
             <div className="flex min-h-screen w-full flex-col">
                <Header title="Configurações e Integrações" />
                <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                    <PageSkeleton />
                </main>
            </div>
        )
    }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Configurações e Integrações" />
      <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                 <SettingsCard title="Configurações Gerais de Testes" description="Defina o período de validade padrão para novos testes manuais." form={form} fieldsToSave={['manualTestDuration']}>
                     <FormField
                        control={form.control}
                        name="manualTestDuration"
                        render={({ field }) => (
                            <FormItem className="grid w-full max-w-sm items-center gap-2">
                                <FormLabel>Duração do Teste Manual (Padrão)</FormLabel>
                                <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a duração" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="1">1 hora</SelectItem>
                                        <SelectItem value="2">2 horas</SelectItem>
                                        <SelectItem value="3">3 horas</SelectItem>
                                        <SelectItem value="4">4 horas</SelectItem>
                                        <SelectItem value="6">6 horas</SelectItem>
                                        <SelectItem value="12">12 horas</SelectItem>
                                        <SelectItem value="24">24 horas</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </SettingsCard>
                <Card>
                    <CardHeader>
                        <CardTitle>Painéis de IPTV e Automações</CardTitle>
                        <CardDescription>
                            Toda a configuração de automação (criação de testes, renovações) é feita individualmente para cada servidor.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert>
                            <Server className="h-4 w-4" />
                            <AlertTitle>Onde configurar?</AlertTitle>
                            <AlertDescription>
                                Gerencie seus painéis e ative as automações na página de <Button variant="link" asChild className="p-0 h-auto"><Link href="/servidores">Servidores</Link></Button>. Lá você poderá adicionar integrações com painéis como NATV, Pixbot ou qualquer outro com uma API genérica.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
                 <SettingsCard title="Links da Área do Cliente" description="Configure os links que serão exibidos para seus clientes na área exclusiva deles." form={form} fieldsToSave={['clientAreaSupportLink', 'clientAreaContentRequestLink']}>
                    <FormField
                        control={form.control}
                        name="clientAreaSupportLink"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><HelpCircle className="w-4 h-4 text-muted-foreground" /> Link de Suporte</FormLabel>
                                <FormControl><Input placeholder="https://wa.me/SEUNUMERO" {...field} value={field.value || ''} /></FormControl>
                                <FormDescription>Ex: Link do seu WhatsApp, Telegram, etc.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="clientAreaContentRequestLink"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Film className="w-4 h-4 text-muted-foreground" /> Link para Pedido de Conteúdo</FormLabel>
                                <FormControl><Input placeholder="https://forms.gle/SEUFORMULARIO" {...field} value={field.value || ''} /></FormControl>
                                 <FormDescription>Ex: Link de um formulário ou grupo.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </SettingsCard>
                 <ApiIntegrationConfigCard form={form} settings={settings} />
            </div>
            <div className="space-y-6">
                 <SettingsCard title="Gateway de Pagamento - BPIX" description="Configure sua integração com a BPIX para receber pagamentos via PIX." form={form} fieldsToSave={['bpixClientId', 'bpixClientSecret', 'bpixToken']}>
                     <Alert>
                        <ShieldQuestion className="h-4 w-4" />
                        <AlertTitle>Onde encontrar suas credenciais?</AlertTitle>
                        <AlertDescription>
                            Suas credenciais <code className="font-mono text-xs">client_id</code>, <code className="font-mono text-xs">client_secret</code> e <code className="font-mono text-xs">token</code> são fornecidas pela BPIX.
                        </AlertDescription>
                    </Alert>
                    <FormField control={form.control} name="bpixClientId" render={({ field }) => (
                        <FormItem><FormLabel>Client ID</FormLabel><FormControl><Input placeholder="Seu Client ID da BPIX" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="bpixClientSecret" render={({ field }) => (
                        <FormItem><FormLabel>Client Secret</FormLabel><FormControl><Input type="password" placeholder="******************" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="bpixToken" render={({ field }) => (
                        <FormItem><FormLabel>Token</FormLabel><FormControl><Input type="password" placeholder="******************" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </SettingsCard>

                 <SettingsCard title="Integração com WhatsApp (BotConversa)" description="Configure sua API da BotConversa para enviar notificações automáticas." form={form} fieldsToSave={['whatsappApiEndpoint', 'whatsappApiKey']}>
                      <Alert>
                        <Globe className="h-4 w-4" />
                        <AlertTitle>Onde encontrar sua API Key?</AlertTitle>
                        <AlertDescription>
                            Sua <strong>API Key</strong> (ou Token) pode ser encontrada no painel da BotConversa, na seção de configurações e integrações.
                        </AlertDescription>
                    </Alert>
                     <FormField control={form.control} name="whatsappApiEndpoint" render={({ field }) => (
                        <FormItem><FormLabel>Endpoint da API</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormDescription>Endpoint para o envio de mensagens da BotConversa.</FormDescription><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="whatsappApiKey" render={({ field }) => (
                        <FormItem><FormLabel>API Key (Token)</FormLabel><FormControl><Input type="password" placeholder="******************" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </SettingsCard>
                 
                  <SettingsCard title="Configurações de E-mail (SMTP)" description="Configure um serviço para o envio de e-mails transacionais." form={form} fieldsToSave={['smtpHost', 'smtpUser', 'smtpPass']}>
                    <Alert>
                        <MailIcon className="h-4 w-4" />
                        <AlertTitle>Qual serviço usar?</AlertTitle>
                        <AlertDescription>
                        Você pode usar um serviço de SMTP padrão ou integrar com uma plataforma de e-mail marketing como a Brevo (Sendinblue), Mailgun, etc.
                        </AlertDescription>
                    </Alert>
                      <FormField control={form.control} name="smtpHost" render={({ field }) => (
                        <FormItem><FormLabel>Servidor SMTP (Host)</FormLabel><FormControl><Input placeholder="smtp.exemplo.com.br" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="smtpUser" render={({ field }) => (
                        <FormItem><FormLabel>Usuário SMTP</FormLabel><FormControl><Input placeholder="seu_usuario" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="smtpPass" render={({ field }) => (
                        <FormItem><FormLabel>Senha SMTP</FormLabel><FormControl><Input type="password" placeholder="******************" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </SettingsCard>
            </div>
        </div>
      </main>
      <div className="mt-8">
        <UserSettingsForm />
      </div>
    </div>
  );
}
<UserSettingsForm />
