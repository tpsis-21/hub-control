"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Trash2, 
  Eye, 
  Shield, 
  FileText, 
  Mail, 
  CheckCircle, 
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/hooks/use-loading";
import { Loading } from "@/components/ui/loading";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logger } from '@/utils/production-logger'

export default function LGPDPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  
  const exportLoading = useLoading();
  const deleteLoading = useLoading();
  const accessLoading = useLoading();

  const handleDataExport = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, informe seu e-mail.",
        variant: "destructive"
      });
      return;
    }

    await exportLoading.executeAsync(async () => {
      // Simular chamada para API de exportação
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Aqui seria a implementação real da exportação
      const userData = {
        email,
        profile: "Dados do perfil",
        activity: "Histórico de atividades",
        consent: "Histórico de consentimentos",
        exportDate: new Date().toISOString()
      };
      
      // Download do arquivo JSON
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dados-pessoais-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Exportação concluída",
        description: "Seus dados foram exportados com sucesso."
      });
    });
  };

  const handleDataDeletion = async () => {
    if (!email || !deleteReason) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    await deleteLoading.executeAsync(async () => {
      // Simular chamada para API de exclusão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Aqui seria a implementação real da exclusão
      logger.debug('Solicitação de exclusão:', { email, reason: deleteReason });
      
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de exclusão foi registrada e será processada em até 30 dias."
      });
      
      setEmail("");
      setDeleteReason("");
    });
  };

  const handleDataAccess = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, informe seu e-mail.",
        variant: "destructive"
      });
      return;
    }

    await accessLoading.executeAsync(async () => {
      // Simular chamada para API de acesso
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Dados simulados
      const mockData = [
        {
          date: "2024-01-15",
          action: "Consentimento aceito",
          details: "Política de Privacidade v1.0"
        },
        {
          date: "2024-01-10",
          action: "Conta criada",
          details: "Registro inicial no sistema"
        }
      ];
      
      setConsentHistory(mockData);
      
      toast({
        title: "Dados carregados",
        description: "Histórico de consentimentos atualizado."
      });
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold mb-2">Direitos LGPD</h1>
        <p className="text-muted-foreground">
          Gerencie seus dados pessoais e exerça seus direitos conforme a Lei Geral de Proteção de Dados.
        </p>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Dados
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Acessar Dados
          </TabsTrigger>
          <TabsTrigger value="delete" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Excluir Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exportação de Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Você tem o direito de receber uma cópia de todos os seus dados pessoais que processamos. 
                  O arquivo será enviado em formato JSON.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="export-email">E-mail</Label>
                <Input
                  id="export-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleDataExport} 
                disabled={exportLoading.isLoading}
                className="w-full"
              >
                {exportLoading.isLoading ? (
                  <Loading variant="spinner" size="sm" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Meus Dados
                  </>
                )}
              </Button>
              
              {exportLoading.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {exportLoading.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Acesso aos Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Visualize quais dados pessoais temos sobre você e como eles são utilizados.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="access-email">E-mail</Label>
                <Input
                  id="access-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleDataAccess} 
                disabled={accessLoading.isLoading}
                className="w-full"
              >
                {accessLoading.isLoading ? (
                  <Loading variant="spinner" size="sm" />
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar Meus Dados
                  </>
                )}
              </Button>
              
              {consentHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Histórico de Consentimentos</h3>
                  <div className="space-y-2">
                    {consentHistory.map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.action}</span>
                          <span className="text-sm text-muted-foreground">{item.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delete">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Exclusão de Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Esta ação é irreversível. Todos os seus dados serão 
                  permanentemente removidos de nossos sistemas.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="delete-email">E-mail</Label>
                <Input
                  id="delete-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delete-reason">Motivo da exclusão</Label>
                <Textarea
                  id="delete-reason"
                  placeholder="Por favor, informe o motivo da solicitação de exclusão..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleDataDeletion} 
                disabled={deleteLoading.isLoading}
                variant="destructive"
                className="w-full"
              >
                {deleteLoading.isLoading ? (
                  <Loading variant="spinner" size="sm" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Solicitar Exclusão dos Dados
                  </>
                )}
              </Button>
              
              {deleteLoading.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {deleteLoading.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Links Úteis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/privacy-policy">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Política de Privacidade
                </Button>
              </Link>
              <Link href="/terms">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Termos de Uso
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
