import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AppNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Página não encontrada</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Button asChild>
        <Link href="/dashboard">Voltar ao painel</Link>
      </Button>
    </div>
  );
}
