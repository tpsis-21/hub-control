'use client';

import React, { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Zap, Plus } from 'lucide-react';

interface MappingHeaderProps {
  onRefresh: () => void;
  onAutoMapping: () => void;
  onCreateMapping: () => void;
  isLoading: boolean;
  autoMappingProgress: number;
}

/**
 * Componente de cabeçalho do gerenciador de mapeamentos
 * Contém título, descrição e botões de ação principais
 */
export const MappingHeader = memo(function MappingHeader({
  onRefresh,
  onAutoMapping,
  onCreateMapping,
  isLoading,
  autoMappingProgress
}: MappingHeaderProps) {
  const isAutoMappingInProgress = useMemo(
    () => autoMappingProgress > 0 && autoMappingProgress < 100,
    [autoMappingProgress]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              Gerenciador de Mapeamento TheBest
            </CardTitle>
            <CardDescription className="mt-2">
              Configure e gerencie os mapeamentos entre pacotes TheBest e planos HubControl.
              Sincronize automaticamente preços, recursos e configurações.
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading || isAutoMappingInProgress}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoMapping}
              disabled={isLoading || isAutoMappingInProgress}
            >
              <Zap className="h-4 w-4 mr-2" />
              Auto-Mapear
            </Button>
            
            <Button
              size="sm"
              onClick={onCreateMapping}
              disabled={isLoading || isAutoMappingInProgress}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Mapeamento
            </Button>
          </div>
        </div>
        
        {/* Barra de progresso do auto-mapeamento */}
        {isAutoMappingInProgress && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Auto-mapeamento em progresso...</span>
              <span className="text-sm text-muted-foreground">{autoMappingProgress}%</span>
            </div>
            <Progress value={autoMappingProgress} className="h-2" />
          </div>
        )}
      </CardHeader>
    </Card>
  );
});
