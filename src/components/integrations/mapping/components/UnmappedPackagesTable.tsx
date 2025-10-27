'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link2, Package } from 'lucide-react';
import { UnmappedPackage } from '../types';

interface UnmappedPackagesTableProps {
  packages: UnmappedPackage[];
  onQuickMap: (packageId: string, planId: string) => void;
  isLoading: boolean;
}

/**
 * Componente de tabela para exibir pacotes não mapeados
 * Permite mapeamento rápido através de seleção de plano
 */
export default function UnmappedPackagesTable({
  packages,
  onQuickMap,
  isLoading
}: UnmappedPackagesTableProps) {
  const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});

  const handlePlanSelect = (packageId: string, planId: string) => {
    setSelectedPlans(prev => ({
      ...prev,
      [packageId]: planId
    }));
  };

  const handleQuickMap = (packageId: string) => {
    const planId = selectedPlans[packageId];
    if (planId) {
      onQuickMap(packageId, planId);
      // Limpar seleção após mapeamento
      setSelectedPlans(prev => {
        const newState = { ...prev };
        delete newState[packageId];
        return newState;
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pacotes Não Mapeados
          </CardTitle>
          <CardDescription>
            Pacotes TheBest que ainda não possuem mapeamento para planos HubControl.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
          <Package className="h-5 w-5" />
          Pacotes Não Mapeados
        </CardTitle>
        <CardDescription>
          Pacotes TheBest que ainda não possuem mapeamento para planos HubControl.
          Use o mapeamento rápido para criar associações básicas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Todos os pacotes estão mapeados!</h3>
            <p className="text-muted-foreground">
              Não há pacotes TheBest pendentes de mapeamento no momento.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pacote TheBest</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Recursos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano HubControl</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.package_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{pkg.package_name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {pkg.package_id}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-medium">
                      R$ {pkg.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pkg.duracao}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {pkg.telas} telas
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {pkg.duracao}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="default">
                      Disponível
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Select
                      value={selectedPlans[pkg.package_id] || ''}
                      onValueChange={(value) => handlePlanSelect(pkg.package_id, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecionar plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* TODO: Carregar planos disponíveis */}
                        <SelectItem value="plan-1">Plano Básico</SelectItem>
                        <SelectItem value="plan-2">Plano Intermediário</SelectItem>
                        <SelectItem value="plan-3">Plano Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickMap(pkg.package_id)}
                      disabled={!selectedPlans[pkg.package_id]}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Mapear
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
