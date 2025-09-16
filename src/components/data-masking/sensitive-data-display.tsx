/**
 * Componente para Exibição de Dados Sensíveis
 * 
 * Exibe dados sensíveis com mascaramento automático baseado em:
 * - Papel do usuário
 * - Permissões
 * - Configurações personalizadas
 * - Contexto de uso
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  EyeOff,
  Copy,
  Shield,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Info,
  Download,
  Share
} from 'lucide-react';
import {
  AdvancedMaskingType,
  MaskingLevel,
  AdvancedMaskingContext
} from '@/lib/data-masking-advanced';
import { useDataMasking } from '@/hooks/use-data-masking';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface SensitiveDataDisplayProps {
  // Dados a serem exibidos
  data: Record<string, any>;
  
  // Configurações do usuário
  userId: string;
  userRole: string;
  userPermissions: string[];
  
  // Configurações de exibição
  fields?: string[]; // Campos específicos para exibir
  layout?: 'horizontal' | 'vertical' | 'grid' | 'table';
  showControls?: boolean; // Mostrar controles de mascaramento
  allowToggle?: boolean; // Permitir alternar mascaramento
  allowCopy?: boolean; // Permitir copiar dados
  allowExport?: boolean; // Permitir exportar dados
  
  // Contexto de mascaramento
  context?: Partial<AdvancedMaskingContext>;
  
  // Configurações visuais
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
  showTypes?: boolean;
  showLevels?: boolean;
  
  // Callbacks
  onDataAccess?: (fieldName: string, value: any, masked: boolean) => void;
  onToggleMasking?: (fieldName: string, masked: boolean) => void;
  onCopy?: (fieldName: string, value: any) => void;
}

interface FieldDisplayProps {
  fieldName: string;
  value: any;
  maskedValue: any;
  dataType: AdvancedMaskingType;
  maskingLevel: MaskingLevel;
  isRevealed: boolean;
  canReveal: boolean;
  showControls: boolean;
  allowToggle: boolean;
  allowCopy: boolean;
  compact: boolean;
  showLabels: boolean;
  showTypes: boolean;
  showLevels: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onAccess: () => void;
}

// ============================================
// CONSTANTES
// ============================================

const DATA_TYPE_ICONS: Record<AdvancedMaskingType, React.ComponentType<{ className?: string }>> = {
  email: () => <span className="text-blue-500">@</span>,
  phone: () => <span className="text-green-500">📞</span>,
  cpf: () => <span className="text-purple-500">🆔</span>,
  cnpj: () => <span className="text-purple-500">🏢</span>,
  credit_card: () => <span className="text-yellow-500">💳</span>,
  bank_account: () => <span className="text-blue-500">🏦</span>,
  bank_agency: () => <span className="text-blue-500">🏦</span>,
  pix_key: () => <span className="text-green-500">💰</span>,
  password: () => <Lock className="h-4 w-4 text-red-500" />,
  name: () => <span className="text-gray-500">👤</span>,
  full_address: () => <span className="text-orange-500">📍</span>,
  street_address: () => <span className="text-orange-500">🏠</span>,
  postal_code: () => <span className="text-orange-500">📮</span>,
  ip_address: () => <span className="text-cyan-500">🌐</span>,
  mac_address: () => <span className="text-cyan-500">🔗</span>,
  license_plate: () => <span className="text-gray-500">🚗</span>,
  passport: () => <span className="text-blue-500">📘</span>,
  rg: () => <span className="text-purple-500">🆔</span>,
  social_security: () => <span className="text-red-500">🛡️</span>,
  iban: () => <span className="text-blue-500">🏦</span>,
  swift_code: () => <span className="text-blue-500">🏦</span>,
  custom: () => <span className="text-gray-500">📄</span>
};

const MASKING_LEVEL_COLORS: Record<MaskingLevel, string> = {
  none: 'bg-red-100 text-red-800 border-red-200',
  minimal: 'bg-orange-100 text-orange-800 border-orange-200',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  substantial: 'bg-blue-100 text-blue-800 border-blue-200',
  full: 'bg-green-100 text-green-800 border-green-200',
  hash: 'bg-purple-100 text-purple-800 border-purple-200'
};

const MASKING_LEVEL_LABELS: Record<MaskingLevel, string> = {
  none: 'Visível',
  minimal: 'Mínimo',
  partial: 'Parcial',
  substantial: 'Substancial',
  full: 'Completo',
  hash: 'Hash'
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function SensitiveDataDisplay({
  data,
  userId,
  userRole,
  userPermissions,
  fields,
  layout = 'vertical',
  showControls = true,
  allowToggle = true,
  allowCopy = true,
  allowExport = false,
  context = {},
  className,
  compact = false,
  showLabels = true,
  showTypes = false,
  showLevels = false,
  onDataAccess,
  onToggleMasking,
  onCopy
}: SensitiveDataDisplayProps) {
  const { toast } = useToast();
  const {
    maskData,
    getEffectiveLevel,
    preferences
  } = useDataMasking({
    userId,
    userRole,
    userPermissions,
    enableLogging: true
  });

  // ============================================
  // ESTADO
  // ============================================

  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const [maskedData, setMaskedData] = useState<Record<string, any>>({});
  const [fieldTypes, setFieldTypes] = useState<Record<string, AdvancedMaskingType>>({});
  const [fieldLevels, setFieldLevels] = useState<Record<string, MaskingLevel>>({});

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    if (preferences) {
      updateMaskedData();
    }
  }, [data, preferences, context]);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const updateMaskedData = () => {
    const masked = maskData(data, context);
    setMaskedData(masked);

    // Detectar tipos de dados e níveis de mascaramento
    const types: Record<string, AdvancedMaskingType> = {};
    const levels: Record<string, MaskingLevel> = {};

    Object.keys(data).forEach(fieldName => {
      const detectedType = detectDataType(fieldName, data[fieldName]);
      const effectiveLevel = getEffectiveLevel(fieldName, detectedType);
      
      types[fieldName] = detectedType;
      levels[fieldName] = effectiveLevel;
    });

    setFieldTypes(types);
    setFieldLevels(levels);
  };

  const detectDataType = (fieldName: string, value: any): AdvancedMaskingType => {
    if (!value || typeof value !== 'string') return 'custom';

    const lowerField = fieldName.toLowerCase();
    const stringValue = value.toString();

    // Detecção baseada no nome do campo
    if (lowerField.includes('email')) return 'email';
    if (lowerField.includes('phone') || lowerField.includes('telefone')) return 'phone';
    if (lowerField.includes('cpf')) return 'cpf';
    if (lowerField.includes('cnpj')) return 'cnpj';
    if (lowerField.includes('card') || lowerField.includes('cartao')) return 'credit_card';
    if (lowerField.includes('account') || lowerField.includes('conta')) return 'bank_account';
    if (lowerField.includes('agency') || lowerField.includes('agencia')) return 'bank_agency';
    if (lowerField.includes('pix')) return 'pix_key';
    if (lowerField.includes('password') || lowerField.includes('senha')) return 'password';
    if (lowerField.includes('name') || lowerField.includes('nome')) return 'name';
    if (lowerField.includes('address') || lowerField.includes('endereco')) return 'full_address';
    if (lowerField.includes('cep') || lowerField.includes('postal')) return 'postal_code';
    if (lowerField.includes('ip')) return 'ip_address';
    if (lowerField.includes('mac')) return 'mac_address';
    if (lowerField.includes('plate') || lowerField.includes('placa')) return 'license_plate';
    if (lowerField.includes('passport') || lowerField.includes('passaporte')) return 'passport';
    if (lowerField.includes('rg')) return 'rg';
    if (lowerField.includes('iban')) return 'iban';
    if (lowerField.includes('swift')) return 'swift_code';

    // Detecção baseada no padrão do valor
    if (/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(stringValue)) return 'email';
    if (/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(stringValue)) return 'phone';
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(stringValue)) return 'cpf';
    if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(stringValue)) return 'cnpj';
    if (/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/.test(stringValue)) return 'credit_card';
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(stringValue)) return 'ip_address';
    if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(stringValue)) return 'mac_address';
    if (/^\d{5}-?\d{3}$/.test(stringValue)) return 'postal_code';

    return 'custom';
  };

  const toggleFieldReveal = (fieldName: string) => {
    const newRevealed = new Set(revealedFields);
    const isCurrentlyRevealed = revealedFields.has(fieldName);

    if (isCurrentlyRevealed) {
      newRevealed.delete(fieldName);
    } else {
      newRevealed.add(fieldName);
      // Registrar acesso aos dados
      onDataAccess?.(fieldName, data[fieldName], false);
    }

    setRevealedFields(newRevealed);
    onToggleMasking?.(fieldName, !isCurrentlyRevealed);
  };

  const copyFieldValue = async (fieldName: string) => {
    try {
      const value = revealedFields.has(fieldName) ? data[fieldName] : maskedData[fieldName];
      await navigator.clipboard.writeText(value?.toString() || '');
      
      toast({
        title: 'Copiado!',
        description: `${fieldName} foi copiado para a área de transferência.`,
      });
      
      onCopy?.(fieldName, value);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: 'Erro ao Copiar',
        description: 'Não foi possível copiar o valor.',
        variant: 'destructive'
      });
    }
  };

  const exportData = () => {
    try {
      const exportData = fields ? 
        Object.fromEntries(fields.map(field => [field, maskedData[field]])) :
        maskedData;
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sensitive-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Dados Exportados',
        description: 'Os dados foram exportados com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: 'Erro na Exportação',
        description: 'Não foi possível exportar os dados.',
        variant: 'destructive'
      });
    }
  };

  const canRevealField = (fieldName: string): boolean => {
    const fieldType = fieldTypes[fieldName];
    const fieldLevel = fieldLevels[fieldName];
    
    // Verificar permissões específicas
    if (fieldLevel === 'full' || fieldLevel === 'hash') {
      return userPermissions.includes('view_sensitive_data') || userRole === 'admin';
    }
    
    return allowToggle;
  };

  const getFieldsToDisplay = (): string[] => {
    return fields || Object.keys(data);
  };

  const getLayoutClasses = (): string => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-wrap gap-4';
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
      case 'table':
        return 'space-y-0';
      default:
        return 'space-y-4';
    }
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  const fieldsToDisplay = getFieldsToDisplay();

  if (fieldsToDisplay.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum dado para exibir</h3>
        <p className="text-muted-foreground">
          Não há dados sensíveis disponíveis para visualização.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Cabeçalho com controles globais */}
        {showControls && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {fieldsToDisplay.length} campo(s) sensível(is)
              </span>
            </div>
            <div className="flex gap-2">
              {allowExport && (
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Opções
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Controles de Exibição</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRevealedFields(new Set())}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Ocultar Todos
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setRevealedFields(new Set(fieldsToDisplay.filter(f => canRevealField(f))))}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Revelar Permitidos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Lista de campos */}
        <div className={getLayoutClasses()}>
          {layout === 'table' ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Campo</th>
                    <th className="text-left p-3 font-medium">Valor</th>
                    {showTypes && <th className="text-left p-3 font-medium">Tipo</th>}
                    {showLevels && <th className="text-left p-3 font-medium">Nível</th>}
                    {showControls && <th className="text-left p-3 font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {fieldsToDisplay.map((fieldName) => (
                    <tr key={fieldName} className="border-t">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {React.createElement(DATA_TYPE_ICONS[fieldTypes[fieldName]] || DATA_TYPE_ICONS.custom)}
                          {showLabels && <span className="font-medium">{fieldName}</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <FieldValue
                          fieldName={fieldName}
                          value={data[fieldName]}
                          maskedValue={maskedData[fieldName]}
                          isRevealed={revealedFields.has(fieldName)}
                          compact={compact}
                        />
                      </td>
                      {showTypes && (
                        <td className="p-3">
                          <Badge variant="secondary">
                            {fieldTypes[fieldName]}
                          </Badge>
                        </td>
                      )}
                      {showLevels && (
                        <td className="p-3">
                          <Badge className={MASKING_LEVEL_COLORS[fieldLevels[fieldName]]}>
                            {MASKING_LEVEL_LABELS[fieldLevels[fieldName]]}
                          </Badge>
                        </td>
                      )}
                      {showControls && (
                        <td className="p-3">
                          <FieldControls
                            fieldName={fieldName}
                            isRevealed={revealedFields.has(fieldName)}
                            canReveal={canRevealField(fieldName)}
                            allowToggle={allowToggle}
                            allowCopy={allowCopy}
                            onToggle={() => toggleFieldReveal(fieldName)}
                            onCopy={() => copyFieldValue(fieldName)}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            fieldsToDisplay.map((fieldName) => (
              <FieldDisplay
                key={fieldName}
                fieldName={fieldName}
                value={data[fieldName]}
                maskedValue={maskedData[fieldName]}
                dataType={fieldTypes[fieldName]}
                maskingLevel={fieldLevels[fieldName]}
                isRevealed={revealedFields.has(fieldName)}
                canReveal={canRevealField(fieldName)}
                showControls={showControls}
                allowToggle={allowToggle}
                allowCopy={allowCopy}
                compact={compact}
                showLabels={showLabels}
                showTypes={showTypes}
                showLevels={showLevels}
                onToggle={() => toggleFieldReveal(fieldName)}
                onCopy={() => copyFieldValue(fieldName)}
                onAccess={() => onDataAccess?.(fieldName, data[fieldName], revealedFields.has(fieldName))}
              />
            ))
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function FieldDisplay({
  fieldName,
  value,
  maskedValue,
  dataType,
  maskingLevel,
  isRevealed,
  canReveal,
  showControls,
  allowToggle,
  allowCopy,
  compact,
  showLabels,
  showTypes,
  showLevels,
  onToggle,
  onCopy,
  onAccess
}: FieldDisplayProps) {
  const IconComponent = DATA_TYPE_ICONS[dataType] || DATA_TYPE_ICONS.custom;

  return (
    <div className={cn(
      'border rounded-lg p-4 space-y-3',
      compact && 'p-2 space-y-2'
    )}>
      {/* Cabeçalho do campo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconComponent />
          {showLabels && (
            <span className={cn(
              'font-medium',
              compact ? 'text-sm' : 'text-base'
            )}>
              {fieldName}
            </span>
          )}
          {showTypes && (
            <Badge variant="outline" className={compact ? 'text-xs' : ''}>
              {dataType}
            </Badge>
          )}
          {showLevels && (
            <Badge className={cn(
              MASKING_LEVEL_COLORS[maskingLevel],
              compact ? 'text-xs' : ''
            )}>
              {MASKING_LEVEL_LABELS[maskingLevel]}
            </Badge>
          )}
        </div>
        
        {showControls && (
          <FieldControls
            fieldName={fieldName}
            isRevealed={isRevealed}
            canReveal={canReveal}
            allowToggle={allowToggle}
            allowCopy={allowCopy}
            onToggle={onToggle}
            onCopy={onCopy}
          />
        )}
      </div>

      {/* Valor do campo */}
      <FieldValue
        fieldName={fieldName}
        value={value}
        maskedValue={maskedValue}
        isRevealed={isRevealed}
        compact={compact}
        onClick={onAccess}
      />
    </div>
  );
}

interface FieldValueProps {
  fieldName: string;
  value: any;
  maskedValue: any;
  isRevealed: boolean;
  compact?: boolean;
  onClick?: () => void;
}

function FieldValue({ fieldName, value, maskedValue, isRevealed, compact, onClick }: FieldValueProps) {
  const displayValue = isRevealed ? value : maskedValue;
  
  return (
    <div 
      className={cn(
        'font-mono bg-muted/50 rounded px-3 py-2 cursor-pointer transition-colors hover:bg-muted',
        compact && 'px-2 py-1 text-sm'
      )}
      onClick={onClick}
    >
      <span className={cn(
        isRevealed ? 'text-foreground' : 'text-muted-foreground',
        'break-all'
      )}>
        {displayValue?.toString() || '—'}
      </span>
    </div>
  );
}

interface FieldControlsProps {
  fieldName: string;
  isRevealed: boolean;
  canReveal: boolean;
  allowToggle: boolean;
  allowCopy: boolean;
  onToggle: () => void;
  onCopy: () => void;
}

function FieldControls({
  fieldName,
  isRevealed,
  canReveal,
  allowToggle,
  allowCopy,
  onToggle,
  onCopy
}: FieldControlsProps) {
  return (
    <div className="flex items-center gap-1">
      {allowToggle && canReveal && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              {isRevealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isRevealed ? 'Ocultar valor' : 'Revelar valor'}
          </TooltipContent>
        </Tooltip>
      )}
      
      {!canReveal && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-8 w-8 flex items-center justify-center">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Acesso restrito
          </TooltipContent>
        </Tooltip>
      )}
      
      {allowCopy && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Copiar valor
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default SensitiveDataDisplay;