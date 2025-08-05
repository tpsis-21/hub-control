// @/app/(app)/documentacao/api-chatbots/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Code, Globe, Key, MessageSquare, Users, Zap, AlertTriangle, CheckCircle, Activity, Server, Shield } from "lucide-react";
import Link from "next/link";

export default function ApiChatbotsDocumentationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">API para Chatbots</h1>
        <p className="text-muted-foreground">
          Documentação completa da API para integração com chatbots e automação de testes.
        </p>
      </div>

      {/* Visão Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Visão Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            O HubControl funciona como uma <strong>central de geração de testes</strong>, integrando-se com diferentes 
            tipos de servidores IPTV através de APIs ou chatbots. O sistema gerencia automaticamente a criação de testes, 
            geração de links de pagamento e ativação de planos conforme a configuração de cada servidor.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Integração API + Chatbot</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Central de Testes</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Pagamento Automático</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arquitetura do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Arquitetura do Sistema
          </CardTitle>
          <CardDescription>
            Como o HubControl se integra com diferentes tipos de servidores IPTV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Servidores com API */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Code className="w-4 h-4" />
                Servidores com API
              </h4>
              <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                <p className="text-sm">Comunicação direta via API REST</p>
                <ul className="text-xs space-y-1">
                  <li>• Criação automática de usuários</li>
                  <li>• Ativação instantânea de planos</li>
                  <li>• Renovação automática</li>
                  <li>• Controle de limites de requisições</li>
                </ul>
              </div>
            </div>

            {/* Servidores com Chatbot */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Servidores com Chatbot
              </h4>
              <div className="bg-green-50 p-3 rounded-lg space-y-2">
                <p className="text-sm">Comunicação via chatbot automatizado</p>
                <ul className="text-xs space-y-1">
                  <li>• Envio de comandos via chat</li>
                  <li>• Resposta com dados de acesso</li>
                  <li>• Processamento manual de ativações</li>
                  <li>• Notificações de pagamento</li>
                </ul>
              </div>
            </div>
          </div>

          <Alert>
            <Globe className="h-4 w-4" />
            <AlertTitle>Central Unificada</AlertTitle>
            <AlertDescription>
              O HubControl atua como intermediário, padronizando a comunicação independente 
              do tipo de servidor (API ou Chatbot), oferecendo uma interface única para todos os serviços.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Configuração
          </CardTitle>
          <CardDescription>
            Como configurar e obter suas credenciais de acesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              Você precisa configurar sua API Key nas <Link href="/configuracoes" className="text-blue-600 hover:underline">Configurações do Sistema</Link> antes de usar a API.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <h4 className="font-semibold">Passos para configuração:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Acesse a página de <Link href="/configuracoes" className="text-blue-600 hover:underline">Configurações</Link></li>
              <li>Na seção "API para Chatbots", clique em "Gerar Nova Chave"</li>
              <li>Copie a URL do Endpoint e a API Key gerada</li>
              <li>Configure seu chatbot para fazer requisições para o endpoint</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Endpoint da API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-mono text-sm">POST /api/v1/bot</p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Headers obrigatórios:</h4>
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <p className="font-mono text-sm">Content-Type: application/json</p>
              <p className="font-mono text-sm">Authorization: Bearer {'{'}SUA_API_KEY{'}'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Disponíveis</CardTitle>
          <CardDescription>
            Lista de todas as ações que podem ser executadas via API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Ping */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">ping</Badge>
              <span className="text-sm font-medium">Verificar conectividade</span>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Requisição:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "action": "ping"
}`}</pre>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Resposta:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "success": true,
  "message": "API funcionando corretamente",
  "timestamp": "2024-01-15T10:30:00Z"
}`}</pre>
            </div>
          </div>

          <Separator />

          {/* List Servers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">list_servers</Badge>
              <span className="text-sm font-medium">Listar servidores disponíveis</span>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Requisição:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "action": "list_servers"
}`}</pre>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Resposta:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "success": true,
  "servers": [
    {
      "id": "10",
      "name": "Servidor Premium IPTV",
      "type": "api",
      "status": "active",
      "dailyLimit": 100,
      "usedToday": 25,
      "hasAutoRenewal": true
    },
    {
      "id": "11",
      "name": "Servidor Basic TV",
      "type": "chatbot",
      "status": "active",
      "dailyLimit": 50,
      "usedToday": 10,
      "hasAutoRenewal": false
    }
  ]
}`}</pre>
            </div>
          </div>

          <Separator />

          {/* Get Customer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">get_customer</Badge>
              <span className="text-sm font-medium">Buscar dados do cliente</span>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Identificação por ID Único</AlertTitle>
              <AlertDescription>
                A busca de clientes deve ser feita sempre pelo <strong>ID único do cliente</strong> cadastrado no gestor, 
                nunca pelo usuário IPTV. Cada cliente possui um ID único que jamais é reutilizado.
              </AlertDescription>
            </Alert>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Requisição:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "action": "get_customer",
  "customerId": "cust_123456789"
}`}</pre>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Resposta:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "success": true,
  "customer": {
    "id": "cust_123456789",
    "name": "João Silva",
    "whatsapp": "5511999999999",
    "email": "joao@email.com",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "isTestCustomer": false
  }
}`}</pre>
            </div>
          </div>

          <Separator />

          {/* Create Test */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">create_test</Badge>
              <span className="text-sm font-medium">Criar teste automático</span>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>IDs Únicos e Identificação</AlertTitle>
              <AlertDescription>
                Todos os clientes (incluindo testes) recebem um <strong>ID único</strong> que jamais é reutilizado. 
                Use sempre o <code>customerId</code> para identificar clientes, nunca dados como WhatsApp ou usuário IPTV.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Parâmetros obrigatórios:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2 border rounded">
                  <code className="font-semibold">name</code> - Nome do cliente
                </div>
                <div className="p-2 border rounded">
                  <code className="font-semibold">whatsapp</code> - Número com código do país
                </div>
                <div className="p-2 border rounded">
                  <code className="font-semibold">planId</code> - ID numérico do plano (2 dígitos, ex: 10, 25, 99)
                </div>
                <div className="p-2 border rounded">
                  <code className="font-semibold">serverId</code> - ID numérico de 2 dígitos do servidor (use list_servers)
                </div>
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Requisição:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "action": "create_test",
  "name": "João Silva",
  "whatsapp": "5511999999999",
  "planId": "25",  // ID numérico do plano (2 dígitos)
  "serverId": "10"  // Use list_servers para ver IDs disponíveis
}`}</pre>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Sobre o planId</AlertTitle>
              <AlertDescription>
                O <code>planId</code> deve ser o <strong>ID numérico do plano</strong> (2 dígitos, ex: 10, 25, 99). 
                Este ID refere-se ao plano que será usado como base para criar o teste, definindo as características 
                como duração, recursos, etc. Você pode consultar os IDs disponíveis na página de Planos do sistema.
              </AlertDescription>
            </Alert>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Resposta (sucesso):</p>
              <pre className="text-xs overflow-x-auto">{`{
  "success": true,
  "customer": {
    "id": "cust_789",  // ID único do cliente (nunca reutilizado)
    "name": "João Silva",
    "iptvUsername": "teste_joao123",
    "iptvPassword": "senha_gerada",
    "status": "Em teste",
    "expirationDate": "2024-01-15T18:30:00Z",
    "uniqueLink": "https://app.com/cliente/abc123",
    "paymentLink": "https://app.com/pagamento/xyz789",
    "testPlan": {
      "basePlanId": "plan_123",
      "duration": "4 horas",
      "canActivate": true
    },
    "server": {
      "id": "10",
      "name": "Servidor Premium IPTV",
      "type": "api",
      "hasAutoRenewal": true,
      "dailyLimit": 100,
      "usedToday": 15
    }
  }
}`}</pre>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Fluxo Completo do Sistema</AlertTitle>
              <AlertDescription>
                1. <strong>Criação do Teste:</strong> Baseado no plano selecionado e servidor configurado<br/>
                2. <strong>Geração do Link:</strong> Link exclusivo de pagamento criado automaticamente<br/>
                3. <strong>Período de Teste:</strong> Cliente testa o serviço por tempo limitado<br/>
                4. <strong>Pagamento:</strong> Cliente acessa link e efetua pagamento<br/>
                5. <strong>Ativação Automática:</strong> Se servidor tem API de pagamento, ativa automaticamente<br/>
                6. <strong>Ativação Manual:</strong> Se servidor sem automação, notifica para ativação manual
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Códigos de Erro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Códigos de Erro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Badge variant="destructive">400</Badge>
              <p className="text-sm"><strong>Bad Request:</strong> Dados inválidos ou ausentes</p>
            </div>
            <div className="space-y-2">
              <Badge variant="destructive">401</Badge>
              <p className="text-sm"><strong>Unauthorized:</strong> API Key inválida ou ausente</p>
            </div>
            <div className="space-y-2">
              <Badge variant="destructive">404</Badge>
              <p className="text-sm"><strong>Not Found:</strong> Cliente/Servidor não encontrado</p>
            </div>
            <div className="space-y-2">
              <Badge variant="destructive">429</Badge>
              <p className="text-sm"><strong>Rate Limit:</strong> Limite diário de requisições atingido</p>
            </div>
            <div className="space-y-2">
              <Badge variant="destructive">500</Badge>
              <p className="text-sm"><strong>Internal Error:</strong> Erro interno do servidor</p>
            </div>
            <div className="space-y-2">
              <Badge variant="destructive">503</Badge>
              <p className="text-sm"><strong>Service Unavailable:</strong> Servidor IPTV indisponível</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-semibold">Respostas de Erro Específicas</h4>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Limite de requisições atingido:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Limite diário de 100 requisições atingido",
  "resetTime": "2024-01-16T00:00:00Z",
  "remainingRequests": 0
}`}</pre>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">Servidor indisponível:</p>
              <pre className="text-xs overflow-x-auto">{`{
  "success": false,
  "error": "Server unavailable",
  "message": "Servidor IPTV temporariamente indisponível",
  "serverId": "12",
  "retryAfter": 300
}`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exemplos de Integração */}
      <Card>
        <CardHeader>
          <CardTitle>Exemplos de Integração</CardTitle>
          <CardDescription>
            Exemplos práticos de como integrar com diferentes plataformas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* BotConversa */}
          <div className="space-y-3">
            <h4 className="font-semibold">BotConversa (WhatsApp)</h4>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto">{`// Exemplo de webhook no BotConversa
const response = await fetch('https://seudominio.com/api/v1/bot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SUA_API_KEY_AQUI'
  },
  body: JSON.stringify({
    action: 'create_test',
    name: 'Cliente do WhatsApp',
    whatsapp: '5511999999999',
    planId: 'plan_premium',
    serverId: '10'
  })
});

const result = await response.json();
if (result.success) {
  // Enviar dados do teste para o cliente
  console.log('Teste criado:', result.customer);
}`}</pre>
            </div>
          </div>

          <Separator />

          {/* Zapier */}
          <div className="space-y-3">
            <h4 className="font-semibold">Zapier / Make.com</h4>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm mb-2">Configure um webhook com os seguintes parâmetros:</p>
              <ul className="text-xs space-y-1">
                <li><strong>URL:</strong> https://seudominio.com/api/v1/bot</li>
                <li><strong>Método:</strong> POST</li>
                <li><strong>Headers:</strong> Authorization: Bearer {'{'}SUA_API_KEY{'}'}</li>
                <li><strong>Content-Type:</strong> application/json</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Servidores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Configuração de Servidores
          </CardTitle>
          <CardDescription>
            Parâmetros importantes para configurar servidores no HubControl
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Configurações Básicas */}
            <div className="space-y-3">
              <h4 className="font-semibold">Configurações Básicas</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span><code>type</code></span>
                  <span>"api" ou "chatbot"</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span><code>dailyLimit</code></span>
                  <span>Limite de requisições/dia</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span><code>hasAutoRenewal</code></span>
                  <span>Renovação automática</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span><code>apiEndpoint</code></span>
                  <span>URL da API (se aplicável)</span>
                </div>
              </div>
            </div>

            {/* Configurações de Automação */}
            <div className="space-y-3">
              <h4 className="font-semibold">Automação de Pagamentos</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span><code>paymentApi</code></span>
                  <span>API de pagamento</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span><code>webhookUrl</code></span>
                  <span>URL para notificações</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span><code>autoActivation</code></span>
                  <span>Ativação automática</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span><code>welcomeMessage</code></span>
                  <span>Mensagem de boas-vindas</span>
                </div>
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Limites de Requisições</AlertTitle>
            <AlertDescription>
              Configure o limite diário de requisições para evitar sobrecarga nos servidores. 
              O sistema monitora automaticamente o uso e bloqueia requisições quando o limite é atingido.
            </AlertDescription>
          </Alert>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Tipos de Ativação</AlertTitle>
            <AlertDescription>
              <strong>Automática:</strong> Servidores com API de pagamento ativam planos instantaneamente após confirmação.<br/>
              <strong>Manual:</strong> Servidores sem automação requerem ativação manual e aparecem na lista de pagamentos pendentes.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Boas Práticas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Boas Práticas de Uso
            </CardTitle>
            <CardDescription>
              Recomendações para uso eficiente e seguro da API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold">1. Sempre Liste os Servidores Primeiro</h4>
              <p className="text-sm text-muted-foreground">
                Antes de criar testes, use <code>list_servers</code> para obter os IDs atualizados e verificar 
                disponibilidade, limites e status de cada servidor.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-mono">Fluxo recomendado: list_servers → create_test</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-semibold">2. Use Sempre IDs Únicos</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>customerId:</strong> Para identificar clientes (nunca reutilizado)</li>
                <li>• <strong>serverId:</strong> Para especificar servidor (obtido via list_servers)</li>
                <li>• <strong>testId:</strong> Para rastrear testes específicos</li>
                <li>• <strong>Evite:</strong> WhatsApp, usuário IPTV ou outros dados mutáveis</li>
              </ul>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-semibold">3. Monitore Limites de Requisições</h4>
              <p className="text-sm text-muted-foreground">
                Verifique <code>dailyLimit</code> e <code>usedToday</code> na resposta de list_servers 
                para evitar erro 429 (Rate Limit).
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-semibold">4. Trate Diferentes Tipos de Servidor</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-semibold text-sm">Servidores API</p>
                  <p className="text-xs">Ativação automática, resposta imediata</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="font-semibold text-sm">Servidores Chatbot</p>
                  <p className="text-xs">Processamento manual, aguardar ativação</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitoramento e Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Monitoramento e Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Logs de Operação</h4>
              <p className="text-sm text-muted-foreground">
                Todas as operações são registradas com timestamp, servidor utilizado e status da operação.
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-semibold">Métricas de Servidor</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Requisições utilizadas vs. limite diário</li>
                <li>• Taxa de sucesso por servidor</li>
                <li>• Tempo de resposta médio</li>
                <li>• Status de disponibilidade</li>
              </ul>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-semibold">Alertas Automáticos</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Servidor próximo ao limite diário</li>
                <li>• Falhas consecutivas de comunicação</li>
                <li>• Pagamentos pendentes de ativação manual</li>
              </ul>
            </div>
          </CardContent>
        </Card>

      {/* Exemplos Práticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Exemplos Práticos de Uso
          </CardTitle>
          <CardDescription>
            Cenários comuns de integração com a API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-semibold">Cenário 1: Criar Teste Completo</h4>
            <p className="text-sm text-muted-foreground">
              Fluxo completo desde a listagem de servidores até a criação do teste.
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">1. Listar servidores disponíveis:</p>
              <pre className="text-xs overflow-x-auto">{`POST /api/v1/bot
{
  "action": "list_servers"
}`}</pre>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-mono text-sm mb-2">2. Escolher servidor e criar teste:</p>
              <pre className="text-xs overflow-x-auto">{`POST /api/v1/bot
{
  "action": "create_test",
  "name": "Maria Santos",
  "whatsapp": "5511987654321",
  "planId": "plan_premium_24h",
  "serverId": "10" // Obtido do list_servers
}`}</pre>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-semibold">Cenário 2: Buscar Cliente Existente</h4>
            <p className="text-sm text-muted-foreground">
              Como buscar um cliente usando seu ID único.
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto">{`POST /api/v1/bot
{
  "action": "get_customer",
  "customerId": "cust_123456789" // ID único do cliente
}`}</pre>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-semibold">Cenário 3: Verificar Status da API</h4>
            <p className="text-sm text-muted-foreground">
              Teste simples para verificar conectividade.
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto">{`POST /api/v1/bot
{
  "action": "ping"
}`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Autenticação</h4>
            <p className="text-sm text-muted-foreground">
              Todas as requisições devem incluir a API Key no header <code>Authorization</code>.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-semibold">Rate Limiting</h4>
            <p className="text-sm text-muted-foreground">
              Limite de 1000 requisições por hora por API Key.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h4 className="font-semibold">Dados Sensíveis</h4>
            <p className="text-sm text-muted-foreground">
              Senhas e dados de acesso são criptografados e nunca expostos em logs.
            </p>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              Mantenha sua API Key segura e nunca a compartilhe publicamente. 
              Gere uma nova chave se suspeitar de comprometimento.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Boas práticas:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Use HTTPS sempre</li>
              <li>Armazene a API Key em variáveis de ambiente</li>
              <li>Monitore o uso da API regularmente</li>
              <li>Gere novas chaves periodicamente</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}