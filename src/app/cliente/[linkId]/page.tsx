// @/app/cliente/[linkId]/page.tsx
import { getClientes } from "@/app/(app)/clientes/actions";
import { getPlans } from "@/app/(app)/planos/actions";
import { getArticles } from "@/app/(app)/ajuda/actions"; // Importar a nova action
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tv, ShieldCheck, User, AlertCircle, HelpCircle, Film, CheckCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CopyableField } from "@/components/app/copyable-field";
import { FormattedDate } from "@/components/app/formatted-date";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { KnowledgeBaseArticle, Client, Plan } from "@/lib/types";
import ContentSuggestion from "@/components/app/ContentSuggestion";
import { RenewalPlanCard } from "@/components/cliente/renewal-plan-card";
import { getClientCheckoutOptions } from "@/lib/checkout/client-checkout-options";

const statusConfig = {
  'Ativo': { color: 'bg-green-500', text: 'Ativo' },
  'Em teste': { color: 'bg-yellow-500', text: 'Em Teste' },
  'Inativo': { color: 'bg-gray-500', text: 'Inativo' },
  'Bloqueado': { color: 'bg-red-500', text: 'Bloqueado' },
};

async function getCustomerByLink(linkId: string): Promise<Client | undefined> {
    const fullLink = `/cliente/link_${linkId}`;
    const clients = await getClientes({ uniqueLink: fullLink });
    return clients[0];
}

function KnowledgeBaseSection({ articles }: { articles: KnowledgeBaseArticle[] }) {
  if (articles.length === 0) return null;

  const groupedArticles = articles.reduce((acc, article) => {
    (acc[article.category] = acc[article.category] || []).push(article);
    return acc;
  }, {} as Record<KnowledgeBaseArticle['category'], KnowledgeBaseArticle[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Base de Conhecimento
        </CardTitle>
        <CardDescription>
          Encontre respostas para as dúvidas mais comuns e tutoriais úteis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {Object.entries(groupedArticles).map(([category, items]) => (
          <div key={category} className="mb-4">
            <h4 className="text-lg font-semibold mb-2">{category}</h4>
            <Accordion type="single" collapsible className="w-full">
              {items.map(item => (
                <AccordionItem value={item.id} key={item.id}>
                  <AccordionTrigger>{item.title}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-wrap text-muted-foreground">
                    {item.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default async function ClientAreaPage({ params }: any) {
    const [customer, allPlans, allArticles] = await Promise.all([
      getCustomerByLink(params.linkId),
      getPlans(),
      getArticles() // Buscar os artigos
    ]);

    if (!customer) {
        return (
            <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 p-4">
                 <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                           <AlertCircle className="h-6 w-6" /> Acesso Inválido
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>O link de acesso que você utilizou é inválido ou expirou. Por favor, entre em contato com o suporte para obter ajuda.</p>
                    </CardContent>
                     <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/">Voltar ao Início</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    const currentPlan = allPlans.find(p => p.id === customer.planId);
    const customerStatus = statusConfig[customer.status] || statusConfig['Inativo'];
    const renewalPlans = currentPlan?.group_id
        ? allPlans.filter(p => p.group_id === currentPlan.group_id && p.is_public)
        : [];
    
    // Mock data, replace with real data from settings later
    const supportLink = "https://wa.me/5511999998888"; 
    const contentRequestLink = "https://forms.gle/exemplo";
    const publicArticles = allArticles.filter(a => a.isPublic);
    const checkoutOptions = await getClientCheckoutOptions(
      customer.id,
      customer.serverId ?? null,
      customer.managerId ?? null
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background">
            <header className="bg-primary text-primary-foreground py-4 shadow-md">
                 <div className="container mx-auto px-4">
                    <h1 className="text-2xl font-bold">Área do Cliente</h1>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-6 space-y-8">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <span>Olá, {customer.name}!</span>
                                     <Badge variant="outline" className={cn("text-sm w-fit")}>
                                        <span className={cn("h-2 w-2 rounded-full mr-2", customerStatus.color)}></span>
                                        {customerStatus.text}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>Aqui estão os detalhes da sua assinatura e acesso.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2"><Tv className="w-5 h-5 text-primary" />Sua Assinatura</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Plano Atual</p>
                                            <p className="font-medium">{currentPlan?.name}</p>
                                        </div>
                                         <div>
                                            <p className="text-sm text-muted-foreground">Sua assinatura vence em</p>
                                            <p className="font-semibold text-lg"><FormattedDate dateString={customer.expirationDate} format="dd 'de' LLLL, yyyy" /></p>
                                        </div>
                                    </div>
                                </div>
                                 <Separator />
                                <div className="space-y-4">
                                     <h3 className="font-semibold text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" />Seus Dados de Acesso</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                                        <CopyableField icon={User} label="Usuário IPTV" value={customer.iptvUsername || ''} />
                                        {customer.iptvPassword && (
                                             <CopyableField icon={ShieldCheck} label="Senha IPTV" value={customer.iptvPassword} />
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {renewalPlans.length > 0 && checkoutOptions.paymentEnabled && customer.uniqueLink && (
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><CheckCircle className="w-6 h-6 text-green-600" />Renove ou troque seu plano</CardTitle>
                                    <CardDescription>Escolha o plano, a forma de pagamento (PIX ou cartão) e confirme.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renewalPlans.map(plan => (
                                        <RenewalPlanCard
                                          key={plan.id}
                                          uniqueLink={customer.uniqueLink!}
                                          plan={plan}
                                          checkoutOptions={checkoutOptions}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                        {renewalPlans.length > 0 && !checkoutOptions.paymentEnabled && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Renovação</CardTitle>
                              <CardDescription>
                                Pagamento online não está habilitado para seu servidor. Entre em contato com o suporte.
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        )}
                         <KnowledgeBaseSection articles={publicArticles} />
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Links Úteis</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href={supportLink} target="_blank">
                                        <HelpCircle className="mr-2 h-4 w-4" /> Suporte ao Cliente
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href={contentRequestLink} target="_blank">
                                        <Film className="mr-2 h-4 w-4" /> Pedir Filmes ou Séries
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                        <ContentSuggestion />
                    </div>
                </div>
            </main>
        </div>
    );
}
