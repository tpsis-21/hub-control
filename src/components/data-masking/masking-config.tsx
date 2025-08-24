/**
 * Componente de Configuração de Mascaramento de Dados
 * 
 * Permite aos usuários configurar suas preferências de mascaramento
 * e visualizar logs de acesso a dados sensíveis
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Shield,
  Eye,
  EyeOff,
  Settings,
  History,
  Plus,
  Trash2,
  Edit,
  Download,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Database,
  Lock,
  Unlock
} from 'lucide-react';
import {
  AdvancedMaskingType,
  MaskingLevel,
  AdvancedMaskingRule,
  UserMaskingPreferences,
  MaskingAccessLog,
  setUserMaskingPreferences,
  getMaskingAccessLogs,
  clearOldMaskingLogs,
  maskDataAdvanced
} from '@/lib/data-masking-advanced';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface MaskingConfigProps {
  userId: string;
  userRole: string;
  userPermissions: string[];
  onPreferencesChange?: (preferences: UserMaskingPreferences) => void;
}

interface CustomRuleFormData {
  field: string;
  type: AdvancedMaskingType;
  level: MaskingLevel;
  logAccess: boolean;
  allowedRoles: string[];
  allowedPermissions: string[];
}

// ============================================
// CONSTANTES
// ============================================

const MASKING_TYPES: { value: AdvancedMaskingType; label: string; description: string }[] = [
  { value: 'email', label: 'E-mail', description: 'Endereços de e-mail' },
  { value: 'phone', label: 'Telefone', description: 'Números de telefone' },
  { value: 'cpf', label: 'CPF', description: 'Cadastro de Pessoa Física' },
  { value: 'cnpj', label: 'CNPJ', description: 'Cadastro Nacional da Pessoa Jurídica' },
  { value: 'credit_card', label: 'Cartão de Crédito', description: 'Números de cartão de crédito' },
  { value: 'bank_account', label: 'Conta Bancária', description: 'Números de conta bancária' },
  { value: 'bank_agency', label: 'Agência Bancária', description: 'Números de agência bancária' },
  { value: 'pix_key', label: 'Chave PIX', description: 'Chaves PIX (CPF, e-mail, telefone, aleatória)' },
  { value: 'password', label: 'Senha', description: 'Senhas e credenciais' },
  { value: 'name', label: 'Nome', description: 'Nomes pessoais' },
  { value: 'full_address', label: 'Endereço Completo', description: 'Endereços completos' },
  { value: 'street_address', label: 'Endereço', description: 'Endereços de rua' },
  { value: 'postal_code', label: 'CEP', description: 'Códigos postais' },
  { value: 'ip_address', label: 'Endereço IP', description: 'Endereços IP' },
  { value: 'mac_address', label: 'Endereço MAC', description: 'Endereços MAC' },
  { value: 'license_plate', label: 'Placa de Veículo', description: 'Placas de veículos' },
  { value: 'passport', label: 'Passaporte', description: 'Números de passaporte' },
  { value: 'rg', label: 'RG', description: 'Registro Geral' },
  { value: 'social_security', label: 'Seguro Social', description: 'Números de seguro social' },
  { value: 'iban', label: 'IBAN', description: 'International Bank Account Number' },
  { value: 'swift_code', label: 'Código SWIFT', description: 'Códigos SWIFT bancários' },
  { value: 'custom', label: 'Personalizado', description: 'Tipo personalizado' }
];

const MASKING_LEVELS: { value: MaskingLevel; label: string; description: string; color: string }[] = [
  { value: 'none', label: 'Nenhum', description: 'Dados visíveis completamente', color: 'bg-red-100 text-red-800' },
  { value: 'minimal', label: 'Mínimo', description: 'Mascaramento leve', color: 'bg-orange-100 text-orange-800' },
  { value: 'partial', label: 'Parcial', description: 'Mascaramento moderado', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'substantial', label: 'Substancial', description: 'Mascaramento forte', color: 'bg-blue-100 text-blue-800' },
  { value: 'full', label: 'Completo', description: 'Dados completamente mascarados', color: 'bg-green-100 text-green-800' },
  { value: 'hash', label: 'Hash', description: 'Dados convertidos em hash', color: 'bg-purple-100 text-purple-800' }
];

const SAMPLE_DATA = {
  email: 'usuario@exemplo.com',
  phone: '(11) 99999-9999',
  cpf: '123.456.789-00',
  cnpj: '12.345.678/0001-90',
  credit_card: '1234 5678 9012 3456',
  bank_account: '123456-7',
  name: 'João da Silva Santos',
  full_address: 'Rua das Flores, 123, Bairro Centro, São Paulo - SP, 01234-567'
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function MaskingConfig({ userId, userRole, userPermissions, onPreferencesChange }: MaskingConfigProps) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserMaskingPreferences>({
    userId,
    customRules: [],
    defaultLevel: 'partial',
    enableLogging: true,
    allowedDataTypes: [],
    restrictedDataTypes: []
  });
  const [accessLogs, setAccessLogs] = useState<MaskingAccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AdvancedMaskingRule | null>(null);
  const [logFilters, setLogFilters] = useState({
    dataType: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    loadAccessLogs();
  }, []);

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const loadAccessLogs = () => {
    try {
      const logs = getMaskingAccessLogs({ userId });
      setAccessLogs(logs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os logs de acesso.',
        variant: 'destructive'
      });
    }
  };

  const savePreferences = async () => {
    setIsLoading(true);
    try {
      setUserMaskingPreferences(userId, preferences);
      onPreferencesChange?.(preferences);
      toast({
        title: 'Sucesso',
        description: 'Preferências de mascaramento salvas com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as preferências.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomRule = (ruleData: CustomRuleFormData) => {
    const newRule: AdvancedMaskingRule = {
      field: ruleData.field,
      type: ruleData.type,
      level: ruleData.level,
      logAccess: ruleData.logAccess,
      allowedRoles: ruleData.allowedRoles,
      allowedPermissions: ruleData.allowedPermissions
    };

    setPreferences(prev => ({
      ...prev,
      customRules: [...prev.customRules, newRule]
    }));

    setShowRuleDialog(false);
    toast({
      title: 'Sucesso',
      description: 'Regra personalizada adicionada!',
    });
  };

  const updateCustomRule = (index: number, ruleData: CustomRuleFormData) => {
    const updatedRule: AdvancedMaskingRule = {
      field: ruleData.field,
      type: ruleData.type,
      level: ruleData.level,
      logAccess: ruleData.logAccess,
      allowedRoles: ruleData.allowedRoles,
      allowedPermissions: ruleData.allowedPermissions
    };

    setPreferences(prev => ({
      ...prev,
      customRules: prev.customRules.map((rule, i) => i === index ? updatedRule : rule)
    }));

    setEditingRule(null);
    setShowRuleDialog(false);
    toast({
      title: 'Sucesso',
      description: 'Regra personalizada atualizada!',
    });
  };

  const removeCustomRule = (index: number) => {
    setPreferences(prev => ({
      ...prev,
      customRules: prev.customRules.filter((_, i) => i !== index)
    }));

    toast({
      title: 'Sucesso',
      description: 'Regra personalizada removida!',
    });
  };

  const clearLogs = async () => {
    try {
      clearOldMaskingLogs(0); // Limpar todos os logs
      loadAccessLogs();
      toast({
        title: 'Sucesso',
        description: 'Logs de acesso limpos com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível limpar os logs.',
        variant: 'destructive'
      });
    }
  };

  const exportLogs = () => {
    try {
      const dataStr = JSON.stringify(accessLogs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `masking-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Sucesso',
        description: 'Logs exportados com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível exportar os logs.',
        variant: 'destructive'
      });
    }
  };

  const getFilteredLogs = () => {
    return accessLogs.filter(log => {
      const matchesDataType = !logFilters.dataType || log.dataType === logFilters.dataType;
      const matchesSearch = !logFilters.search || 
        log.fieldName.toLowerCase().includes(logFilters.search.toLowerCase()) ||
        log.userRole.toLowerCase().includes(logFilters.search.toLowerCase());
      
      let matchesDateRange = true;
      if (logFilters.startDate) {
        matchesDateRange = matchesDateRange && log.timestamp >= new Date(logFilters.startDate);
      }
      if (logFilters.endDate) {
        matchesDateRange = matchesDateRange && log.timestamp <= new Date(logFilters.endDate);
      }
      
      return matchesDataType && matchesSearch && matchesDateRange;
    });
  };

  const getMaskingLevelInfo = (level: MaskingLevel) => {
    return MASKING_LEVELS.find(l => l.value === level) || MASKING_LEVELS[2];
  };

  const getMaskingTypeInfo = (type: AdvancedMaskingType) => {
    return MASKING_TYPES.find(t => t.value === type) || MASKING_TYPES[0];
  };

  const previewMasking = (type: AdvancedMaskingType, level: MaskingLevel) => {
    const sampleValue = SAMPLE_DATA[type as keyof typeof SAMPLE_DATA] || 'Exemplo de dados';
    return maskDataAdvanced(
      { [type]: sampleValue },
      userRole,
      userPermissions,
      { purpose: 'display', dataClassification: 'internal' }
    )[type];
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configuração de Mascaramento</h2>
          <p className="text-muted-foreground">
            Configure como os dados sensíveis são exibidos e acompanhe o acesso aos dados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={savePreferences} disabled={isLoading}>
            <Settings className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preferences">
            <Shield className="h-4 w-4 mr-2" />
            Preferências
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Settings className="h-4 w-4 mr-2" />
            Regras Personalizadas
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-2" />
            Logs de Acesso
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Visualização
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* TAB: PREFERÊNCIAS GERAIS */}
        {/* ============================================ */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure o comportamento padrão do mascaramento de dados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultLevel">Nível Padrão de Mascaramento</Label>
                  <Select
                    value={preferences.defaultLevel}
                    onValueChange={(value: MaskingLevel) => 
                      setPreferences(prev => ({ ...prev, defaultLevel: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MASKING_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={level.color}>{level.label}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {level.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableLogging">Habilitar Logs de Acesso</Label>
                    <Switch
                      id="enableLogging"
                      checked={preferences.enableLogging}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, enableLogging: checked }))
                      }
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Registra quando dados sensíveis são acessados ou visualizados.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tipos de Dados Permitidos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {MASKING_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`allowed-${type.value}`}
                        checked={preferences.allowedDataTypes.includes(type.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPreferences(prev => ({
                              ...prev,
                              allowedDataTypes: [...prev.allowedDataTypes, type.value],
                              restrictedDataTypes: prev.restrictedDataTypes.filter(t => t !== type.value)
                            }));
                          } else {
                            setPreferences(prev => ({
                              ...prev,
                              allowedDataTypes: prev.allowedDataTypes.filter(t => t !== type.value)
                            }));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label 
                        htmlFor={`allowed-${type.value}`} 
                        className="text-sm cursor-pointer"
                        title={type.description}
                      >
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: REGRAS PERSONALIZADAS */}
        {/* ============================================ */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Regras Personalizadas</CardTitle>
                  <CardDescription>
                    Crie regras específicas para campos ou tipos de dados.
                  </CardDescription>
                </div>
                <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingRule(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Regra
                    </Button>
                  </DialogTrigger>
                  <CustomRuleDialog
                    rule={editingRule}
                    onSave={(ruleData) => {
                      if (editingRule) {
                        const index = preferences.customRules.findIndex(r => r === editingRule);
                        updateCustomRule(index, ruleData);
                      } else {
                        addCustomRule(ruleData);
                      }
                    }}
                    onCancel={() => {
                      setShowRuleDialog(false);
                      setEditingRule(null);
                    }}
                  />
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {preferences.customRules.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma regra personalizada</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie regras específicas para controlar como diferentes tipos de dados são mascarados.
                  </p>
                  <Button onClick={() => setShowRuleDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Regra
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {preferences.customRules.map((rule, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{rule.field}</Badge>
                            <Badge className={getMaskingLevelInfo(rule.level).color}>
                              {getMaskingLevelInfo(rule.level).label}
                            </Badge>
                            <Badge variant="secondary">
                              {getMaskingTypeInfo(rule.type).label}
                            </Badge>
                            {rule.logAccess && (
                              <Badge variant="outline">
                                <History className="h-3 w-3 mr-1" />
                                Log
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getMaskingTypeInfo(rule.type).description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingRule(rule);
                              setShowRuleDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomRule(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: LOGS DE ACESSO */}
        {/* ============================================ */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Logs de Acesso a Dados</CardTitle>
                  <CardDescription>
                    Histórico de acesso e mascaramento de dados sensíveis.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportLogs}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                  <Button variant="outline" onClick={clearLogs}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Campo ou usuário..."
                      value={logFilters.search}
                      onChange={(e) => setLogFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Dados</Label>
                  <Select
                    value={logFilters.dataType}
                    onValueChange={(value) => setLogFilters(prev => ({ ...prev, dataType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os tipos</SelectItem>
                      {MASKING_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={logFilters.startDate}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={logFilters.endDate}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Tabela de Logs */}
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Valor Mascarado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredLogs().map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(log.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.fieldName}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getMaskingTypeInfo(log.dataType).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getMaskingLevelInfo(log.maskingLevel).color}>
                            {getMaskingLevelInfo(log.maskingLevel).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{log.userRole}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {log.maskedValue}
                          </code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {getFilteredLogs().length === 0 && (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum log encontrado</h3>
                  <p className="text-muted-foreground">
                    Não há logs de acesso que correspondam aos filtros aplicados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: VISUALIZAÇÃO */}
        {/* ============================================ */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visualização de Mascaramento</CardTitle>
              <CardDescription>
                Veja como diferentes tipos de dados são mascarados em cada nível.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {MASKING_TYPES.slice(0, 8).map(type => (
                  <div key={type.value} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{type.label}</Badge>
                      <span className="text-sm text-muted-foreground">{type.description}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                      {MASKING_LEVELS.map(level => (
                        <div key={level.value} className="space-y-1">
                          <Badge className={level.color} variant="secondary">
                            {level.label}
                          </Badge>
                          <code className="block text-xs bg-muted p-2 rounded">
                            {previewMasking(type.value, level.value)}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// COMPONENTE: DIÁLOGO DE REGRA PERSONALIZADA
// ============================================

interface CustomRuleDialogProps {
  rule?: AdvancedMaskingRule | null;
  onSave: (ruleData: CustomRuleFormData) => void;
  onCancel: () => void;
}

function CustomRuleDialog({ rule, onSave, onCancel }: CustomRuleDialogProps) {
  const [formData, setFormData] = useState<CustomRuleFormData>({
    field: rule?.field || '',
    type: rule?.type || 'email',
    level: rule?.level || 'partial',
    logAccess: rule?.logAccess || true,
    allowedRoles: rule?.allowedRoles || [],
    allowedPermissions: rule?.allowedPermissions || []
  });

  const handleSave = () => {
    if (!formData.field.trim()) {
      return;
    }
    onSave(formData);
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {rule ? 'Editar Regra Personalizada' : 'Nova Regra Personalizada'}
        </DialogTitle>
        <DialogDescription>
          Configure como um campo específico deve ser mascarado.
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="field">Nome do Campo</Label>
            <Input
              id="field"
              placeholder="ex: email, cpf, telefone"
              value={formData.field}
              onChange={(e) => setFormData(prev => ({ ...prev, field: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Dados</Label>
            <Select
              value={formData.type}
              onValueChange={(value: AdvancedMaskingType) => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MASKING_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="level">Nível de Mascaramento</Label>
            <Select
              value={formData.level}
              onValueChange={(value: MaskingLevel) => 
                setFormData(prev => ({ ...prev, level: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MASKING_LEVELS.map(level => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={level.color}>{level.label}</Badge>
                      <span className="text-sm">{level.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="logAccess">Registrar Acesso</Label>
              <Switch
                id="logAccess"
                checked={formData.logAccess}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, logAccess: checked }))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Registra quando este campo é acessado
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Funções Permitidas (separadas por vírgula)</Label>
          <Input
            placeholder="admin, manager, user"
            value={formData.allowedRoles.join(', ')}
            onChange={(e) => 
              setFormData(prev => ({
                ...prev,
                allowedRoles: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Permissões Necessárias (separadas por vírgula)</Label>
          <Input
            placeholder="read_sensitive, view_personal_data"
            value={formData.allowedPermissions.join(', ')}
            onChange={(e) => 
              setFormData(prev => ({
                ...prev,
                allowedPermissions: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
              }))
            }
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!formData.field.trim()}>
          {rule ? 'Atualizar' : 'Criar'} Regra
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default MaskingConfig;