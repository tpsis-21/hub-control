'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Coins, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNATVCredits } from '@/hooks/use-natv-credits';

interface NATVCreditsDisplayProps {
  className?: string;
}

export function NATVCreditsDisplay({ className }: NATVCreditsDisplayProps) {
  const {
    credits,
    loading,
    error,
    lastSync,
    isConfigured,
    syncCredits,
    getCreditsStatus,
    formatLastSync
  } = useNATVCredits();

  const handleRefresh = async () => {
    const result = await syncCredits();
    if (result.success) {
      toast.success('Créditos NATV sincronizados com sucesso');
    } else {
      toast.error('Erro ao sincronizar créditos NATV');
    }
  };

  const creditsStatus = getCreditsStatus(credits);
  
  // Não exibir o componente se NATV não estiver configurado
  if (!isConfigured && !loading) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Coins className="h-4 w-4" />
          Créditos NATV
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="px-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {error ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {credits !== null ? credits : '--'}
                </span>
                {credits !== null && (
                  <Badge 
                    className={`bg-${creditsStatus.color}-500 text-white`}
                    variant="secondary"
                  >
                    {creditsStatus.label}
                  </Badge>
                )}
              </div>
              
              {lastSync && (
                <p className="text-xs text-muted-foreground">
                  Última sincronização: {formatLastSync(lastSync)}
                </p>
              )}
              
              {credits !== null && creditsStatus.level === 'critical' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">
                    Créditos críticos! Recarregue sua conta urgentemente.
                  </span>
                </div>
              )}
              
              {credits !== null && creditsStatus.level === 'low' && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">
                    Créditos baixos! Considere recarregar sua conta.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default NATVCreditsDisplay;
