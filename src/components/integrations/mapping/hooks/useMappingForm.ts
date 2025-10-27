'use client';

import { useState, useCallback } from 'react';
import { TheBestPlanMapping } from '../types';

/**
 * Hook customizado para gerenciar formulários e diálogos de mapeamento
 * Centraliza toda a lógica de estado dos formulários
 */

export interface FormData {
  thebest_package_id: string;
  hubcontrol_plan_id: string;
  is_active: boolean;
  is_default: boolean;
  sync_price: boolean;
  sync_validity: boolean;
  sync_screens: boolean;
  override_price?: string;
  override_validity?: string;
  override_screens?: string;
}

export interface UseMappingFormReturn {
  // Estados dos diálogos
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  
  // Estados do formulário
  formData: FormData;
  editingMapping: TheBestPlanMapping | null;
  deletingMappingId: string | null;
  
  // Funções de controle de diálogos
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (mapping: TheBestPlanMapping) => void;
  closeEditDialog: () => void;
  openDeleteDialog: (mappingId: string) => void;
  closeDeleteDialog: () => void;
  
  // Funções de formulário
  updateFormData: (field: keyof FormData, value: any) => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  resetForm: () => void;
  validateForm: () => boolean;
}

const initialFormData: FormData = {
  thebest_package_id: '',
  hubcontrol_plan_id: '',
  is_active: true,
  is_default: false,
  sync_price: true,
  sync_validity: true,
  sync_screens: true,
  override_price: undefined,
  override_validity: undefined,
  override_screens: undefined
};

export function useMappingForm(): UseMappingFormReturn {
  // Estados dos diálogos
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Estados do formulário
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editingMapping, setEditingMapping] = useState<TheBestPlanMapping | null>(null);
  const [deletingMappingId, setDeletingMappingId] = useState<string | null>(null);

  // Funções de controle de diálogos
  const openCreateDialog = useCallback(() => {
    resetForm();
    setIsCreateDialogOpen(true);
  }, []);

  const closeCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
    resetForm();
  }, []);

  const openEditDialog = useCallback((mapping: TheBestPlanMapping) => {
    setEditingMapping(mapping);
    setFormData({
      thebest_package_id: mapping.thebest_package_id,
      hubcontrol_plan_id: mapping.hubcontrol_plan_id,
      is_active: mapping.is_active,
      is_default: mapping.is_default,
      sync_price: mapping.sync_price,
      sync_validity: mapping.sync_validity,
      sync_screens: mapping.sync_screens,
      override_price: mapping.override_price,
      override_validity: mapping.override_validity,
      override_screens: mapping.override_screens
    });
    setIsEditDialogOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingMapping(null);
    resetForm();
  }, []);

  const openDeleteDialog = useCallback((mappingId: string) => {
    setDeletingMappingId(mappingId);
    setIsDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeletingMappingId(null);
  }, []);

  // Funções de formulário
  const updateFormData = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const validateForm = useCallback((): boolean => {
    // Validações básicas
    if (!formData.thebest_package_id.trim()) {
      return false;
    }
    
    if (!formData.hubcontrol_plan_id.trim()) {
      return false;
    }
    

    
    // Validação de overrides (se fornecidos)
    if (formData.override_price && parseFloat(formData.override_price) < 0) {
      return false;
    }
    
    if (formData.override_validity && parseInt(formData.override_validity) < 0) {
      return false;
    }
    
    if (formData.override_screens && parseInt(formData.override_screens) < 0) {
      return false;
    }
    
    return true;
  }, [formData]);

  return {
    // Estados dos diálogos
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    
    // Estados do formulário
    formData,
    editingMapping,
    deletingMappingId,
    
    // Funções de controle de diálogos
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    
    // Funções de formulário
    updateFormData,
    setFormData,
    resetForm,
    validateForm
  };
}
