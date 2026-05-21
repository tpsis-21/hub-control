// src/components/auth/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from "next/link";
import { RecoverPasswordRequest } from "@/components/auth/recover-password-request";
import { logger } from '@/utils/production-logger'


// === LOGS DE DEBUG ADICIONADOS ===
const DEBUG_AUTH = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: any) {
  if (DEBUG_AUTH) {
    logger.debug(`[LOGIN FORM DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
  }
}

function debugError(message: string, error?: any) {
  if (DEBUG_AUTH) {
    console.error(`[LOGIN FORM ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }
}
// === FIM DOS LOGS DE DEBUG ===

type LoginFormProps = {
  /** Abre direto o fluxo de recuperação (ex.: /login?recuperar=1) */
  initialRecover?: boolean;
  /** Mensagem quando cadastro público está desabilitado */
  registrationDisabled?: boolean;
};

export function LoginForm({
  initialRecover = false,
  registrationDisabled = false,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(initialRecover);
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
    } catch (error: any) {
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

  return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{showResetForm ? 'Recuperar senha' : 'Login'}</CardTitle>
          <CardDescription>
            {showResetForm
              ? 'Informe o e-mail da conta. Se o envio falhar, redefina a senha no painel Supabase (guia em docs/GUIA_HUB_CONTROL.md).'
              : 'Entre com suas credenciais para acessar o sistema.'}
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
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
                
                {registrationDisabled ? (
                  <p className="text-sm text-muted-foreground">
                    Cadastro público desabilitado. Solicite acesso ao administrador.
                  </p>
                ) : process.env.NODE_ENV !== "production" ? (
                  <Link
                    href="/register"
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Não tem uma conta? Cadastre-se
                  </Link>
                ) : null}
              </div>
            </CardFooter>
          </form>
        ) : (
          <>
            <CardContent>
              <RecoverPasswordRequest defaultEmail={email} />
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetForm(false)}
                className="w-full"
              >
                Voltar ao login
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
  );
}
