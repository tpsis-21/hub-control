// src/components/auth/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isClientUserApproved, createClientSupabaseClient } from '@/lib/supabase-client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Tentando fazer login com:', email);
      
      // Usar a rota de API para login server-side
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Erro no login:', result.error);
        toast({
          title: "Erro ao fazer login",
          description: result.error || "Verifique suas credenciais e tente novamente.",
          variant: "destructive",
        });
        return;
      }
      
      if (!result.user) {
        console.error('❌ Usuário não encontrado após login');
        toast({
          title: "Erro ao fazer login",
          description: "Usuário não encontrado",
          variant: "destructive",
        });
        return;
      }
      
      // Verifica se o usuário está aprovado
      // Admin principal é sempre aprovado automaticamente
      if (email === 'topplaytv7@gmail.com') {
        console.log('✅ Admin principal detectado - acesso liberado');
      } else {
        const approved = await isClientUserApproved();
        if (!approved) {
          toast({
            title: "Acesso negado",
            description: "Seu acesso ainda não foi aprovado pelo administrador.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('✅ Login bem-sucedido via API:', result.user.email);
      
      toast({
        title: "Login realizado com sucesso",
        description: "Redirecionando para o dashboard...",
      });

      // Força um reload completo da página para garantir que os cookies sejam propagados
      console.log('🔄 Executando redirecionamento para /dashboard com reload');
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('❌ Erro durante o login:', error);
      
      let errorTitle = "Erro ao fazer login";
      let errorDescription = "Verifique suas credenciais e tente novamente.";
      
      // Tratamento específico para diferentes tipos de erro
      if (error.message) {
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('invalid_credentials') ||
            error.message.includes('Email not confirmed') ||
            error.message.includes('Invalid email or password')) {
          errorTitle = "Credenciais inválidas";
          errorDescription = "Email ou senha incorretos. Verifique seus dados e tente novamente.";
        } else if (error.message.includes('Email not confirmed')) {
          errorTitle = "Email não confirmado";
          errorDescription = "Verifique sua caixa de entrada e confirme seu email antes de fazer login.";
        } else if (error.message.includes('Too many requests')) {
          errorTitle = "Muitas tentativas";
          errorDescription = "Aguarde alguns minutos antes de tentar novamente.";
        } else if (error.message.includes('Network')) {
          errorTitle = "Erro de conexão";
          errorDescription = "Verifique sua conexão com a internet e tente novamente.";
        } else {
          errorDescription = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
      
      // Não reinicia a aplicação, apenas limpa o estado de loading
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira seu email para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);

    try {
      const supabase = createClientSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message || "Não foi possível enviar o email de recuperação.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });

      setShowResetForm(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Não foi possível enviar o email de recuperação.",
        variant: "destructive",
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
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-6">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          
          <div className="flex flex-col space-y-2 text-center">
            <button
              type="button"
              onClick={() => setShowResetForm(!showResetForm)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Esqueci minha senha
            </button>
            
            <Link href="/register" className="text-sm text-gray-600 hover:text-gray-800">
              Não tem uma conta? Cadastre-se
            </Link>
          </div>
          
          {showResetForm && (
            <div className="w-full space-y-3 border-t pt-4">
              <div className="text-sm text-gray-600 text-center">
                Digite seu email para receber o link de recuperação:
              </div>
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResetForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1"
                  >
                    {resetLoading ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}