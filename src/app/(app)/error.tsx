'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Algo deu errado</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Ocorreu um erro ao carregar esta página. Tente novamente ou volte ao painel.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Referência: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button type="button" onClick={() => reset()}>
          Tentar novamente
        </Button>
        <Button type="button" variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          Ir ao painel
        </Button>
      </div>
    </div>
  );
}
