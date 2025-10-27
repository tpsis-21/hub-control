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
import { Globe, Server, Mail as MailIcon, CreditCard, ShieldQuestion, KeyRound, HelpCircle, Film, MessageSquare, BookOpen, Loader2, Copy } from "lucide-react";
import { ApiKeyDisplay } from "@/components/ui/sensitive-data";
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
            // Dados já validados pelo schema
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
                form.setValue('bot_api_key', result.newApiKey);
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
                         <ApiKeyDisplay 
                  value={settings.bot_api_key} 
                  label="API Key" 
                  showCopyButton={true}
                  showToggleButton={true}
                  readOnly={true}
                />
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
            id: "",
            bot_api_key: "",
            company_name: "",
            primary_color: "",
            created_at: "",
            updated_at: "",
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
                <SettingsCard title="Configurações da Empresa" description="Configure as informações básicas da sua empresa." form={form} fieldsToSave={['company_name', 'primary_color']}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="company_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome da Empresa</FormLabel>
                                <FormControl>
                                    <Input placeholder="Nome da sua empresa" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="primary_color" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cor Primária</FormLabel>
                                <FormControl>
                                    <Input type="color" {...field} value={field.value || '#000000'} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
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
                 <ApiIntegrationConfigCard form={form} settings={settings} />
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Configurações Avançadas</CardTitle>
                        <CardDescription>
                            Configurações adicionais para personalização e integrações.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert>
                            <Globe className="h-4 w-4" />
                            <AlertTitle>Em Desenvolvimento</AlertTitle>
                            <AlertDescription>
                                Novas configurações e integrações serão adicionadas em breve.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
      <div className="mt-8">
        <UserSettingsForm />
      </div>
    </div>
  );
}

