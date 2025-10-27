'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  Download,
  Eye,
  Copy,
  QrCode,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useBPIX } from '@/hooks/use-bpix'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface CreatePaymentForm {
  amount: string
  description: string
  clientMode: string
  email: string
  phoneNumber: string
  documentType: string
  expireAt: string
  externalReference: string
}

interface CreateInvoiceForm {
  amount: string
  description: string
  customerEmail: string
  customerPhone: string
  customerName: string
  customerDocument: string
  dueDate: string
}

export function BPIXDashboard() {
  const { 
    payments, 
    invoices, 
    loading, 
    error, 
    createPayment, 
    createInvoice, 
    listPayments, 
    listInvoices 
  } = useBPIX()

  const [activeTab, setActiveTab] = useState('payments')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false)
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false)

  const [paymentForm, setPaymentForm] = useState<CreatePaymentForm>({
    amount: '',
    description: '',
    clientMode: 'fillDataNow',
    email: '',
    phoneNumber: '',
    documentType: 'cpf',
    expireAt: '',
    externalReference: ''
  })

  const [invoiceForm, setInvoiceForm] = useState<CreateInvoiceForm>({
    amount: '',
    description: '',
    customerEmail: '',
    customerPhone: '',
    customerName: '',
    customerDocument: '',
    dueDate: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      await Promise.all([
        listPayments(),
        listInvoices()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const handleCreatePayment = async () => {
    try {
      const paymentData = {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
        expire_at: paymentForm.expireAt ? new Date(paymentForm.expireAt).toISOString() : undefined,
        external_reference: paymentForm.externalReference || undefined
      }

      await createPayment(paymentData)
      setIsCreatePaymentOpen(false)
      setPaymentForm({
        amount: '',
        description: '',
        clientMode: 'fillDataNow',
        email: '',
        phoneNumber: '',
        documentType: 'cpf',
        expireAt: '',
        externalReference: ''
      })
      toast.success('Pagamento criado com sucesso!')
      await listPayments()
    } catch (error) {
      toast.error('Erro ao criar pagamento')
    }
  }

  const handleCreateInvoice = async () => {
    try {
      const invoiceData = {
        ...invoiceForm,
        amount: parseFloat(invoiceForm.amount),
        due_date: new Date(invoiceForm.dueDate).toISOString(),
        customer_email: invoiceForm.customerEmail,
        customer_phone: invoiceForm.customerPhone,
        customer_name: invoiceForm.customerName,
        customer_document: invoiceForm.customerDocument
      }

      await createInvoice(invoiceData)
      setIsCreateInvoiceOpen(false)
      setInvoiceForm({
        amount: '',
        description: '',
        customerEmail: '',
        customerPhone: '',
        customerName: '',
        customerDocument: '',
        dueDate: ''
      })
      toast.success('Fatura criada com sucesso!')
      await listInvoices()
    } catch (error) {
      toast.error('Erro ao criar fatura')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      paid: { label: 'Pago', variant: 'default' as const, icon: CheckCircle },
      expired: { label: 'Expirado', variant: 'destructive' as const, icon: XCircle },
      cancelled: { label: 'Cancelado', variant: 'outline' as const, icon: XCircle },
      processing: { label: 'Processando', variant: 'secondary' as const, icon: RefreshCw }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a área de transferência!')
  }

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = invoice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard BPIX</h2>
          <p className="text-muted-foreground">
            Gerencie pagamentos e faturas PIX
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição ou referência..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <AlertCircle className="h-4 w-4 mr-2" />
              Faturas
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            {activeTab === 'payments' && (
              <Dialog open={isCreatePaymentOpen} onOpenChange={setIsCreatePaymentOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Pagamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Pagamento</DialogTitle>
                    <DialogDescription>
                      Preencha os dados para gerar um novo pagamento PIX
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Valor (R$)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        placeholder="Descrição do pagamento"
                        value={paymentForm.description}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="cliente@email.com"
                        value={paymentForm.email}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="(11) 99999-9999"
                        value={paymentForm.phoneNumber}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expireAt">Data de Expiração</Label>
                      <Input
                        id="expireAt"
                        type="datetime-local"
                        value={paymentForm.expireAt}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, expireAt: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreatePayment} disabled={loading} className="flex-1">
                        {loading ? 'Criando...' : 'Criar Pagamento'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsCreatePaymentOpen(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            {activeTab === 'invoices' && (
              <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Fatura
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Nova Fatura</DialogTitle>
                    <DialogDescription>
                      Preencha os dados para gerar uma nova fatura
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invoiceAmount">Valor (R$)</Label>
                      <Input
                        id="invoiceAmount"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={invoiceForm.amount}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoiceDescription">Descrição</Label>
                      <Textarea
                        id="invoiceDescription"
                        placeholder="Descrição da fatura"
                        value={invoiceForm.description}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerName">Nome do Cliente</Label>
                      <Input
                        id="customerName"
                        placeholder="Nome completo"
                        value={invoiceForm.customerName}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email do Cliente</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="cliente@email.com"
                        value={invoiceForm.customerEmail}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Data de Vencimento</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={invoiceForm.dueDate}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateInvoice} disabled={loading} className="flex-1">
                        {loading ? 'Criando...' : 'Criar Fatura'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsCreateInvoiceOpen(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos PIX</CardTitle>
              <CardDescription>
                Lista de todos os pagamentos criados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Carregando pagamentos...</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhum pagamento encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Tente ajustar os filtros de busca'
                      : 'Crie seu primeiro pagamento PIX'
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {payment.id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status || 'pending')}
                        </TableCell>
                        <TableCell>
                          {payment.created_at ? new Date(payment.created_at).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment)
                                setIsPaymentDetailOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {payment.qr_code && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(payment.qr_code!)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturas</CardTitle>
              <CardDescription>
                Lista de todas as faturas criadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Carregando faturas...</p>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma fatura encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Tente ajustar os filtros de busca'
                      : 'Crie sua primeira fatura'
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        <TableCell>{invoice.description}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.amount || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status || 'pending')}
                        </TableCell>
                        <TableCell>
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Detail Dialog */}
      <Dialog open={isPaymentDetailOpen} onOpenChange={setIsPaymentDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>
              Informações completas do pagamento PIX
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID do Pagamento</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {selectedPayment.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedPayment.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedPayment.status || 'pending')}
                  </div>
                </div>
                <div>
                  <Label>Valor</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(selectedPayment.amount || 0)}
                  </p>
                </div>
                <div>
                  <Label>Data de Criação</Label>
                  <p>
                    {selectedPayment.createdAt 
                      ? new Date(selectedPayment.createdAt).toLocaleString('pt-BR')
                      : '-'
                    }
                  </p>
                </div>
              </div>
              
              <div>
                <Label>Descrição</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedPayment.description || 'Sem descrição'}
                </p>
              </div>

              {selectedPayment.qr_text && (
                <div>
                  <Label>Código PIX</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                      {selectedPayment.qr_text}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedPayment.qr_text)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedPayment.qr_image && (
                <div>
                  <Label>QR Code</Label>
                  <div className="flex justify-center p-4 bg-white rounded border">
                    <img 
                      src={selectedPayment.qr_image} 
                      alt="QR Code PIX" 
                      className="max-w-48 max-h-48"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
