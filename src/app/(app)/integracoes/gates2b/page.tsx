import React from 'react'
import { Metadata } from 'next'
import { Gates2bConfig } from '@/components/integrations/gates2b-config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  Zap, 
  Shield, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Smartphone,
  QrCode,
  Webhook
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integração Gates2b - Hub Control',
  description: 'Configure a integração com Gates2b para processar pagamentos PIX automaticamente',
}

export default function Gates2bIntegrationPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <p className="text-muted-foreground">
        Configure e gerencie pagamentos PIX via Gates2b (API em api.gates2b.com)
      </p>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos PIX</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Instantâneo</div>
            <p className="text-xs text-muted-foreground">
              Processamento em tempo real
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segurança</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Máxima</div>
            <p className="text-xs text-muted-foreground">
              Criptografia de ponta a ponta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibilidade</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24/7</div>
            <p className="text-xs text-muted-foreground">
              Funcionamento contínuo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integração</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Simples</div>
            <p className="text-xs text-muted-foreground">
              Configuração rápida
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <QrCode className="h-5 w-5" />
              <span>Recursos Principais</span>
            </CardTitle>
            <CardDescription>
              Funcionalidades disponíveis na integração Gates2b
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-green-100 rounded-full">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Geração de QR Code PIX</p>
                  <p className="text-xs text-muted-foreground">
                    Criação automática de códigos PIX para pagamento
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1 bg-green-100 rounded-full">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Processamento Instantâneo</p>
                  <p className="text-xs text-muted-foreground">
                    Confirmação de pagamentos em tempo real
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1 bg-green-100 rounded-full">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Gestão de Faturas</p>
                  <p className="text-xs text-muted-foreground">
                    Criação e acompanhamento de faturas
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-1 bg-green-100 rounded-full">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Webhooks Automáticos</p>
                  <p className="text-xs text-muted-foreground">
                    Notificações automáticas de status
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Como Funciona</span>
            </CardTitle>
            <CardDescription>
              Fluxo de pagamento PIX integrado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                  1
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Cliente solicita pagamento</p>
                  <p className="text-xs text-muted-foreground">
                    Sistema gera QR Code PIX automaticamente
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-3" />
              </div>

              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                  2
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Cliente efetua pagamento</p>
                  <p className="text-xs text-muted-foreground">
                    Escaneamento do QR Code no app do banco
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-3" />
              </div>

              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                  3
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Confirmação automática</p>
                  <p className="text-xs text-muted-foreground">
                    Sistema recebe webhook e atualiza status
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-3" />
              </div>

              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                  4
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">Serviço liberado</p>
                  <p className="text-xs text-muted-foreground">
                    Ativação automática do serviço contratado
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Component */}
      <Gates2bConfig />

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Webhook className="h-5 w-5" />
            <span>Informações Importantes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Requisitos</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Conta ativa em painel.gates2b.com (ver docs/PAINEL_GATES2B_O_QUE_MUDAR.md)</li>
                <li>• Cartão: habilitar checkout no painel + webhook configurado</li>
                <li>• Token de API válido</li>
                <li>• Configuração de webhook</li>
                <li>• Certificado SSL válido</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Suporte</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Documentação completa da API</li>
                <li>• Teste de conectividade integrado</li>
                <li>• Logs detalhados de transações</li>
                <li>• Monitoramento em tempo real</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
