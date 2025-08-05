'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Zap, Server as ServerIcon, Clock, MessageSquare } from 'lucide-react';
import { addAutomaticTestSchema } from '@/lib/schemas';
import { addAutomaticTestAction, getServersWithIntegration } from '@/app/(app)/testes/actions';
import { Server } from '@/lib/types';
import { toast } from 'sonner';

interface AutomaticTestFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

type FormData = z.infer<typeof addAutomaticTestSchema>;

export function AutomaticTestForm({ onBack, onSuccess }: AutomaticTestFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(addAutomaticTestSchema),
    defaultValues: {
      testDurationHours: 3,
      sendMessage: true,
      messageChannel: 'whatsapp'
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const watchedValues = watch();

  useEffect(() => {
    async function loadServers() {
      try {
        const serversWithIntegration = await getServersWithIntegration();
        setServers(serversWithIntegration);
      } catch (error) {
        console.error('Erro ao carregar servidores:', error);
        toast.error('Erro ao carregar servidores com integração');
      } finally {
        setLoadingServers(false);
      }
    }
    loadServers();
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await addAutomaticTestAction(data);
      if (result.success) {
        toast.success('Teste automático criado com sucesso!');
        if (result.credits !== null) {
          toast.info(`Créditos atualizados: ${result.credits}`);
        }
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao criar teste automático');
      }
    } catch (error) {
      console.error('Erro ao criar teste automático:', error);
      toast.error('Erro inesperado ao criar teste automático');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingServers) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando servidores...</span>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ServerIcon className="w-5 h-5" />
            Nenhum Servidor Disponível
          </CardTitle>
          <CardDescription>
            Não há servidores com integração configurada para testes automáticos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para criar testes automáticos, você precisa ter pelo menos um servidor com:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li>Integração configurada (NATV, etc.)</li>
            <li>Automação de teste habilitada</li>
            <li>Chave de API válida</li>
          </ul>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => window.location.href = '/servidores'}>
              Configurar Servidores
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Teste Automático
            </CardTitle>
            <CardDescription>
              Configure os dados para criação automática do teste
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              <Badge variant="secondary">Opcional</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testName">Nome do Teste</Label>
                <Input
                  id="testName"
                  placeholder="Ex: Teste Cliente João"
                  {...register('testName')}
                />
                {errors.testName && (
                  <p className="text-sm text-destructive">{errors.testName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="iptvUsername">Usuário IPTV</Label>
                <Input
                  id="iptvUsername"
                  placeholder="Ex: usuario123"
                  {...register('iptvUsername')}
                />
                {errors.iptvUsername && (
                  <p className="text-sm text-destructive">{errors.iptvUsername.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@exemplo.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Configurações do Teste */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Configurações do Teste
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serverId">Servidor *</Label>
                <Select onValueChange={(value) => setValue('serverId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um servidor" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        <div className="flex items-center gap-2">
                          <span>{server.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {server.integrationType?.toUpperCase()}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.serverId && (
                  <p className="text-sm text-destructive">{errors.serverId.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="testDurationHours">Duração (horas) *</Label>
                <Select 
                  onValueChange={(value) => setValue('testDurationHours', Number(value))}
                  defaultValue="3"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.25">15 minutos</SelectItem>
                    <SelectItem value="0.5">30 minutos</SelectItem>
                    <SelectItem value="1">1 hora</SelectItem>
                    <SelectItem value="2">2 horas</SelectItem>
                    <SelectItem value="3">3 horas</SelectItem>
                    <SelectItem value="6">6 horas</SelectItem>
                  </SelectContent>
                </Select>
                {errors.testDurationHours && (
                  <p className="text-sm text-destructive">{errors.testDurationHours.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Configurações de Mensagem */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Envio de Mensagens
            </h3>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="sendMessage"
                checked={watchedValues.sendMessage}
                onCheckedChange={(checked) => setValue('sendMessage', checked)}
              />
              <Label htmlFor="sendMessage">
                Enviar mensagem com dados do teste
              </Label>
            </div>
            
            {watchedValues.sendMessage && (
              <div className="space-y-4 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label>Canal de Envio</Label>
                  <Select 
                    onValueChange={(value: 'email' | 'whatsapp') => setValue('messageChannel', value)}
                    defaultValue="whatsapp"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {watchedValues.messageChannel === 'email' 
                    ? 'Certifique-se de fornecer um e-mail válido acima.'
                    : 'Certifique-se de fornecer um telefone válido acima.'
                  }
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-6">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando Teste...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Criar Teste Automático
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}