// @/app/(app)/admin/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { getClientUserRole } from "@/lib/supabase/clients/browser";
import { AdminPanel } from '@/components/app/admin-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const role = await getClientUserRole();
      setUserRole(role);
    } catch (error) {
      console.error('Erro ao verificar papel do usuário:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar o painel administrativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Entre em contato com um administrador se você acredita que isso é um erro.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <AdminPanel />
    </div>
  );
}