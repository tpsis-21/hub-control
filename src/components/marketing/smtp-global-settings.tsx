"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Settings, Shuffle, Mail, MessageSquare } from 'lucide-react';
import type { SMTPConfig, SMTPSettings } from '@/lib/types/marketing';

interface SMTPGlobalSettingsProps {
  configs: SMTPConfig[];
  onSettingsChange?: (settings: SMTPSettings) => void;
}

export function SMTPGlobalSettings({ configs, onSettingsChange }: SMTPGlobalSettingsProps) {
  const [settings, setSettings] = useState<SMTPSettings>({
    enableRandomization: false,
    defaultNotificationSMTP: '',
    defaultMarketingSMTP: '',
    rotationStrategy: 'priority'
  });
  const [loading, setLoading] = useState(false);

  // Filtrar configurações por tipo
  const notificationConfigs = configs.filter(config => config.useForNotifications && config.isActive);
  const marketingConfigs = configs.filter(config => config.useForMarketing && config.isActive);

  const loadSettings = async () => {
    try {
      // TODO: Implementar carregamento das configurações da API
      // const response = await MarketingService.getSMTPSettings()
      // setSettings(response)
      
      // Mock data para demonstração
      setSettings({
        enableRandomization: true,
        defaultNotificationSMTP: notificationConfigs[0]?.id || '',
        defaultMarketingSMTP: marketingConfigs[0]?.id || '',
        rotationStrategy: 'priority'
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações globais',
        variant: 'destructive'
      });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // TODO: Implementar salvamento das configurações na API
      // await MarketingService.updateSMTPSettings(settings)
      
      toast({
        title: 'Sucesso',
        description: 'Configurações globais salvas com sucesso!'
      });
      
      onSettingsChange?.(settings);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações globais',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = (key: keyof SMTPSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    loadSettings();
  }, [configs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações Globais SMTP</h2>
          <p className="text-muted-foreground">
            Configure como os SMTPs serão utilizados no sistema
          </p>
        </div>
        <Button onClick={saveSettings} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* Randomização */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shuffle className="h-5 w-5" />
            <CardTitle>Randomização de SMTP</CardTitle>
          </div>
          <CardDescription>
            Configure se o sistema deve alternar entre diferentes SMTPs automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar Randomização</Label>
              <p className="text-sm text-muted-foreground">
                Alterna automaticamente entre SMTPs disponíveis para distribuir a carga
              </p>
            </div>
            <Switch
              checked={settings.enableRandomization}
              onCheckedChange={(checked) => updateSettings('enableRandomization', checked)}
            />
          </div>

          {settings.enableRandomization && (
            <div className="space-y-2">
              <Label>Estratégia de Rotação</Label>
              <Select
                value={settings.rotationStrategy}
                onValueChange={(value) => updateSettings('rotationStrategy', value as 'priority' | 'random' | 'round_robin')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Por Prioridade</SelectItem>
                  <SelectItem value="random">Aleatório</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.rotationStrategy === 'priority' && 'Usa SMTPs com menor prioridade primeiro'}
                {settings.rotationStrategy === 'random' && 'Seleciona SMTPs aleatoriamente'}
                {settings.rotationStrategy === 'round_robin' && 'Alterna entre SMTPs em sequência'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMTPs Padrão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SMTP Padrão para Notificações */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <CardTitle>SMTP para Notificações</CardTitle>
            </div>
            <CardDescription>
              SMTP usado para avisos de vencimento, lembretes e notificações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SMTP Padrão</Label>
              <Select
                value={settings.defaultNotificationSMTP}
                onValueChange={(value) => updateSettings('defaultNotificationSMTP', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um SMTP" />
                </SelectTrigger>
                <SelectContent>
                  {notificationConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      <div className="flex items-center space-x-2">
                        <span>{config.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Prioridade {config.priority}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {notificationConfigs.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                Nenhum SMTP configurado para notificações. Configure pelo menos um SMTP com "Usar para Notificações" habilitado.
              </div>
            )}

            {notificationConfigs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">SMTPs Disponíveis ({notificationConfigs.length})</Label>
                <div className="space-y-1">
                  {notificationConfigs.map((config) => (
                    <div key={config.id} className="flex items-center justify-between text-sm p-2 border rounded">
                      <span>{config.name}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          P{config.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {config.currentDailyCount || 0}/{config.dailyLimit || 1000}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMTP Padrão para Marketing */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle>SMTP para Marketing</CardTitle>
            </div>
            <CardDescription>
              SMTP usado para campanhas de email marketing e comunicações promocionais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SMTP Padrão</Label>
              <Select
                value={settings.defaultMarketingSMTP}
                onValueChange={(value) => updateSettings('defaultMarketingSMTP', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um SMTP" />
                </SelectTrigger>
                <SelectContent>
                  {marketingConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      <div className="flex items-center space-x-2">
                        <span>{config.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Prioridade {config.priority}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {marketingConfigs.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                Nenhum SMTP configurado para marketing. Configure pelo menos um SMTP com "Usar para Marketing" habilitado.
              </div>
            )}

            {marketingConfigs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">SMTPs Disponíveis ({marketingConfigs.length})</Label>
                <div className="space-y-1">
                  {marketingConfigs.map((config) => (
                    <div key={config.id} className="flex items-center justify-between text-sm p-2 border rounded">
                      <span>{config.name}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          P{config.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {config.currentDailyCount || 0}/{config.dailyLimit || 1000}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
