// src/components/auth/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isBrowserUserApproved, createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from "next/link";
import { supabaseConfig } from "@/lib/supabase/config";


// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    console.log(`[LOGIN FORM DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG_AUTH) {
    console.error(`[LOGIN FORM ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===
// Utilitário de debug: checa conectividade básica com o endpoint de Auth do Supabase
async function debugSupabaseConnectivity() {
  const info = {
    supabaseUrl: supabaseConfig.url,
    appOrigin: typeof window !== 'undefined' ? window.location.origin : 'SSR',
    isHttps: typeof window !== 'undefined' ? window.location.protocol === 'https:' : null,
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : 'SSR'
  };
  try {
    // health/settings é público e útil para detectar CORS/conectividade
    const url = `${supabaseConfig.url}/auth/v1/settings`;
    const res = await fetch(url, {
      headers: {
        apikey: supabaseConfig.anonKey,
      },
      mode: 'cors',
    });
    console.debug('[Supabase Debug] settings status:', res.status, info);
  } catch (err) {
    console.error('[Supabase Debug] Falha ao acessar /auth/v1/settings', info, err);
  }
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    debugLog('Iniciando processo de login', { 
      email: email?.substring(0, 3) + '***',
      hasPassword: !!password,
      timestamp: new Date().toISOString()
    });
    e.preventDefault();
    setLoading(true);

    try {
      debugLog('Enviando requisição para API', {
      url: '/api/auth/login',
      method: 'POST',
      hasBody: true
    });
    
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      debugLog('Resposta recebida', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    const data = await response.json();
    debugLog('Dados da resposta', { data });

      if (response.ok) {
        toast({
          title: "🎉 Bem-vindo!",
          description: data.message || "Login realizado com sucesso!",
        });
        
        // Aguardar um pouco antes de redirecionar para mostrar o feedback
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        router.push('/dashboard');
      } else {
        // Usar mensagem amigável da API se disponível
        const errorMessage = data.error?.userFriendly || data.error?.message || 'Credenciais inválidas';
        
        toast({
          title: "🚫 Erro no login",
          description: `🔐 ${errorMessage}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      debugError('Erro capturado no handleLogin', {
        error: error,
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      console.error('Erro na requisição de login:', error);
      toast({
        title: "Erro de conexão",
        description: "🌐 Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
         title: 'Email obrigatório',
         description: '📧 Por favor, insira seu email para que possamos enviar o link de recuperação de senha.',
         variant: 'destructive'
       });
      return;
    }

    // Pré-checagem de configuração do Supabase
    if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
      console.error('[Reset Password] Configuração do Supabase ausente ou inválida:', {
        url: supabaseConfig?.url,
        anonKeySet: Boolean(supabaseConfig?.anonKey)
      });
      toast({
        title: 'Configuração inválida',
        description: '⚙️ Configurações do Supabase não encontradas. Verifique as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        variant: 'destructive'
      });
      return;
    }

    setResetLoading(true);

    // Reset de senha
     const supabase = createBrowserSupabaseClient();

    try {
       console.debug('[Reset Password] Iniciando solicitação', {
         supabaseUrl: supabaseConfig.url,
         redirectTo: `${window.location.origin}/reset-password`,
         appOrigin: window.location.origin,
         isHttps: window.location.protocol === 'https:'
       });
       const { error } = await supabase.auth.resetPasswordForEmail(email, {
         redirectTo: `${window.location.origin}/reset-password`,
       });

       if (error) {
         console.error('[Reset Password] Erro retornado pelo Supabase:', error);
         toast({
           title: 'Erro ao enviar email',
           description: `📧 ${error.message || 'Não foi possível enviar o email de recuperação. Verifique se o email está correto e tente novamente.'}`,
           variant: 'destructive'
         });
       } else {
         toast({
           title: '✅ Email enviado com sucesso!',
           description: '📬 Verifique sua caixa de entrada (e spam) para o link de redefinição de senha.'
         });
         setShowResetForm(false);
       }
     } catch (error: any) {
       // Trata especialmente falhas de rede/CORS
       const isNetworkError = error?.name === 'TypeError' || /Failed to fetch/i.test(error?.message || '');
       console.error('Erro ao enviar email de reset:', error);
       if (isNetworkError) {
         // Coleta informações adicionais de conectividade
         await debugSupabaseConnectivity();
       }
       toast({
         title: 'Erro ao enviar email',
         description: isNetworkError
           ? '🌐 Falha de conexão com o serviço de autenticação. Verifique sua internet e as URLs do Supabase (Site URL e Redirect URLs) nas configurações do projeto.'
           : `🔧 ${error.message || 'Ocorreu um problema ao enviar o email. Tente novamente em alguns minutos.'}`,
         variant: 'destructive'
       });
     } finally {
       setResetLoading(false);
     }
  };

  return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o sistema.
          </CardDescription>
        </CardHeader>
        
        {!showResetForm ? (
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6">
              {/* Loading simples */}
              {loading && (
                <div className="flex items-center justify-center mb-4 p-4 bg-blue-50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-blue-600">Autenticando...</span>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={loading ? 'opacity-50' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
              
              <div className="flex flex-col space-y-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowResetForm(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                  disabled={loading}
                >
                  Esqueci minha senha
                </button>
                
                <Link 
                  href="/register" 
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Não tem uma conta? Cadastre-se
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset}>
            <CardContent className="space-y-6">
              {/* Loading simples */}
              {resetLoading && (
                <div className="flex items-center justify-center mb-4 p-4 bg-blue-50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-blue-600">Enviando email...</span>
                </div>
              )}
              
              <div className="text-sm text-gray-600 text-center">
                Digite seu email para receber o link de recuperação:
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={resetLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetForm(false)}
                className="flex-1"
                disabled={resetLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={resetLoading}
                className="flex-1"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link'
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
  );
}