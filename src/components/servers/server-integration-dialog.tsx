"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, RefreshCw, AlertCircle, CheckCircle, Clock, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Server } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServerIntegrationDialogProps {
  server: Server;
  children: React.ReactNode;
}

export function ServerIntegrationDialog({ server, children }: ServerIntegrationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const getIntegrationName = (type: Server['integrationType']) => {
    switch (type) {
      case 'natv': return "NATV";
      case 'pixbot': return "Pixbot";
      case 'generic': return "Genérico";
      default: return "Manual";
    }
  };

  const getIntegrationStatus = () => {
    if (server.integrationType === 'none') {
      return { status: 'manual', label: 'Manual', color: 'secondary' };
    }
    if (!server.apiKey) {
      return { status: 'not_configured', label: 'Não Configurado', color: 'destructive' };
    }
    return { status: 'configured', label: 'Configurado', color: 'success' };
  };

  const getCreditsStatus = (credits: number | null | undefined): { level: string; color: string; label: string } => {
    if (credits === null || credits === undefined) return { level: 'unknown', color: 'secondary', label: 'Desconhecido' };
    if (credits >= 100) return { level: 'high', color: 'success', label: 'Alto' };
    if (credits >= 50) return { level: 'medium', color: 'warning', label: 'Médio' };
    if (credits >= 10) return { level: 'low', color: 'warning', label: 'Baixo' };
    return { level: 'critical', color: 'destructive', label: 'Crítico' };
  };

  const handleRefreshCredits = async () => {
    setIsRefreshing(true);
    try {
      const { syncServerCredits } = await import('@/app/(app)/testes/actions');
      const result = await syncServerCredits(server.id);
      
      if (result.success) {
        toast({
          title: "Créditos atualizados",
          description: `Créditos sincronizados: ${result.credits}`,
        });
        // Recarregar a página para atualizar os dados
        window.location.reload();
      } else {
        toast({
          title: "Erro ao atualizar créditos",
          description: result.error || "Não foi possível sincronizar os créditos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao atualizar créditos",
        description: "Erro interno ao sincronizar os créditos.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const integrationStatus = getIntegrationStatus();
  const creditsStatus = getCreditsStatus(server.credits);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gerenciamento de Integração - {server.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status da Integração */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {integrationStatus.status === 'configured' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : integrationStatus.status === 'not_configured' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Settings className="h-5 w-5 text-gray-500" />
                )}
                Status da Integração
              </CardTitle>
              <CardDescription>
                Informações sobre a configuração da integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tipo de Integração:</span>
                <Badge variant="outline">{getIntegrationName(server.integrationType)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={integrationStatus.color as any}>{integrationStatus.label}</Badge>
              </div>
              {server.apiKey && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Chave API:</span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {server.apiKey.substring(0, 8)}...{server.apiKey.substring(server.apiKey.length - 4)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Técnicas</CardTitle>
              <CardDescription>
                Dados técnicos e identificadores do servidor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ID do Painel:</span>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {server.panelServerId || 'Não definido'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ID Interno:</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {server.id.substring(0, 8)}...{server.id.substring(server.id.length - 4)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Automações Ativas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Automações Ativas</CardTitle>
              <CardDescription>
                Funcionalidades automatizadas configuradas para este servidor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Teste Automático:</span>
                  <Badge variant={server.testAutomation ? "success" : "secondary"}>
                    {server.testAutomation ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Renovação Automática:</span>
                  <Badge variant={server.renewalAutomation ? "success" : "secondary"}>
                    {server.renewalAutomation ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Gateway de Pagamento:</span>
                  <Badge variant={server.paymentGateway ? "success" : "secondary"}>
                    {server.paymentGateway ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Lembrete de Vencimento:</span>
                  <Badge variant={server.sendExpirationReminder ? "success" : "secondary"}>
                    {server.sendExpirationReminder ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Créditos (apenas para integrações que suportam) */}
          {server.integrationType === 'natv' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Créditos NATV
                </CardTitle>
                <CardDescription>
                  Informações sobre os créditos disponíveis na integração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Créditos Disponíveis:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {server.credits !== null ? server.credits : '--'}
                    </span>
                    {server.credits !== null && (
                      <Badge variant={creditsStatus.color as any}>
                        {creditsStatus.label}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {server.lastCreditsSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Última Sincronização:</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(server.lastCreditsSync), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">Sincronizar Créditos</p>
                    <p className="text-xs text-muted-foreground">
                      Atualizar informações de créditos da API
                    </p>
                  </div>
                  <Button 
                    onClick={handleRefreshCredits} 
                    disabled={isRefreshing}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
                  </Button>
                </div>

                {server.credits !== null && creditsStatus.level === 'critical' && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Créditos críticos! Recarregue sua conta urgentemente.
                    </span>
                  </div>
                )}

                {server.credits !== null && creditsStatus.level === 'low' && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Créditos baixos! Considere recarregar sua conta.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
