// @/app/(app)/testes/add-test-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, TestTube } from 'lucide-react';
import type { Plan, Server } from '@/lib/types';
import { TestTypeSelector } from '@/components/tests/test-type-selector';
import { AutomaticTestForm } from '@/components/tests/automatic-test-form';
import { ManualTestForm } from '@/components/tests/manual-test-form';

interface AddTestFormProps {
  plans: Plan[];
  servers: Server[];
}

type TestType = 'automatic' | 'manual' | null;

export function AddTestForm({ plans, servers }: AddTestFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<TestType>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog closes
      setSelectedType(null);
    }
  };

  const handleTypeSelect = (type: 'automatic' | 'manual') => {
    setSelectedType(type);
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const handleSuccess = () => {
    setOpen(false);
    setSelectedType(null);
  };

  const renderContent = () => {
    if (!selectedType) {
      return <TestTypeSelector onSelectType={handleTypeSelect} />;
    }

    if (selectedType === 'automatic') {
      return (
        <AutomaticTestForm 
          onBack={handleBack} 
          onSuccess={handleSuccess}
        />
      );
    }

    if (selectedType === 'manual') {
      return (
        <ManualTestForm 
          onBack={handleBack} 
          onSuccess={handleSuccess}
        />
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-to-r from-[#2196F3] to-[#3A4A5C] hover:from-[#1976D2] hover:to-[#2C3E50]">
          <TestTube className="mr-2 h-4 w-4" />
          Criar Teste
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        {!selectedType && (
          <DialogHeader className="sr-only">
            <DialogTitle>Adicionar Novo Teste</DialogTitle>
            <DialogDescription>
              Escolha o tipo de teste que deseja criar.
            </DialogDescription>
          </DialogHeader>
        )}
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
