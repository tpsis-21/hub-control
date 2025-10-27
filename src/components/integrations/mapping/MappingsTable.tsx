import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Plus, Link } from 'lucide-react';
import { TheBestPlanMapping } from './types';

interface MappingsTableProps {
  mappings: TheBestPlanMapping[];
  onEdit: (mapping: TheBestPlanMapping) => void;
  onDelete: (mappingId: string) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export function MappingsTable({
  mappings,
  onEdit,
  onDelete,
  onCreateNew,
  isLoading = false
}: MappingsTableProps) {
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

  // Função para obter badge de status
  const getStatusBadge = (mapping: TheBestPlanMapping) => {
    if (!mapping.is_active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (mapping.is_default) {
      return <Badge variant="default">Padrão</Badge>;
    }
    return <Badge variant="outline" className="text-green-600">Ativo</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (mappings.length === 0) {
    return (
      <div className="text-center py-8">
        <Link className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum mapeamento encontrado</h3>
        <p className="text-muted-foreground mb-4">
          Crie mapeamentos para vincular pacotes TheBest aos planos HubControl.
        </p>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Primeiro Mapeamento
        </Button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pacote TheBest</TableHead>
          <TableHead>Plano HubControl</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Compatibilidade</TableHead>
          <TableHead>Sincronização</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mappings.map((mapping) => (
          <TableRow key={mapping.id}>
            <TableCell>
              <div>
                <div className="font-medium">
                  {mapping.thebest_package?.name || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {mapping.thebest_package?.telas} telas • {formatDuration(mapping.thebest_package?.duracao || '')}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">
                  {mapping.hubcontrol_plan?.name || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {mapping.hubcontrol_plan?.screens} telas • {mapping.hubcontrol_plan?.validity} dias
                </div>
              </div>
            </TableCell>
            <TableCell>
              {getStatusBadge(mapping)}
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                {/* Lógica de compatibilidade pode ser implementada aqui */}
                <Badge variant="outline">Verificar</Badge>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {mapping.sync_price && (
                  <Badge variant="outline" className="text-xs">Preço</Badge>
                )}
                {mapping.sync_validity && (
                  <Badge variant="outline" className="text-xs">Validade</Badge>
                )}
                {mapping.sync_screens && (
                  <Badge variant="outline" className="text-xs">Telas</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(mapping)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(mapping.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default MappingsTable;
