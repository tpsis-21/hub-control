// src/app/reset-password/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { logger } from '@/utils/production-logger'

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    logger.debug('🔍 [RESET-PASSWORD] Iniciando verificação de tokens');
    logger.debug(`🔍 [RESET-PASSWORD] URL completa: ${window.location.href}`);
    logger.debug(`🔍 [RESET-PASSWORD] Hash: ${window.location.hash}`);
    logger.debug(`🔍 [RESET-PASSWORD] Search: ${window.location.search}`);
    
    // Verifica se há um token de recuperação válido na URL
    // Primeiro verifica na hash (#)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    let accessToken = hashParams.get('access_token');
    let refreshToken = hashParams.get('refresh_token');
    let type = hashParams.get('type');
    
    logger.debug(`🔍 [RESET-PASSWORD] Tokens da hash: ${JSON.stringify({ 
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null, 
      refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null, 
      type 
    })}`);

    // Se não encontrou na hash, verifica nos query parameters (?)
    if (!accessToken || !refreshToken || !type) {
      const searchParams = new URLSearchParams(window.location.search);
      const searchAccessToken = searchParams.get('access_token');
      const searchRefreshToken = searchParams.get('refresh_token');
      const searchType = searchParams.get('type');
      
      logger.debug(`🔍 [RESET-PASSWORD] Tokens dos query params: ${JSON.stringify({ 
        accessToken: searchAccessToken ? `${searchAccessToken.substring(0, 20)}...` : null, 
        refreshToken: searchRefreshToken ? `${searchRefreshToken.substring(0, 20)}...` : null, 
        type: searchType 
      })}`);
      
      accessToken = searchAccessToken || accessToken;
      refreshToken = searchRefreshToken || refreshToken;
      type = searchType || type;
    }

    logger.debug(`🔍 [RESET-PASSWORD] Tokens finais: ${JSON.stringify({ 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken, 
      type,
      isValidCombination: type === 'recovery' && accessToken && refreshToken
    })}`);

    if (type === 'recovery' && accessToken && refreshToken) {
      logger.debug('✅ [RESET-PASSWORD] Tokens válidos encontrados, definindo sessão...');
      setIsValidToken(true);
      // Define a sessão com os tokens de recuperação
      const supabase = createBrowserSupabaseClient();
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error('❌ [RESET-PASSWORD] Erro ao definir sessão:', error);
          setIsValidToken(false);
        } else {
          logger.debug('✅ [RESET-PASSWORD] Sessão definida com sucesso');
        }
      });
    } else {
      logger.debug('❌ [RESET-PASSWORD] Token inválido ou ausente');
      logger.debug(`❌ [RESET-PASSWORD] Detalhes: ${JSON.stringify({
        typeCheck: type === 'recovery',
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      })}`);
    }
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "🔒 As senhas digitadas são diferentes. Por favor, verifique e digite novamente.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "🔐 Para sua segurança, a senha deve ter pelo menos 6 caracteres. Que tal adicionar mais alguns?",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        let friendlyMessage = "🔧 Não foi possível redefinir a senha. Tente novamente.";
        
        if (error.message?.includes('session')) {
          friendlyMessage = "⏰ Sua sessão expirou. Solicite um novo link de redefinição de senha.";
        } else if (error.message?.includes('weak')) {
          friendlyMessage = "🔒 Sua senha precisa ser mais forte. Tente usar letras, números e símbolos.";
        }
        
        toast({
          title: "Erro ao redefinir senha",
          description: friendlyMessage,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "🎉 Senha redefinida com sucesso!",
        description: "✅ Perfeito! Agora você pode fazer login com sua nova senha.",
      });

      // Redireciona para a página de login após 2 segundos
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      toast({
        title: "Erro ao redefinir senha",
        description: "🔧 Ocorreu um problema inesperado. Tente novamente ou solicite um novo link de redefinição.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <Logo variant="full" size="lg" className="text-gray-900 dark:text-white" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Sistema de gerenciamento de IPTV
            </p>
          </div>
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Link Inválido</CardTitle>
              <CardDescription>
                O link de recuperação de senha é inválido ou expirou.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/login" className="w-full">
                <Button className="w-full">
                  Voltar ao Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="full" size="lg" className="text-gray-900 dark:text-white" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sistema de gerenciamento de IPTV
          </p>
        </div>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Redefinir Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordReset}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
              
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-800 text-center">
                Voltar ao Login
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
