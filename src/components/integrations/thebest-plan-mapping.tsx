'use client';

import React, { Suspense, lazy, useMemo, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
// import { LazyOnVisible } from '@/components/lazy/LazyComponents';

// Componente LazyOnVisible temporário
const LazyOnVisible: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? children : (fallback || <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />)}
    </div>
  );
};
import { MappingHeader } from './mapping/components/MappingHeader';
import { useMappingData } from './mapping/hooks/useMappingData';
import { useMappingForm } from './mapping/hooks/useMappingForm';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

// Lazy loading dos componentes pesados
const MappingStatistics = lazy(() => import('./mapping/MappingStatistics').then(m => ({ default: m.MappingStatistics })));
const MappingForm = lazy(() => import('./mapping/MappingForm').then(m => ({ default: m.MappingForm })));
const MappingTabs = lazy(() => import('./mapping/components/MappingTabs').then(m => ({ default: m.MappingTabs })));

export const TheBestPlanMappingManager = memo(function TheBestPlanMappingManager() {
  // Hooks customizados para gerenciar dados e formulários
  const {
    mappings,
    packages,
    plans,
    statistics,
    unmappedPackages,
    config,
    isLoading,
    autoMappingProgress,
    loadData,
    handleAutoMapping,
    handleCreateMapping,
    handleUpdateMapping,
    handleDeleteMapping,
    handleQuickMap,
    setAutoMappingProgress
  } = useMappingData();

  const {
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    formData,
    editingMapping,
    deletingMappingId,
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    updateFormData,
    setFormData,
    resetForm,
    validateForm
  } = useMappingForm();

  // Handlers para os formulários
  const handleFormSubmit = useMemo(() => async () => {
    if (!validateForm()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingMapping) {
        await handleUpdateMapping(editingMapping.id, formData);
        closeEditDialog();
      } else {
        await handleCreateMapping(formData);
        closeCreateDialog();
      }
    } catch (error) {
      // Erro já tratado nos hooks
    }
  }, [validateForm, editingMapping, formData, handleUpdateMapping, closeEditDialog, handleCreateMapping, closeCreateDialog]);

  const handleConfirmDelete = useMemo(() => async () => {
    if (deletingMappingId) {
      try {
        await handleDeleteMapping(deletingMappingId);
        closeDeleteDialog();
      } catch (error) {
        // Erro já tratado no hook
      }
    }
  }, [deletingMappingId, handleDeleteMapping, closeDeleteDialog]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <MappingHeader
        isLoading={isLoading}
        autoMappingProgress={autoMappingProgress}
        onRefresh={loadData}
        onAutoMapping={handleAutoMapping}
        onCreateMapping={openCreateDialog}
      />

      {/* Estatísticas com lazy loading */}
      <LazyOnVisible fallback={<div className="h-32 bg-gray-100 animate-pulse rounded-lg" />}>
        <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse rounded-lg" />}>
          <MappingStatistics statistics={statistics} isLoading={isLoading} />
        </Suspense>
      </LazyOnVisible>

      {/* Progress do auto-mapeamento */}
      {autoMappingProgress > 0 && autoMappingProgress < 100 && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Auto-mapeamento em progresso...
            <Progress value={autoMappingProgress} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* Conteúdo principal com lazy loading */}
      <LazyOnVisible fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg" />}>
        <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg" />}>
          <MappingTabs
            mappings={mappings}
            unmappedPackages={unmappedPackages}
            statistics={statistics}
            isLoading={isLoading}
            onEditMapping={openEditDialog}
            onDeleteMapping={(mappingId) => openDeleteDialog(mappingId)}
            onCreateMapping={openCreateDialog}
            onQuickMap={handleQuickMap}
          />
        </Suspense>
      </LazyOnVisible>

      {/* Dialog de Criação */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) closeCreateDialog();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Mapeamento</DialogTitle>
            <DialogDescription>
              Configure o mapeamento entre um pacote TheBest e um plano HubControl
            </DialogDescription>
          </DialogHeader>
          
          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <MappingForm
              formData={formData}
              setFormData={setFormData}
              packages={packages}
              plans={plans}
              onSubmit={handleFormSubmit}
              onCancel={closeCreateDialog}
              isLoading={isLoading}
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) closeEditDialog();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Mapeamento</DialogTitle>
            <DialogDescription>
              Modifique as configurações do mapeamento selecionado
            </DialogDescription>
          </DialogHeader>
          
          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
            <MappingForm
              formData={formData}
              setFormData={setFormData}
              packages={packages}
              plans={plans}
              onSubmit={handleFormSubmit}
              onCancel={closeEditDialog}
              isLoading={isLoading}
              isEditing
            />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) closeDeleteDialog();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este mapeamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default TheBestPlanMappingManager;
