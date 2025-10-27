'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Edit, Trash2, RefreshCw } from 'lucide-react';
import { TheBestPlanMapping } from '../types';

interface ProblemsTableProps {
  mappings: TheBestPlanMapping[];
  onEdit: (mapping: TheBestPlanMapping) => void;
  onDelete: (mappingId: string) => void;
  isLoading: boolean;
}

/**
 * Componente de tabela para exibir mapeamentos com problemas
 * Inclui mapeamentos inativos ou com erros de sincronização
 */
export default function ProblemsTable({
  mappings,
  onEdit,
  onDelete,
  isLoading
}: ProblemsTableProps) {
  const getProblemType = (mapping: TheBestPlanMapping) => {
    if (!mapping.is_active) {
      return { type: 'Inativo', variant: 'secondary' as const };
    }
    // Remover verificações de sync_status pois a propriedade não existe na interface
    if (false) { // Placeholder para manter a estrutura
      return { type: 'Erro de Sync', variant: 'destructive' as const };
    }
    if (false) { // Placeholder para manter a estrutura
      return { type: 'Sync Pendente', variant: 'outline' as const };
    }
    return { type: 'Desconhecido', variant: 'outline' as const };
  };

  const getProblemDescription = (mapping: TheBestPlanMapping) => {
    if (!mapping.is_active) {
      return 'Mapeamento foi desativado manualmente';
    }
    // Remover verificações de sync_status pois a propriedade não existe na interface
    return 'Problema não identificado';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Problemas de Mapeamento
          </CardTitle>
          <CardDescription>
            Mapeamentos que requerem atenção ou correção.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Problemas de Mapeamento
        </CardTitle>
        <CardDescription>
          Mapeamentos que requerem atenção ou correção. Verifique os detalhes e tome as ações necessárias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mappings.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum problema encontrado!</h3>
            <p className="text-muted-foreground">
              Todos os mapeamentos estão funcionando corretamente.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mapeamento</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Última Sync</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => {
                const problem = getProblemType(mapping);
                const description = getProblemDescription(mapping);
                
                return (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {mapping.thebest_package?.name || mapping.thebest_package_id} → {mapping.hubcontrol_plan?.name || mapping.hubcontrol_plan_id}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {mapping.id}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={problem.variant}>
                        {problem.type}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate" title={description}>
                          {description}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {mapping.updated_at ? (
                          <>
                            <div>{new Date(mapping.updated_at).toLocaleDateString('pt-BR')}</div>
                            <div className="text-muted-foreground">
                              {new Date(mapping.updated_at).toLocaleTimeString('pt-BR')}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Nunca atualizado</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Remover verificação de sync_status pois a propriedade não existe na interface */}
                        {false && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Implementar retry de sincronização
                              console.log('Retry sync for:', mapping.id);
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(mapping)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(mapping.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
