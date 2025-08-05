'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, User, Clock, Settings } from 'lucide-react';

interface TestTypeSelectorProps {
  onSelectType: (type: 'automatic' | 'manual') => void;
}

export function TestTypeSelector({ onSelectType }: TestTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'automatic' | 'manual' | null>(null);

  const handleSelect = (type: 'automatic' | 'manual') => {
    setSelectedType(type);
    onSelectType(type);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Criar Novo Teste</h2>
        <p className="text-muted-foreground mt-2">
          Escolha o tipo de teste que deseja criar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Teste Automático */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedType === 'automatic' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleSelect('automatic')}
        >
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              Teste Automático
              <Badge variant="secondary">Recomendado</Badge>
            </CardTitle>
            <CardDescription>
              Criação automática via integração configurada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Integração com APIs</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Configuração rápida</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Dados gerados automaticamente</span>
              </div>
            </div>
            
            <div className="pt-4">
              <p className="text-xs text-muted-foreground">
                Ideal para testes rápidos com servidores que possuem integração configurada.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Teste Manual */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedType === 'manual' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleSelect('manual')}
        >
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-secondary-foreground" />
            </div>
            <CardTitle>Teste Manual</CardTitle>
            <CardDescription>
              Criação manual com dados personalizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Controle total dos dados</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Configuração personalizada</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Dados inseridos manualmente</span>
              </div>
            </div>
            
            <div className="pt-4">
              <p className="text-xs text-muted-foreground">
                Ideal quando você precisa de controle total sobre os dados do teste.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedType && (
        <div className="text-center">
          <Button 
            size="lg" 
            onClick={() => onSelectType(selectedType)}
            className="min-w-[200px]"
          >
            Continuar com {selectedType === 'automatic' ? 'Teste Automático' : 'Teste Manual'}
          </Button>
        </div>
      )}
    </div>
  );
}