'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import { getSystemSettings, updateSystemSetting, areRegistrationsAllowed } from '@/lib/system-settings';
import { updateExpiredClientsStatus } from '@/lib/client-status-updater';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Users, Settings, UserCheck, UserX, RefreshCw, AlertTriangle, Calendar, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/utils/production-logger'

interface User {
  id: string;
  email?: string;
  role: 'admin' | 'user';
  created_at: string;
}

interface SystemSetting {
  setting_key: string;
  setting_value: string;
  description: string;
}

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<Date | null>(null);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    recentUsers: 0
  });

  const supabase = createBrowserSupabaseClient();

  const loadUsers = useCallback(async () => {
    try {
      // Buscar usuários da tabela auth.users e profiles
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        // Fallback: buscar apenas da tabela profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*');
        
        if (profileError) {
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar os usuários.',
            variant: 'destructive'
          });
          return;
        }
        
        setUsers(profiles || []);
      } else {
        // Combinar dados de auth.users com profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*');
        
        const combinedUsers = authUsers.users.map(authUser => {
          const profile = profiles?.find(p => p.id === authUser.id);
          return {
            id: authUser.id,
            email: authUser.email || '',
            role: profile?.role || 'user',
            created_at: authUser.created_at
          };
        });
        
        setUsers(combinedUsers);
        
        // Calcular estatísticas dos usuários
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        setUserStats({
          totalUsers: combinedUsers.length,
          adminUsers: combinedUsers.filter(u => u.role === 'admin').length,
          regularUsers: combinedUsers.filter(u => u.role === 'user').length,
          recentUsers: combinedUsers.filter(u => new Date(u.created_at) > thirtyDaysAgo).length
        });
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar usuários.',
        variant: 'destructive'
      });
    }
  }, [supabase]);

  const loadSettings = useCallback(async () => {
    try {
      const systemSettings = await getSystemSettings();
      const registrationsAllowed = await areRegistrationsAllowed();
      
      setSettings([
        {
          setting_key: 'allow_new_registrations',
          setting_value: registrationsAllowed.toString(),
          description: 'Permite que novos usuários se cadastrem no sistema'
        }
      ]);
      setAllowRegistrations(registrationsAllowed);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadSettings();
  }, [loadUsers, loadSettings]);

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível atualizar o papel do usuário.',
          variant: 'destructive'
        });
        return;
      }
      
      toast({
        title: 'Sucesso',
        description: `Papel do usuário atualizado para ${newRole}.`
      });
      
      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar papel:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar papel do usuário.',
        variant: 'destructive'
      });
    }
  };

  const toggleRegistrations = async (enabled: boolean) => {
    try {
      const success = await updateSystemSetting('allow_new_registrations', enabled);
      
      if (success) {
        setAllowRegistrations(enabled);
        
        toast({
          title: 'Configuração atualizada',
          description: `Novos cadastros ${enabled ? 'habilitados' : 'desabilitados'}.`
        });
        
        // Atualizar a lista de configurações
        loadSettings();
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível atualizar a configuração.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar configuração.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateExpiredStatus = async () => {
    setStatusUpdateLoading(true);
    try {
      const result = await updateExpiredClientsStatus();
      
      if (result.success) {
        setLastStatusUpdate(new Date());
        toast({
          title: 'Sucesso',
          description: `${result.updatedCount} clientes tiveram o status atualizado.`,
        });
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao atualizar status dos clientes.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status dos clientes.',
        variant: 'destructive'
      });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'admin') {
      toast({
        title: 'Erro',
        description: 'Não é possível excluir um usuário administrador.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Primeiro, deletar da tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      // Tentar deletar do auth (pode falhar se não tiver permissões admin)
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authError) {
        logger.warn('Não foi possível deletar do auth:', authError);
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso.'
      });
      
      loadUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir usuário.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <Badge variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Admin
        </Badge>
      </div>

      {/* Estatísticas dos Usuários */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuários registrados no sistema
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.adminUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuários com privilégios admin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Regulares</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.regularUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuários sem privilégios admin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos (30 dias)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.recentUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuários criados nos últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configurações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Sistema
          </CardTitle>
          <CardDescription>
            Gerencie as configurações globais da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Permitir novos cadastros</h3>
              <p className="text-sm text-muted-foreground">
                Controla se novos usuários podem se cadastrar no sistema
              </p>
            </div>
            <Switch
              checked={allowRegistrations}
              onCheckedChange={toggleRegistrations}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ferramentas de Manutenção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Ferramentas de Manutenção
          </CardTitle>
          <CardDescription>
            Ferramentas para manutenção e otimização do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-medium">Atualizar Status de Clientes</h3>
              <p className="text-sm text-muted-foreground">
                Verifica e atualiza automaticamente o status dos clientes com base na data de expiração
              </p>
              {lastStatusUpdate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Última atualização: {lastStatusUpdate.toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <Button
              onClick={handleUpdateExpiredStatus}
              disabled={statusUpdateLoading}
              className="flex items-center gap-2"
            >
              {statusUpdateLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {statusUpdateLoading ? 'Atualizando...' : 'Atualizar Status'}
            </Button>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Informação</AlertTitle>
            <AlertDescription>
              Esta ferramenta verifica todos os clientes ativos ou em teste e atualiza automaticamente 
              para "Inativo" aqueles cuja data de expiração já passou.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Gerenciamento de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciamento de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie usuários e suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário encontrado.
              </p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{user.email}</h3>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                      >
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user.role === 'admin' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUserRole(user.id, 'user')}
                        className="flex items-center gap-1"
                      >
                        <UserX className="h-4 w-4" />
                        Remover Admin
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUserRole(user.id, 'admin')}
                        className="flex items-center gap-1"
                      >
                        <UserCheck className="h-4 w-4" />
                        Tornar Admin
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
