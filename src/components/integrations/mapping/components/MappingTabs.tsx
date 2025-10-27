'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { MappingsTable } from '../MappingsTable';
import UnmappedPackagesTable from './UnmappedPackagesTable';
import ProblemsTable from './ProblemsTable';
import {
  TheBestPlanMapping,
  UnmappedPackage,
  MappingStatistics
} from '../types';

interface MappingTabsProps {
  mappings: TheBestPlanMapping[];
  unmappedPackages: UnmappedPackage[];
  statistics: MappingStatistics;
  onEditMapping: (mapping: TheBestPlanMapping) => void;
  onDeleteMapping: (mappingId: string) => void;
  onCreateMapping: () => void;
  onQuickMap: (packageId: string, planId: string) => void;
  isLoading: boolean;
}

/**
 * Componente de abas para organizar diferentes visualizações dos mapeamentos
 * Inclui mapeamentos ativos, pacotes não mapeados e problemas
 */
export function MappingTabs({
  mappings,
  unmappedPackages,
  statistics,
  onEditMapping,
  onDeleteMapping,
  onCreateMapping,
  onQuickMap,
  isLoading
}: MappingTabsProps) {
  // Filtrar mapeamentos ativos
  const activeMappings = mappings.filter(mapping => mapping.is_active);
  
  // Filtrar mapeamentos com problemas (inativos)
  const problemMappings = mappings.filter(mapping =>
    !mapping.is_active
  );

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Mapeamentos Ativos
          <Badge variant="secondary" className="ml-1">
            {statistics.active_mappings}
          </Badge>
        </TabsTrigger>
        
        <TabsTrigger value="unmapped" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Não Mapeados
          <Badge variant="destructive" className="ml-1">
            {statistics.unmapped_packages}
          </Badge>
        </TabsTrigger>
        
        <TabsTrigger value="problems" className="flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          Problemas
          <Badge variant="outline" className="ml-1">
            {statistics.sync_issues}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-6">
        <MappingsTable
          mappings={activeMappings}
          onEdit={onEditMapping}
          onDelete={onDeleteMapping}
          onCreateNew={onCreateMapping}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent value="unmapped" className="mt-6">
        <UnmappedPackagesTable
          packages={unmappedPackages}
          onQuickMap={onQuickMap}
          isLoading={isLoading}
        />
      </TabsContent>

      <TabsContent value="problems" className="mt-6">
        <ProblemsTable
          mappings={problemMappings}
          onEdit={onEditMapping}
          onDelete={onDeleteMapping}
          isLoading={isLoading}
        />
      </TabsContent>
    </Tabs>
  );
}
