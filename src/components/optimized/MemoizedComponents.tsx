'use client';

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Interface para estatísticas
interface Statistics {
  total_mappings: number;
  active_mappings: number;
  inactive_mappings: number;
  total_packages: number;
  mapped_packages: number;
  unmapped_packages: number;
  sync_issues: number;
}

// Interface para props do componente de estatísticas
interface MemoizedStatisticsProps {
  statistics: Statistics;
  isLoading: boolean;
}

// Componente de estatísticas memoizado
export const MemoizedStatistics = memo<MemoizedStatisticsProps>(({ statistics, isLoading }) => {
  // Memoizar cálculos complexos
  const calculatedStats = useMemo(() => {
    const mappingRate = statistics.total_packages > 0 
      ? Math.round((statistics.mapped_packages / statistics.total_packages) * 100)
      : 0;
    
    const activeRate = statistics.total_mappings > 0
      ? Math.round((statistics.active_mappings / statistics.total_mappings) * 100)
      : 0;
    
    const healthScore = statistics.total_mappings > 0
      ? Math.round(((statistics.total_mappings - statistics.sync_issues) / statistics.total_mappings) * 100)
      : 100;
    
    return {
      mappingRate,
      activeRate,
      healthScore,
      hasIssues: statistics.sync_issues > 0
    };
  }, [statistics]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Mapeamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total_mappings}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={calculatedStats.activeRate > 80 ? "default" : "secondary"}>
              {calculatedStats.activeRate}% ativos
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pacotes Mapeados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.mapped_packages}/{statistics.total_packages}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={calculatedStats.mappingRate > 70 ? "default" : "secondary"}>
              {calculatedStats.mappingRate}% cobertura
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Não Mapeados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {statistics.unmapped_packages}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pacotes pendentes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {calculatedStats.healthScore}%
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant={calculatedStats.hasIssues ? "destructive" : "default"}
            >
              {calculatedStats.hasIssues ? `${statistics.sync_issues} problemas` : "Saudável"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

MemoizedStatistics.displayName = 'MemoizedStatistics';

// Interface para item de lista
interface ListItem {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastSync?: Date;
  description?: string;
}

// Interface para props da lista memoizada
interface MemoizedListProps {
  items: ListItem[];
  onEdit: (item: ListItem) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  searchTerm?: string;
}

// Componente de lista memoizado com filtros
export const MemoizedList = memo<MemoizedListProps>(({ 
  items, 
  onEdit, 
  onDelete, 
  isLoading, 
  searchTerm = '' 
}) => {
  // Memoizar handlers para evitar re-renders desnecessários
  const handleEdit = useCallback((item: ListItem) => {
    onEdit(item);
  }, [onEdit]);

  const handleDelete = useCallback((id: string) => {
    onDelete(id);
  }, [onDelete]);

  // Memoizar itens filtrados
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  // Memoizar estatísticas dos itens filtrados
  const itemStats = useMemo(() => {
    const active = filteredItems.filter(item => item.status === 'active').length;
    const inactive = filteredItems.filter(item => item.status === 'inactive').length;
    const errors = filteredItems.filter(item => item.status === 'error').length;
    
    return { active, inactive, errors, total: filteredItems.length };
  }, [filteredItems]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchTerm ? 'Nenhum item encontrado para a busca.' : 'Nenhum item disponível.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo dos itens filtrados */}
      {searchTerm && (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>Mostrando {itemStats.total} itens:</span>
          <Badge variant="default">{itemStats.active} ativos</Badge>
          <Badge variant="secondary">{itemStats.inactive} inativos</Badge>
          {itemStats.errors > 0 && (
            <Badge variant="destructive">{itemStats.errors} com erro</Badge>
          )}
        </div>
      )}

      {/* Lista de itens */}
      {filteredItems.map((item) => (
        <MemoizedListItem
          key={item.id}
          item={item}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
});

MemoizedList.displayName = 'MemoizedList';

// Componente de item individual memoizado
interface MemoizedListItemProps {
  item: ListItem;
  onEdit: (item: ListItem) => void;
  onDelete: (id: string) => void;
}

const MemoizedListItem = memo<MemoizedListItemProps>(({ item, onEdit, onDelete }) => {
  const handleEdit = useCallback(() => {
    onEdit(item);
  }, [item, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  const statusColor = useMemo(() => {
    switch (item.status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'error': return 'destructive';
      default: return 'secondary';
    }
  }, [item.status]);

  const lastSyncText = useMemo(() => {
    if (!item.lastSync) return 'Nunca sincronizado';
    
    const now = new Date();
    const diff = now.getTime() - item.lastSync.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}min atrás`;
    return 'Agora mesmo';
  }, [item.lastSync]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{item.name}</h3>
              <Badge variant={statusColor as any}>
                {item.status === 'active' ? 'Ativo' : 
                 item.status === 'inactive' ? 'Inativo' : 'Erro'}
              </Badge>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Última sincronização: {lastSyncText}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

MemoizedListItem.displayName = 'MemoizedListItem';

// Hook para otimizar re-renders com debounce
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook para memoizar callbacks complexos
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

// Hook para memoizar objetos complexos
export const useStableObject = <T extends Record<string, any>>(
  obj: T,
  deps: React.DependencyList
): T => {
  return useMemo(() => obj, deps);
};
