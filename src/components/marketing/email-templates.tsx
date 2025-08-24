'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { sanitizeHtml } from '@/lib/sanitize'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Mail, 
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  Code,
  Palette,
  Variable,
  Clock
} from 'lucide-react'
import { EmailTemplate, TemplateVariable } from '@/lib/types/marketing'
import { MarketingService } from '@/services/marketing.service'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TEMPLATE_TYPES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'notification', label: 'Notificação' },
  { value: 'transactional', label: 'Transacional' }
]

const AVAILABLE_VARIABLES = [
  { name: '{{nome}}', description: 'Nome do cliente' },
  { name: '{{email}}', description: 'Email do cliente' },
  { name: '{{plano}}', description: 'Nome do plano' },
  { name: '{{servidor}}', description: 'Nome do servidor' },
  { name: '{{vencimento}}', description: 'Data de vencimento' },
  { name: '{{dias_restantes}}', description: 'Dias até o vencimento' },
  { name: '{{valor}}', description: 'Valor do plano' },
  { name: '{{empresa}}', description: 'Nome da empresa' },
  { name: '{{data_atual}}', description: 'Data atual' },
  { name: '{{link_renovacao}}', description: 'Link para renovação' },
  { name: '{{link_suporte}}', description: 'Link para suporte' }
]

export function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    htmlContent: '',
    category: 'marketing' as EmailTemplate['category'],
    variables: [] as TemplateVariable[]
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      // Aqui você carregaria os templates do MarketingService
      // const templatesData = await MarketingService.getEmailTemplates()
      // setTemplates(templatesData)
      
      // Dados simulados para demonstração
      setTemplates([
        {
          id: '1',
          name: 'Lembrete de Vencimento',
          description: 'Template para lembrar clientes sobre vencimento do plano',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Olá {{nome}}!</h2>
              <p>Seu plano <strong>{{plano}}</strong> vence em <strong>{{dias_restantes}} dias</strong>.</p>
              <p>Data de vencimento: {{vencimento}}</p>
              <p>Para renovar, clique no botão abaixo:</p>
              <a href="{{link_renovacao}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Renovar Agora</a>
              <p>Atenciosamente,<br>{{empresa}}</p>
            </div>
          `,
          category: 'notification',
          variables: [
            { name: 'nome', description: 'Nome do cliente', type: 'text', required: true },
            { name: 'plano', description: 'Nome do plano', type: 'text', required: true },
            { name: 'dias_restantes', description: 'Dias até vencimento', type: 'number', required: true },
            { name: 'vencimento', description: 'Data de vencimento', type: 'date', required: true },
            { name: 'link_renovacao', description: 'Link para renovação', type: 'text', required: true },
            { name: 'empresa', description: 'Nome da empresa', type: 'text', required: true }
          ],
          isDefault: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Boas-vindas',
          description: 'Template de boas-vindas para novos clientes',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Bem-vindo, {{nome}}!</h2>
              <p>Obrigado por escolher nossos serviços. Seu plano <strong>{{plano}}</strong> já está ativo!</p>
              <p>Servidor: {{servidor}}</p>
              <p>Se precisar de ajuda, entre em contato conosco:</p>
              <a href="{{link_suporte}}">Central de Suporte</a>
              <p>Atenciosamente,<br>{{empresa}}</p>
            </div>
          `,
          category: 'marketing',
          variables: [
            { name: 'nome', description: 'Nome do cliente', type: 'text', required: true },
            { name: 'plano', description: 'Nome do plano', type: 'text', required: true },
            { name: 'servidor', description: 'Nome do servidor', type: 'text', required: true },
            { name: 'link_suporte', description: 'Link para suporte', type: 'text', required: true },
            { name: 'empresa', description: 'Nome da empresa', type: 'text', required: true }
          ],
          isDefault: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingTemplate) {
        // await MarketingService.updateEmailTemplate(editingTemplate.id, formData)
        toast.success('Template atualizado com sucesso!')
      } else {
        // await MarketingService.createEmailTemplate(formData)
        toast.success('Template criado com sucesso!')
      }
      
      loadTemplates()
      handleCloseDialog()
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      toast.error('Erro ao salvar template')
    }
  }

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const duplicatedTemplate = {
        name: `${template.name} (Cópia)`,
        description: template.description,
        htmlContent: template.htmlContent,
        category: template.category,
        variables: template.variables
      }
      
      // await MarketingService.createEmailTemplate(duplicatedTemplate)
      toast.success('Template duplicado com sucesso!')
      loadTemplates()
    } catch (error) {
      console.error('Erro ao duplicar template:', error)
      toast.error('Erro ao duplicar template')
    }
  }

  const handleDelete = async () => {
    if (!deletingTemplate) return
    
    try {
      // await MarketingService.deleteEmailTemplate(deletingTemplate.id)
      toast.success('Template excluído com sucesso!')
      loadTemplates()
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      toast.error('Erro ao excluir template')
    } finally {
      setDeletingTemplate(null)
    }
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      htmlContent: template.htmlContent,
      category: template.category,
      variables: template.variables
    })
    setIsCreateDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false)
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      htmlContent: '',
      category: 'marketing',
      variables: []
    })
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('htmlContent') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = formData.htmlContent
      const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end)
      
      setFormData(prev => ({ ...prev, htmlContent: newText }))
      
      // Reposicionar cursor
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4)
      }, 0)
    }
  }

  const getTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find(t => t.value === type)?.label || type
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates de Email</h2>
          <p className="text-muted-foreground">
            Crie e gerencie templates para suas campanhas e notificações
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
              <DialogDescription>
                Crie um template de email com variáveis personalizadas
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="variables">Variáveis</TabsTrigger>
                <TabsTrigger value="preview">Visualização</TabsTrigger>
              </TabsList>
              
              <TabsContent value="editor" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Template</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Lembrete de Vencimento"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as EmailTemplate['category'] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Template para lembrete de vencimento"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="htmlContent">Conteúdo HTML</Label>
                  <Textarea
                    id="htmlContent"
                    placeholder="Digite o conteúdo do email em HTML..."
                    className="min-h-[300px] font-mono text-sm"
                    value={formData.htmlContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, htmlContent: e.target.value }))}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="variables" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Variáveis Disponíveis</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique em uma variável para inseri-la no template
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_VARIABLES.map((variable) => (
                      <Button
                        key={variable.name}
                        variant="outline"
                        size="sm"
                        className="justify-start h-auto p-3"
                        onClick={() => insertVariable(variable.name.replace(/[{}]/g, ''))}
                      >
                        <div className="text-left">
                          <div className="font-mono text-xs">{variable.name}</div>
                          <div className="text-xs text-muted-foreground">{variable.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="text-lg font-semibold mb-2">Visualização</h3>
                  <div className="space-y-2">
                    <div><strong>Descrição:</strong> {formData.description}</div>
                    <div className="border rounded p-4 bg-white">
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formData.htmlContent, 'template') }} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingTemplate ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Existentes */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template criado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie seu primeiro template de email para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant={template.isDefault ? 'secondary' : 'default'}>
                        {template.isDefault ? 'Padrão' : getTypeLabel(template.category)}
                      </Badge>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      {!template.isDefault && (
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeletingTemplate(template)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Variable className="mr-2 h-4 w-4" />
                      Variáveis
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((variable) => (
                        <Badge key={variable.name} variant="outline" className="text-xs">
                          {variable.name}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Palette className="mr-2 h-4 w-4" />
                      Tipo
                    </div>
                    <div className="text-sm">
                      {getTypeLabel(template.category)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4" />
                      Atualizado
                    </div>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Preview */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualização: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Preview do template de email
            </DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <div className="p-3 bg-muted rounded">{previewTemplate.description}</div>
              </div>
              
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <div className="border rounded p-4 bg-white max-h-96 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewTemplate.htmlContent, 'template') }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Código HTML</Label>
                <Textarea
                  value={previewTemplate.htmlContent}
                  readOnly
                  className="font-mono text-xs max-h-32"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{deletingTemplate?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}