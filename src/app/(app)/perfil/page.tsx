"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getBrowserUser, createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import { User, Mail, Calendar, Shield, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";

import { useRouter } from "next/navigation";
import { logger } from '@/utils/production-logger'

export default function PerfilPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company: "",
    avatar_url: "",
  });
  const [securityData, setSecurityData] = useState({
    newEmail: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        logger.debug('🔄 Iniciando carregamento dos dados do usuário...');
        
        // Obter usuário autenticado
        logger.debug('🔍 Chamando getBrowserUser...');
        const currentUser = await getBrowserUser();
        logger.debug('👤 Usuário obtido:', currentUser ? { id: currentUser.id, email: currentUser.email } : 'null');
        
        if (!currentUser) {
          logger.debug('❌ Usuário não encontrado - redirecionando para login');
          console.error('❌ Usuário não autenticado');
          toast({
            title: "Erro de Autenticação",
            description: "Você precisa estar logado para acessar esta página.",
            variant: "destructive",
          });
          return;
        }
        
        logger.debug('✅ Usuário autenticado:', currentUser.email);
        setUser(currentUser);
        
        const supabase = createBrowserSupabaseClient();
        logger.debug('🔗 Cliente Supabase:', supabase ? 'Inicializado' : 'Não inicializado');
        
        // Tentar buscar perfil por user_id primeiro
        logger.debug('🔍 Buscando perfil por user_id:', currentUser.id);
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
        
        logger.debug('📊 Resultado da busca por user_id:', { 
          profile: profile ? { id: profile.id, user_id: profile.user_id } : null, 
          profileError: profileError ? { code: profileError.code, message: profileError.message } : null 
        });
        
        // Se não encontrar por user_id, tentar por id
        if (profileError && profileError.code === 'PGRST116') {
          logger.debug('🔍 Perfil não encontrado por user_id, tentando por id:', currentUser.id);
          const { data: profileById, error: profileByIdError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          
          logger.debug('📊 Resultado da busca por id:', { 
            profileById: profileById ? { id: profileById.id, user_id: profileById.user_id } : null, 
            profileByIdError: profileByIdError ? { code: profileByIdError.code, message: profileByIdError.message } : null 
          });
          
          if (!profileByIdError) {
            logger.debug('✅ Perfil encontrado por id');
            profile = profileById;
            profileError = null;
          } else {
            logger.debug('⚠️ Perfil não encontrado, criando novo...');
            logger.debug('🆕 Criando novo perfil para o usuário:', currentUser.id);
            logger.debug('📝 Dados do usuário para criação:', {
              id: currentUser.id,
              email: currentUser.email,
              metadata: currentUser.user_metadata
            });
            
            // Criar perfil se não existir
            const newProfileData = {
              id: currentUser.id,
              user_id: currentUser.id,
              full_name: currentUser.user_metadata?.full_name || '',
              role: (currentUser.email === 'topplaytv7@gmail.com' ? 'admin' : 'user') as 'admin' | 'user',
              approved: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            logger.debug('📝 Perfil a ser criado:', newProfileData);
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert(newProfileData)
              .select()
              .single();
            
            logger.debug('📊 Resultado da criação do perfil:', { 
              newProfile: newProfile ? { id: newProfile.id, user_id: newProfile.user_id } : null, 
              createError: createError ? { code: createError.code, message: createError.message } : null 
            });
            
            if (createError) {
              console.error('❌ Erro ao criar perfil:', createError);
            } else {
              logger.debug('✅ Perfil criado com sucesso');
              profile = newProfile;
              profileError = null;
            }
          }
        }
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Erro ao buscar perfil:', profileError);
          console.error('🔍 Detalhes completos do erro de perfil:', {
            code: profileError?.code,
            message: profileError?.message,
            details: profileError?.details,
            hint: profileError?.hint,
            stack: profileError?.stack
          });
          throw profileError;
        }
        
        logger.debug('📋 Perfil carregado:', profile);
        setUserProfile(profile);
        
        if (profile) {
          setFormData({
            full_name: profile.full_name || "",
            phone: profile.phone || "",
            company: profile.company || "",
            avatar_url: profile.avatar_url || "",
          });
        }
        
      } catch (error: any) {
        console.error('🚨 Erro ao carregar dados do usuário:', {
        message: error?.message || 'Erro desconhecido',
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      });
        console.error('🔍 Detalhes completos do erro:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
          cause: error?.cause,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          toString: error?.toString(),
          valueOf: error?.valueOf()
        });
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do perfil.",
          variant: "destructive",
        });
      } finally {
        logger.debug('🏁 Finalizando carregamento dos dados');
        setLoading(false);
      }
    };

    loadUserData();
  }, [toast]);

  const handleSave = async () => {
    try {
      console.log('💾 [PerfilPage] Iniciando salvamento do perfil');
      console.log('💾 [PerfilPage] FormData atual:', formData);
      
      setSaving(true);
      
      const user = await getBrowserUser();
      
      console.log('👤 [PerfilPage] Usuário obtido:', {
        user: user ? { id: user.id, email: user.email } : null
      });
      
      if (!user) {
        console.error('❌ [PerfilPage] Usuário não autenticado');
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar se o user_id é válido (não vazio e é um UUID válido)
      if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
        console.error('🚨 [PerfilPage] User ID inválido:', user.id);
        toast({
          title: "Erro",
          description: "ID do usuário inválido. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar se o UUID tem formato válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user.id)) {
        console.error('❌ [PerfilPage] ID do usuário não é um UUID válido:', user.id);
        toast({
          title: "Erro",
          description: "Formato do ID do usuário inválido. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const supabase = createBrowserSupabaseClient();

      // Verificar se existe um perfil para este usuário
      console.log('🔍 [PerfilPage] Verificando perfil existente para user.id:', user.id);
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('🔍 [PerfilPage] Perfil existente encontrado:', existingProfile);

      if (checkError) {
        // Se o erro for de foreign key, significa que o user_id não existe
        if (checkError.message?.includes('foreign key') || checkError.message?.includes('violates')) {
          toast({
            title: "Erro de Autenticação",
            description: "Sua sessão expirou ou é inválida. Faça login novamente.",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Erro",
          description: `Erro ao verificar perfil existente: ${checkError.message}`,
          variant: "destructive",
        });
        return;
      }

      // Preparar dados para upsert (sem incluir id se não existir perfil)
      console.log('🔍 [PerfilPage] FormData before save:', formData);
      const profileData = existingProfile ? {
        id: existingProfile.id,
        user_id: user.id,
        full_name: formData.full_name || '',
        phone: formData.phone || '',
        company: formData.company || '',
        avatar_url: formData.avatar_url || '',
        updated_at: new Date().toISOString()
      } : {
        user_id: user.id,
        full_name: formData.full_name || '',
        phone: formData.phone || '',
        company: formData.company || '',
        avatar_url: formData.avatar_url || '',
        role: (user.email === 'topplaytv7@gmail.com' ? 'admin' : 'user') as 'admin' | 'user',
        approved: true,
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 [PerfilPage] Dados para upsert:', profileData);
      console.log('📸 [PerfilPage] Avatar URL sendo salvo:', profileData.avatar_url);

      const { data, error } = await supabase
        .from('profiles')
        .upsert([profileData] as any, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select();

      console.log('💾 [PerfilPage] Resultado do upsert:', {
        data,
        error,
        success: !error
      });

      if (error) {
        console.error('❌ [PerfilPage] Erro ao salvar perfil:', error);
        console.error('Erro detalhado do Supabase:', {
          message: error?.message || 'Mensagem não disponível',
          details: error?.details || 'Detalhes não disponíveis',
          hint: error?.hint || 'Dica não disponível',
          code: error?.code || 'Código não disponível',
          fullError: error ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : 'Erro é null/undefined'
        });
        
        // Se o erro for de foreign key, significa que o user_id não existe
        if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
          toast({
            title: "Erro de Autenticação",
            description: "Sua sessão expirou ou é inválida. Faça login novamente.",
            variant: "destructive",
          });
          return;
        }
        
        throw error;
      }

      console.log('✅ [PerfilPage] Perfil salvo com sucesso!');
      logger.debug('Perfil salvo com sucesso:', data);
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });

      // Recarregar dados do perfil
      console.log('🔄 [PerfilPage] Recarregando dados do perfil');
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (fetchError) {
        logger.warn('⚠️ Erro ao recarregar perfil:', fetchError);
      } else {
        setUserProfile(updatedProfile);
      }
      
    } catch (error: any) {
      console.error('❌ [PerfilPage] Erro no catch ao salvar perfil:', error);
      console.error('Erro ao salvar perfil:', error ? {
        message: error?.message || 'Erro desconhecido',
        stack: error?.stack || 'Stack não disponível',
        name: error?.name || 'Nome não disponível',
        cause: error?.cause || 'Causa não disponível',
        details: error?.details || 'Detalhes não disponíveis',
        hint: error?.hint || 'Dica não disponível',
        code: error?.code || 'Código não disponível',
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      } : 'Erro é null ou undefined - verifique o fluxo de execução');
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar perfil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      console.log('🏁 [PerfilPage] Salvamento finalizado');
    }
  };

  const handleEmailChange = async () => {
    if (!securityData.newEmail) {
      toast({
        title: "Erro",
        description: "Por favor, insira o novo e-mail.",
        variant: "destructive",
      });
      return;
    }

    setSecurityLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        email: securityData.newEmail
      });

      if (error) throw error;

      toast({
        title: "E-mail atualizado",
        description: "Verifique seu novo e-mail para confirmar a alteração.",
      });

      setSecurityData(prev => ({ ...prev, newEmail: "" }));
    } catch (error: any) {
      console.error('Erro ao alterar e-mail:', error ? {
        message: error?.message || 'Erro desconhecido',
        stack: error?.stack || 'Stack não disponível',
        name: error?.name || 'Nome não disponível',
        cause: error?.cause || 'Causa não disponível',
        details: error?.details || 'Detalhes não disponíveis',
        hint: error?.hint || 'Dica não disponível',
        code: error?.code || 'Código não disponível',
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      } : 'Erro é null ou undefined - verifique o fluxo de execução');
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar e-mail",
        variant: "destructive",
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!securityData.newPassword || !securityData.confirmPassword) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos de senha.",
        variant: "destructive",
      });
      return;
    }

    if (securityData.newPassword !== securityData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (securityData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setSecurityLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: securityData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });

      setSecurityData(prev => ({ 
        ...prev, 
        newPassword: "", 
        confirmPassword: "" 
      }));
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error ? {
        message: error?.message || 'Erro desconhecido',
        stack: error?.stack || 'Stack não disponível',
        name: error?.name || 'Nome não disponível',
        cause: error?.cause || 'Causa não disponível',
        details: error?.details || 'Detalhes não disponíveis',
        hint: error?.hint || 'Dica não disponível',
        code: error?.code || 'Código não disponível',
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      } : 'Erro é null ou undefined - verifique o fluxo de execução');
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha",
        variant: "destructive",
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  const getUserDisplayName = () => {
    if (userProfile?.full_name) return userProfile.full_name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    return user?.email?.split('@')[0] || "Usuário";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hub-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <User className="h-8 w-8 text-hub-blue" />
        <div>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Informações do Usuário */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ImageUpload
                value={formData.avatar_url}
                onChange={(url) => {
                  console.log('📸 [PerfilPage] ImageUpload onChange chamado:', {
                    novaUrl: url,
                    urlAnterior: formData.avatar_url,
                    timestamp: new Date().toISOString()
                  })
                  setFormData(prev => {
                    const novoFormData = { ...prev, avatar_url: url }
                    console.log('📸 [PerfilPage] FormData atualizado:', {
                      formDataAnterior: prev,
                      novoFormData,
                      avatar_url: novoFormData.avatar_url
                    })
                    return novoFormData
                  })
                }}
                onRemove={() => {
                  console.log('🗑️ [PerfilPage] ImageUpload onRemove chamado')
                  setFormData(prev => {
                    const novoFormData = { ...prev, avatar_url: '' }
                    console.log('🗑️ [PerfilPage] FormData limpo:', novoFormData)
                    return novoFormData
                  })
                }}
                type="avatar"
                disabled={saving}
              />
            </div>
            <CardTitle className="text-hub-dark">{getUserDisplayName()}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              {user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant="secondary" className="bg-hub-green text-white">
                Ativo
              </Badge>
            </div>
            
            {userProfile?.role && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Função:</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {userProfile.role === 'admin' ? 'Administrador' : 'Usuário'}
                </Badge>
              </div>
            )}
            
            {user?.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Membro desde:</span>
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-3 w-3" />
                  {formatDate(user.created_at)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário de Edição */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-hub-dark">Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-hub-blue hover:bg-hub-blue/90"
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Configurações de Segurança */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-hub-dark flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configurações de Segurança
            </CardTitle>
            <CardDescription>
              Gerencie suas credenciais de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Alterar Email */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Alterar E-mail
                  </CardTitle>
                  <CardDescription>
                    Atualize seu endereço de e-mail de acesso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>E-mail atual</Label>
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Novo e-mail</Label>
                    <Input
                      type="email"
                      placeholder="novo@email.com"
                      value={securityData.newEmail}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, newEmail: e.target.value }))}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleEmailChange}
                    disabled={securityLoading}
                  >
                    {securityLoading ? "Processando..." : "Solicitar Alteração"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Você receberá um e-mail de confirmação no novo endereço
                  </p>
                </CardContent>
              </Card>

              {/* Alterar Senha */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Alterar Senha
                  </CardTitle>
                  <CardDescription>
                    Atualize sua senha de acesso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nova senha</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar nova senha</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handlePasswordChange}
                    disabled={securityLoading}
                  >
                    {securityLoading ? "Processando..." : "Alterar Senha"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Use uma senha forte com pelo menos 6 caracteres
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
