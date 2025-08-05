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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, User, Clock, Settings } from 'lucide-react';
import { addManualTestSchema } from '@/lib/schemas';
import { addManualTestAction } from '@/app/(app)/testes/actions';
import { getServers } from '@/app/(app)/servidores/actions';
import { Server } from '@/lib/types';
import { toast } from 'sonner';

interface ManualTestFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

type FormData = z.infer<typeof addManualTestSchema>;

export function ManualTestForm({ onBack, onSuccess }: ManualTestFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(addManualTestSchema),
    defaultValues: {
      testDurationHours: 3,
    }
  });

  const { register, handleSubmit, setValue, formState: { errors } } = form;

  useEffect(() => {
    async function loadServers() {
      try {
        const allServers = await getServers();
        setServers(allServers);
      } catch (error) {
        console.error('Erro ao carregar servidores:', error);
        toast.error('Erro ao carregar servidores');
      } finally {
        setLoadingServers(false);
      }
    }
    loadServers();
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = await addManualTestAction(data);
      if (result.success) {
        toast.success('Teste manual criado com sucesso!');
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao criar teste manual');
      }
    } catch (error) {
      console.error('Erro ao criar teste manual:', error);
      toast.error('Erro inesperado ao criar teste manual');
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

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Teste Manual
            </CardTitle>
            <CardDescription>
              Insira manualmente os dados do teste
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações do Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo do cliente"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(11) 99999-9999"
                  {...register('whatsapp')}
                />
                {errors.whatsapp && (
                  <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  {...register('cpf')}
                />
                {errors.cpf && (
                  <p className="text-sm text-destructive">{errors.cpf.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Dados IPTV */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Dados IPTV
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iptvUsername">Usuário IPTV *</Label>
                <Input
                  id="iptvUsername"
                  placeholder="usuario_iptv"
                  {...register('iptvUsername')}
                />
                {errors.iptvUsername && (
                  <p className="text-sm text-destructive">{errors.iptvUsername.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="iptvPassword">Senha IPTV *</Label>
                <Input
                  id="iptvPassword"
                  type="password"
                  placeholder="senha_iptv"
                  {...register('iptvPassword')}
                />
                {errors.iptvPassword && (
                  <p className="text-sm text-destructive">{errors.iptvPassword.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="iptvUserId">ID do Usuário IPTV</Label>
              <Input
                id="iptvUserId"
                placeholder="ID único do usuário"
                {...register('iptvUserId')}
              />
              {errors.iptvUserId && (
                <p className="text-sm text-destructive">{errors.iptvUserId.message}</p>
              )}
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
                <Label htmlFor="serverId">Servidor</Label>
                <Select onValueChange={(value) => setValue('serverId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um servidor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        <div className="flex items-center gap-2">
                          <span>{server.name}</span>
                          {server.integrationType !== 'none' && (
                            <Badge variant="outline" className="text-xs">
                              {server.integrationType?.toUpperCase()}
                            </Badge>
                          )}
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
                    <SelectItem value="12">12 horas</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                  </SelectContent>
                </Select>
                {errors.testDurationHours && (
                  <p className="text-sm text-destructive">{errors.testDurationHours.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="planId">Plano</Label>
              <Input
                id="planId"
                placeholder="ID do plano (opcional)"
                {...register('planId')}
              />
              {errors.planId && (
                <p className="text-sm text-destructive">{errors.planId.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações adicionais sobre o teste..."
                rows={3}
                {...register('notes')}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
            </div>
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
                  <User className="w-4 h-4 mr-2" />
                  Criar Teste Manual
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}