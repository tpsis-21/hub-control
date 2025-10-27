'use client';

import { useEffect, useState } from 'react';
import { getBrowserUser } from '@/lib/supabase/unified-client';
import { logger } from '@/utils/production-logger'
import type { User } from '@supabase/supabase-js';

export default function TestAuthPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testAuth = async () => {
      try {
        console.log('🧪 TestAuth: Iniciando teste de autenticação...');
        setLoading(true);
        
        const currentUser = await getBrowserUser();
        
        if (currentUser) {
          console.log('✅ TestAuth: Usuário autenticado com sucesso');
          setUser(currentUser);
        } else {
          console.log('❌ TestAuth: Nenhum usuário encontrado');
          setError('Nenhum usuário autenticado');
        }
      } catch (err) {
        console.error('❌ TestAuth: Erro durante teste:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    testAuth();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Teste de Autenticação</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Autenticação</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Erro:</strong> {error}
        </div>
      )}
      
      {user ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <h2 className="font-bold mb-2">Usuário Autenticado:</h2>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Criado em:</strong> {new Date(user.created_at).toLocaleString()}</p>
          <p><strong>Último login:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Nenhum usuário autenticado encontrado.</p>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Verifique o console do navegador para logs detalhados.</p>
      </div>
    </div>
  );
}
