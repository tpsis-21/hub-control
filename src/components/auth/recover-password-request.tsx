'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/clients/browser';
import { supabaseConfig } from '@/lib/supabase/config';

export function RecoverPasswordRequest({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: 'E-mail obrigatório',
        description: 'Informe o e-mail da sua conta.',
        variant: 'destructive',
      });
      return;
    }

    if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
      toast({
        title: 'Configuração inválida',
        description: 'Supabase não configurado no .env.local.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: 'Não foi possível enviar',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'E-mail enviado (se existir na base)',
        description:
          'Verifique a caixa de entrada e o spam. Se nada chegar em alguns minutos, redefina a senha no Supabase Dashboard (Auth → Users).',
      });
    } catch {
      toast({
        title: 'Erro de conexão',
        description: 'Tente de novo ou use o painel Supabase para definir senha nova.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recover-email">E-mail da conta</Label>
        <Input
          id="recover-email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar link de recuperação'
        )}
      </Button>
    </form>
  );
}
