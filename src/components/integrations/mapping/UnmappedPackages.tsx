import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { UnmappedPackage } from './types';

interface UnmappedPackagesProps {
  unmappedPackages: UnmappedPackage[];
  onQuickMap: (packageId: string, planId: string) => void;
  isLoading?: boolean;
}

export function UnmappedPackages({
  unmappedPackages,
  onQuickMap,
  isLoading = false
}: UnmappedPackagesProps) {
  // Função para formatar duração
  const formatDuration = (duration: string) => {
    if (!duration) return 'N/A';
    
    // Converte diferentes formatos de duração para um formato legível
    if (duration.includes('day')) {
      return duration.replace('day', 'dia').replace('days', 'dias');
    }
    if (duration.includes('month')) {
      return duration.replace('month', 'mês').replace('months', 'meses');
    }
    if (duration.includes('year')) {
      return duration.replace('year', 'ano').replace('years', 'anos');
    }
    
    return duration;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (unmappedPackages.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">Todos os pacotes estão mapeados!</h3>
        <p className="text-muted-foreground">
          Todos os pacotes TheBest ativos possuem mapeamento para planos HubControl.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unmappedPackages.map((unmapped) => (
        <Card key={unmapped.package_id} className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{unmapped.package_name}</h4>
                <p className="text-sm text-muted-foreground">
                  {unmapped.telas} telas • {formatDuration(unmapped.duracao)} • R$ {unmapped.price}
                </p>
              </div>
              <Badge variant="outline" className="text-orange-600">
                Não mapeado
              </Badge>
            </div>
            
            {unmapped.suggested_plans.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium mb-2">Planos Sugeridos:</h5>
                <div className="space-y-2">
                  {unmapped.suggested_plans.slice(0, 3).map((suggestion) => (
                    <div key={suggestion.plan_id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <span className="text-sm font-medium">{suggestion.plan_name}</span>
                        <div className="flex gap-2 mt-1">
                          {suggestion.screen_match && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                              Telas ✓
                            </Badge>
                          )}
                          {suggestion.validity_match && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                              Validade ✓
                            </Badge>
                          )}
                          {suggestion.price_match && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                              Preço ✓
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Compatibilidade: {Math.round(suggestion.compatibility_score * 100)}%
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onQuickMap(unmapped.package_id, suggestion.plan_id)}
                        disabled={isLoading}
                      >
                        Mapear
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {unmapped.suggested_plans.length === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Nenhum plano compatível encontrado automaticamente. 
                  Considere criar um mapeamento manual.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default UnmappedPackages;
