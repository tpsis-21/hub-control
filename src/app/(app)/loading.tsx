import { Skeleton } from '@/components/ui/skeleton';

export default function AppLoading() {
  return (
    <div className="space-y-6 p-2" aria-busy="true" aria-label="Carregando conteúdo">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
