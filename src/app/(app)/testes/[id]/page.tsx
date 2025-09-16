// @/app/(app)/testes/[id]/page.tsx
"use client";

import { useTransition, useEffect, useState } from "react";
import { notFound, useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/app/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Mail, User, Phone, Tv, MessageSquare, ShieldCheck, Loader2, ArrowLeft, Zap, KeyRound, StickyNote, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseISO, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { convertTestToCustomerAction, getClienteById } from "@/app/(app)/clientes/actions";
import { getPlans } from "@/app/(app)/planos/actions";
import { getServers } from "@/app/(app)/servidores/actions";
import { WhatsAppButton } from "@/components/app/whatsapp-button";
import { CopyableField } from "@/components/app/copyable-field";
import { EditCustomerForm } from "@/app/(app)/clientes/edit-customer-form";
import { EditableNote } from "@/components/app/editable-note";
import { FormattedDate } from "@/components/app/formatted-date";
import type { Client, Plan, Server } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig = {
  'Em teste': { color: 'bg-yellow-500', text: 'Em teste' },
  'Expirado': { color: 'bg-gray-500', text: 'Expirado' },
};

function ConvertButton({ customerId, planValidity }: { customerId: string, planValidity: number }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleConvert = () => {
        startTransition(async () => {
            const result = await convertTestToCustomerAction(customerId, planValidity);
            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: "O teste foi convertido para cliente.",
                });
                router.push(`/clientes/${customerId}`);
            } else {
                toast({
                    title: "Erro",
                    description: "Não foi possível converter o teste.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Button onClick={handleConvert} disabled={isPending}>
            {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <Zap className="w-4 h-4 mr-2" />
            )}
            Converter em Cliente
        </Button>
    );
}

function PageSkeleton() {
    return (
         <div className="flex-1 p-4 md:p-6 space-y-6">
            <div>
                <Skeleton className="h-9 w-48" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-8 w-1/2 mb-2" />
                            <Skeleton className="h-6 w-24" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-32" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-4">
                                <Skeleton className="h-4 w-48" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                         <CardHeader>
                            <Skeleton className="h-6 w-24" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <Skeleton className="h-5 w-32" />
                             <Skeleton className="h-4 w-24" />
                            <Separator/>
                             <Skeleton className="h-5 w-24" />
                             <Skeleton className="h-5 w-36" />
                        </CardContent>
                        <CardFooter>
                             <Skeleton className="h-10 w-40" />
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function TestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = typeof params?.id === 'string' ? params.id : '';
  const [customer, setCustomer] = useState<Client | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTestData() {
        if (!customerId) return;
        setLoading(true);
        try {
            const [customerResult, allPlans, allServers] = await Promise.all([
            getClienteById(customerId),
            getPlans(),
            getServers()
            ]);

            if (customerResult) {
                const client = customerResult;
                if (client.status !== 'Em teste') {
                    router.replace(`/clientes/${client.id}`);
                } else {
                    setCustomer(client);
                    setPlans(allPlans);
                    setServers(allServers);
                }
            } else {
                notFound();
            }
        } catch(error) {
            console.error("Failed to fetch test data:", error);
            notFound();
        } finally {
            setLoading(false);
        }
    }
    fetchTestData();
  }, [customerId, router]);

  const plan = customer ? plans.find((p) => p.id === customer.planId) : null;
  const server = customer ? servers.find((s) => s.id === customer.serverId) : null;

  if (loading || !customer) {
     return (
       <div className="flex min-h-screen w-full flex-col">
            <Header title="Detalhes do Teste" />
            <main className="flex-1 flex">
                 <PageSkeleton />
            </main>
        </div>
    );
  }
  
  const isExpired = isPast(parseISO(customer.expirationDate));
  const status = isExpired ? statusConfig['Expirado'] : statusConfig['Em teste'];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Detalhes do Teste" />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div>
            <Button asChild variant="outline" size="sm">
                <Link href="/testes">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para a lista de testes
                </Link>
            </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl">{customer.name}</CardTitle>
                        <CardDescription>
                            <Badge variant="outline" className={cn("text-sm")}>
                                <span className={cn("h-2 w-2 rounded-full mr-2", status.color)}></span>
                                {status.text}
                            </Badge>
                        </CardDescription>
                    </div>
                    <EditCustomerForm customer={customer} plans={plans} servers={servers}>
                        <Button variant="outline" size="sm">
                            <Pencil className="w-4 h-4 mr-2"/>
                            Editar Teste
                        </Button>
                    </EditCustomerForm>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Dados de Acesso</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <CopyableField icon={User} label="Usuário IPTV" value={customer.iptvUsername || ''} />
                            {customer.iptvPassword && (
                                <CopyableField icon={ShieldCheck} label="Senha IPTV" value={customer.iptvPassword} />
                            )}
                            {customer.iptvUserId && (
                                <CopyableField icon={KeyRound} label="ID IPTV" value={customer.iptvUserId} />
                            )}
                        </div>
                    </div>
                     <Separator />
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Informações de Contato</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                             <CopyableField icon={Mail} label="Email" value={customer.email || "Não informado"} />
                             <CopyableField icon={Phone} label="WhatsApp" value={customer.whatsapp || "Não informado"} />
                             <div className="flex items-center gap-3 text-sm">
                                <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Teste iniciado em</p>
                                    <FormattedDate dateString={customer.startDate} format="dd/MM/yyyy, HH:mm" />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <WhatsAppButton phoneNumber={customer.whatsapp} />
                </CardFooter>
            </Card>
            <EditableNote customerId={customer.id} initialNotes={customer.notes} />
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tv className="w-5 h-5" /> Plano do Teste</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium">{plan?.name}</p>
                            <p className="text-sm text-muted-foreground">Servidor: {server?.name || 'Manual'}</p>
                        </div>
                        <Separator/>
                        <div>
                            <p className="text-sm text-muted-foreground">Expira em</p>
                            <p className="font-semibold"><FormattedDate dateString={customer.expirationDate} format="dd 'de' LLLL, yyyy 'às' HH:mm" /></p>
                        </div>
                    </CardContent>
                    {plan && !isExpired && (
                        <CardFooter>
                            <ConvertButton customerId={customer.id} planValidity={plan.validity} />
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
