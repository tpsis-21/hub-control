import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { MappingStatistics as MappingStatsType } from './types';

interface MappingStatisticsProps {
  statistics: MappingStatsType;
  isLoading?: boolean;
}

export function MappingStatistics({ statistics, isLoading = false }: MappingStatisticsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const mappingProgress = statistics.total_packages > 0 
    ? (statistics.mapped_packages / statistics.total_packages) * 100 
    : 0;

  const activeRate = statistics.total_mappings > 0 
    ? (statistics.active_mappings / statistics.total_mappings) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total de Mapeamentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Mapeamentos</CardTitle>
          <Link className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total_mappings}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-green-600">
              {statistics.active_mappings} ativos
            </Badge>
            {statistics.inactive_mappings > 0 && (
              <Badge variant="outline" className="text-gray-600">
                {statistics.inactive_mappings} inativos
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progresso de Mapeamento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progresso de Mapeamento</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(mappingProgress)}%</div>
          <Progress value={mappingProgress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {statistics.mapped_packages} de {statistics.total_packages} pacotes mapeados
          </p>
        </CardContent>
      </Card>

      {/* Taxa de Ativação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Ativação</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Math.round(activeRate)}%</div>
          <Progress value={activeRate} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {statistics.active_mappings} de {statistics.total_mappings} mapeamentos ativos
          </p>
        </CardContent>
      </Card>

      {/* Problemas de Sincronização */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Problemas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.sync_issues}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {statistics.sync_issues === 0 ? (
              <Badge variant="outline" className="text-green-600">
                Tudo funcionando
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600">
                Requer atenção
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {statistics.unmapped_packages} pacotes não mapeados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default MappingStatistics;
