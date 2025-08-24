import { Metadata } from 'next';
import { Suspense } from 'react';
import NotificationCenter from '@/components/dashboard/NotificationCenter';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Centro de Notificações | Hub Control',
  description: 'Gerencie e monitore todas as notificações do sistema'
};

// Componente de loading
function NotificationCenterSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="flex space-x-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="space-y-6">
          {/* KPIs skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick actions skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2 p-4 border rounded-lg">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent notifications skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Componente de erro
function NotificationCenterError({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-4">
        <div className="text-red-500">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Erro ao carregar</h3>
          <p className="text-gray-600 mt-1">
            Não foi possível carregar o centro de notificações.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {error.message}
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

// Página principal
export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<NotificationCenterSkeleton />}>
        <NotificationCenter />
      </Suspense>
    </div>
  );
}

// Componente para tratamento de erros (removido export para evitar conflito com Next.js)
// function ErrorBoundary({ error }: { error: Error }) {
//   return <NotificationCenterError error={error} />;
// }