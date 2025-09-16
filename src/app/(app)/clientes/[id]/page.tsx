// @/app/(app)/clientes/[id]/page.tsx
"use client";

import { useTransition, useEffect, useState } from "react";
import { notFound, useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/app/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Mail, User, Phone, Tv, Pencil, MessageSquare, DollarSign, ShieldCheck, RefreshCw, Loader2, ArrowLeft, KeyRound, UserCheck, StickyNote, Link as LinkIcon, ScreenShare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Payment, Plan, Client, Server } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EditCustomerForm } from "../edit-customer-form";
import { renewCustomerAction, getClienteById, getClientes } from "../actions";
import { getPlans } from "@/app/(app)/planos/actions";
import { getServers } from "@/app/(app)/servidores/actions";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppButton } from "@/components/app/whatsapp-button";
import { CopyableField } from "@/components/app/copyable-field";
import { FormattedDate } from "@/components/app/formatted-date";
import { EditableNote } from "@/components/app/editable-note";
import { Skeleton } from "@/components/ui/skeleton";


const statusConfig = {
  'Ativo': { color: 'bg-green-500', text: 'text-green-800' },
  'Em teste': { color: 'bg-yellow-500', text: 'text-yellow-800' },
  'Inativo': { color: 'bg-gray-500', text: 'text-gray-800' },
  'Bloqueado': { color: 'bg-red-500', text: 'text-red-800' },
};

const paymentStatusConfig = {
    'Pago': { color: 'text-green-600' },
    'Pendente': { color: 'text-yellow-600' },
    'Atrasado': { color: 'text-red-600' },
};

function RenewButton({ customerId, planId, serverId }: { customerId: string, planId: string, serverId?: string }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const handleRenew = () => {
        startTransition(async () => {
            const result = await renewCustomerAction(customerId, planId, serverId);
            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: "Assinatura do cliente renovada.",
                });
                router.refresh();
            } else {
                toast({
                    title: "Erro",
                    description: result.error || "Não foi possível renovar a assinatura.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Button onClick={handleRenew} disabled={isPending}>
            {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Renovar Assinatura
        </Button>
    );
}

function PaymentHistory({ payments }: { payments?: Payment[] | import("@/lib/database.types").Json | null }) {
    let parsedPayments: Payment[] = [];
    if (Array.isArray(payments)) {
        if (payments.length === 0 || (typeof payments[0] === 'object' && payments[0] !== null && 'amount' in payments[0] && 'date' in payments[0] && 'status' in payments[0])) {
            parsedPayments = payments as Payment[];
        }
    } else if (typeof payments === 'string') {
        try {
            const parsed = JSON.parse(payments);
            if (Array.isArray(parsed)) {
                parsedPayments = parsed as Payment[];
            }
        } catch {
            parsedPayments = [];
        }
    } else {
        // If payments is an object but not an array, ignore it (could be { [key: string]: Json | undefined })
        parsedPayments = [];
    }
    if (!parsedPayments || parsedPayments.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" /> Histórico de Pagamentos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
                </CardContent>
            </Card>
        )
    }
    const lastThreePayments = parsedPayments.slice(-3).reverse();
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Histórico de Pagamentos
                </CardTitle>
                 <CardDescription>
                    Os 3 últimos pagamentos registrados.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lastThreePayments.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell><FormattedDate dateString={payment.date} format="dd/MM/yyyy" /></TableCell>
                            <TableCell>R$ {payment.amount.toFixed(2)}</TableCell>
                            <TableCell>
                                <span className={cn("font-medium", paymentStatusConfig[payment.status as keyof typeof paymentStatusConfig]?.color || '')}>
                                    {payment.status}
                                </span>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
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
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-24 w-full" />
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

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params && typeof params.id === 'string' ? params.id : '';
  const [customer, setCustomer] = useState<Client | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      async function fetchCustomerData() {
          if (!customerId) return;
          setLoading(true);
          try {
            const customerResult = await getClienteById(customerId);
            
            if (customerResult) {
                setCustomer(customerResult);
                 // Only fetch plans and servers if customer is found
                const [allPlans, allServers] = await Promise.all([
                    getPlans(),
                    getServers()
                ]);
                setPlans(allPlans);
                setServers(allServers);
            } else {
                notFound();
            }
          } catch(error) {
            console.error("Failed to fetch customer data:", error);
            notFound();
          } finally {
            setLoading(false);
          }
      }
      fetchCustomerData();
  }, [customerId]);
  
  const plan = customer ? plans.find((p) => p.id === customer.planId) : null;
  
  if (loading) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header title="Detalhes do Cliente" />
            <main className="flex-1 flex">
                 <PageSkeleton />
            </main>
        </div>
    )
  }

  if (!customer) {
    notFound();
  }

  // Redireciona se o status for 'Em teste'
  if (customer.status === 'Em teste') {
    router.replace(`/testes/${customer.id}`);
    return (
       <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Detalhes do Cliente" />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div>
            <Button asChild variant="outline" size="sm">
                <Link href="/clientes">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para a lista de clientes
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
                                <Badge variant="outline" className={cn("text-sm", statusConfig[customer.status]?.text || '')}>
                                    <span className={cn("h-2 w-2 rounded-full mr-2", statusConfig[customer.status]?.color || '')}></span>
                                    {customer.status}
                                </Badge>
                            </CardDescription>
                        </div>
                         <EditCustomerForm customer={customer} plans={plans} servers={servers}>
                            <Button variant="outline" size="sm">
                                <Pencil className="w-4 h-4 mr-2"/>
                                Editar Cliente
                            </Button>
                        </EditCustomerForm>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground">Dados de Acesso e IDs</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <CopyableField icon={User} label="Usuário IPTV" value={customer.iptvUsername || ''} />
                                {customer.iptvPassword && (
                                    <CopyableField icon={ShieldCheck} label="Senha IPTV" value={customer.iptvPassword} />
                                )}
                                {customer.iptvUserId && (
                                    <CopyableField icon={KeyRound} label="ID IPTV" value={customer.iptvUserId} />
                                )}
                                {customer.managerId && (
                                    <CopyableField icon={UserCheck} label="ID do Gestor" value={customer.managerId} />
                                )}
                            </div>
                        </div>

                        <Separator/>
                        
                        <div className="space-y-4">
                             <h4 className="text-sm font-medium text-muted-foreground">Informações de Contato e Acesso</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <CopyableField icon={Mail} label="Email" value={customer.email || "Não informado"} />
                                <CopyableField icon={Phone} label="WhatsApp" value={customer.whatsapp || "Não informado"} />
                                {customer.uniqueLink && (
                                    <CopyableField icon={LinkIcon} label="Link da Área do Cliente" value={customer.uniqueLink} />
                                )}
                                <div className="flex items-center gap-3 text-sm">
                                    <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Membro desde</p>
                                        <span><FormattedDate dateString={customer.startDate} format="dd 'de' LLLL, yyyy" /></span>
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
                <PaymentHistory payments={customer.paymentHistory} />
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tv className="w-5 h-5" /> Assinatura</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">{plan?.name}</p>
                            <p className="text-sm text-muted-foreground">R$ {plan?.price.toFixed(2)} / {plan?.validity} dias</p>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ScreenShare className="w-4 h-4" />
                                <span>{plan?.screens} Conexão(ões)</span>
                            </div>
                        </div>
                        <Separator/>
                        <div>
                            <p className="text-sm text-muted-foreground">Expira em</p>
                            <p className="font-semibold"><FormattedDate dateString={customer.expirationDate} format="dd 'de' LLLL, yyyy" /></p>
                        </div>
                    </CardContent>
                    {plan && (
                        <CardFooter>
                            <RenewButton customerId={customer.id} planId={plan.id} serverId={customer.serverId} />
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
