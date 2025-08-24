'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Save,
  X,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Globe,
  Webhook,
  Users,
  Send,
  AlertTriangle,
  CheckCircle,
  Code,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos para templates
interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject?: string;
  content: string;
  variables: string[];
  metadata: {
    description?: string;
    category?: string;
    tags?: string[];
    version?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  usage_count?: number;
}

interface TemplateFormData {
  name: string;
  type: string;
  channel: string;
  subject: string;
  content: string;
  description: string;
  category: string;
  tags: string;
  is_active: boolean;
}

const NotificationTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    channel: '',
    category: '',
    is_active: ''
  });
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    type: '',
    channel: '',
    subject: '',
    content: '',
    description: '',
    category: '',
    tags: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Opções para os selects
  const notificationTypes = [
    { value: 'security', label: 'Segurança' },
    { value: 'performance', label: 'Performance' },
    { value: 'system', label: 'Sistema' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'backup', label: 'Backup' },
    { value: 'maintenance', label: 'Manutenção' },
    { value: 'user', label: 'Usuário' },
    { value: 'billing', label: 'Faturamento' }
  ];

  const channels = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: Smartphone },
    { value: 'push', label: 'Push', icon: Bell },
    { value: 'webhook', label: 'Webhook', icon: Webhook },

    { value: 'teams', label: 'Teams', icon: Users },
    { value: 'discord', label: 'Discord', icon: MessageSquare },
    { value: 'telegram', label: 'Telegram', icon: Send },
    { value: 'in_app', label: 'In-App', icon: Bell }
  ];

  const categories = [
    { value: 'alerts', label: 'Alertas' },
    { value: 'notifications', label: 'Notificações' },
    { value: 'reports', label: 'Relatórios' },
    { value: 'reminders', label: 'Lembretes' },
    { value: 'confirmations', label: 'Confirmações' },
    { value: 'updates', label: 'Atualizações' }
  ];

  // Função para buscar templates
  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        ...filters
      });
      
      const response = await fetch(`/api/notifications/templates?${params}`);
      if (!response.ok) throw new Error('Erro ao carregar templates');
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os templates',
        variant: 'destructive'
      });
    }
  };

  // Carregar templates iniciais
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      await fetchTemplates();
      setLoading(false);
    };
    loadTemplates();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      fetchTemplates();
    }
  }, [searchTerm, filters]);

  // Função para resetar formulário
  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      channel: '',
      subject: '',
      content: '',
      description: '',
      category: '',
      tags: '',
      is_active: true
    });
    setFormErrors({});
    setEditingTemplate(null);
  };

  // Função para validar formulário
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
    if (!formData.type) errors.type = 'Tipo é obrigatório';
    if (!formData.channel) errors.channel = 'Canal é obrigatório';
    if (!formData.content.trim()) errors.content = 'Conteúdo é obrigatório';
    
    // Validar subject para email
    if (formData.channel === 'email' && !formData.subject.trim()) {
      errors.subject = 'Assunto é obrigatório para emails';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Função para salvar template
  const saveTemplate = async () => {
    if (!validateForm()) return;
    
    try {
      const templateData = {
        name: formData.name,
        type: formData.type,
        channel: formData.channel,
        subject: formData.subject || null,
        content: formData.content,
        metadata: {
          description: formData.description || null,
          category: formData.category || null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
          version: '1.0'
        },
        is_active: formData.is_active
      };
      
      const url = editingTemplate 
        ? `/api/notifications/templates` 
        : '/api/notifications/templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const body = editingTemplate 
        ? { id: editingTemplate.id, ...templateData }
        : templateData;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar template');
      }
      
      toast({
        title: 'Sucesso',
        description: `Template ${editingTemplate ? 'atualizado' : 'criado'} com sucesso`
      });
      
      setIsDialogOpen(false);
      resetForm();
      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Função para editar template
  const editTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      channel: template.channel,
      subject: template.subject || '',
      content: template.content,
      description: template.metadata.description || '',
      category: template.metadata.category || '',
      tags: template.metadata.tags?.join(', ') || '',
      is_active: template.is_active
    });
    setIsDialogOpen(true);
  };

  // Função para duplicar template
  const duplicateTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Cópia)`,
      type: template.type,
      channel: template.channel,
      subject: template.subject || '',
      content: template.content,
      description: template.metadata.description || '',
      category: template.metadata.category || '',
      tags: template.metadata.tags?.join(', ') || '',
      is_active: false
    });
    setIsDialogOpen(true);
  };

  // Função para deletar template
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) return;
    
    try {
      const response = await fetch('/api/notifications/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar template');
      }
      
      toast({
        title: 'Sucesso',
        description: 'Template deletado com sucesso'
      });
      
      await fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Função para obter ícone do canal
  const getChannelIcon = (channel: string) => {
    const channelConfig = channels.find(c => c.value === channel);
    if (channelConfig) {
      const Icon = channelConfig.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Globe className="h-4 w-4" />;
  };

  // Função para extrair variáveis do template
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{\s*([^}]+)\s*\}\}/g);
    if (!matches) return [];
    
    return [...new Set(matches.map(match => 
      match.replace(/[{}\s]/g, '')
    ))];
  };

  // Função para preview do template
  const previewTemplateContent = (template: NotificationTemplate) => {
    setPreviewTemplate(template);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de Notificação</h1>
          <p className="text-muted-foreground">
            Gerencie templates reutilizáveis para suas notificações
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate 
                  ? 'Edite as informações do template de notificação'
                  : 'Crie um novo template reutilizável para suas notificações'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Alerta de Segurança"
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-500">{formErrors.name}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.type && (
                    <p className="text-sm text-red-500">{formErrors.type}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="channel">Canal *</Label>
                  <Select value={formData.channel} onValueChange={(value) => setFormData(prev => ({ ...prev, channel: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map(channel => {
                        const Icon = channel.icon;
                        return (
                          <SelectItem key={channel.value} value={channel.value}>
                            <div className="flex items-center space-x-2">
                              <Icon className="h-4 w-4" />
                              <span>{channel.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formErrors.channel && (
                    <p className="text-sm text-red-500">{formErrors.channel}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Assunto (apenas para email) */}
              {formData.channel === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ex: [ALERTA] Tentativa de acesso suspeita detectada"
                  />
                  {formErrors.subject && (
                    <p className="text-sm text-red-500">{formErrors.subject}</p>
                  )}
                </div>
              )}
              
              {/* Conteúdo */}
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Digite o conteúdo do template. Use {{variavel}} para inserir variáveis dinâmicas."
                  rows={8}
                />
                {formErrors.content && (
                  <p className="text-sm text-red-500">{formErrors.content}</p>
                )}
                
                {/* Variáveis detectadas */}
                {formData.content && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">Variáveis detectadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {extractVariables(formData.content).map(variable => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Descrição e Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva quando e como usar este template"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="Ex: urgente, segurança, alerta (separadas por vírgula)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe as tags com vírgulas
                  </p>
                </div>
              </div>
              
              {/* Status */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="is_active">Template ativo</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveTemplate}>
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? 'Atualizar' : 'Criar'} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                {notificationTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.channel} onValueChange={(value) => setFilters(prev => ({ ...prev, channel: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os canais</SelectItem>
                {channels.map(channel => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.is_active} onValueChange={(value) => setFilters(prev => ({ ...prev, is_active: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className={`${!template.is_active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.metadata.description || 'Sem descrição'}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => previewTemplateContent(template)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {getChannelIcon(template.channel)}
                    <span className="ml-1 capitalize">{template.channel}</span>
                  </Badge>
                  <Badge variant="secondary">{template.type}</Badge>
                  {template.metadata.category && (
                    <Badge variant="outline">{template.metadata.category}</Badge>
                  )}
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                
                {/* Conteúdo preview */}
                <div className="text-sm text-muted-foreground">
                  <p className="line-clamp-3">
                    {template.content.substring(0, 120)}
                    {template.content.length > 120 && '...'}
                  </p>
                </div>
                
                {/* Variáveis */}
                {template.variables.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Variáveis:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map(variable => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {variable}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Tags */}
                {template.metadata.tags && template.metadata.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.metadata.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.metadata.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.metadata.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Informações adicionais */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>
                    Criado {formatDistanceToNow(new Date(template.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                  {template.usage_count !== undefined && (
                    <span>{template.usage_count} usos</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Preview */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview do Template</DialogTitle>
            <DialogDescription>
              Visualização do template: {previewTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              {/* Informações do template */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tipo:</span> {previewTemplate.type}
                </div>
                <div>
                  <span className="font-medium">Canal:</span> {previewTemplate.channel}
                </div>
                {previewTemplate.subject && (
                  <div className="col-span-2">
                    <span className="font-medium">Assunto:</span> {previewTemplate.subject}
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Conteúdo */}
              <div>
                <h4 className="font-medium mb-2">Conteúdo:</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{previewTemplate.content}</pre>
                </div>
              </div>
              
              {/* Variáveis */}
              {previewTemplate.variables.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Variáveis disponíveis:</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.variables.map(variable => (
                      <Badge key={variable} variant="outline">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Fechar
            </Button>
            {previewTemplate && (
              <Button onClick={() => {
                editTemplate(previewTemplate);
                setPreviewTemplate(null);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mensagem quando não há templates */}
      {templates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'Nenhum template corresponde aos filtros aplicados.'
                : 'Comece criando seu primeiro template de notificação.'
              }
            </p>
            <Button onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationTemplateManager;