import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-muted-foreground">Página não encontrada.</p>
      <Button asChild>
        <Link href="/login">Ir para o login</Link>
      </Button>
    </div>
  );
}
