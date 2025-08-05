# Documentação do Projeto: IPTV Manager Pro

Este documento descreve a arquitetura, funcionalidades e estrutura de dados da aplicação IPTV Manager Pro.

**Visão Geral**

O IPTV Manager Pro é uma aplicação web construída com Next.js e React para gerenciar clientes, planos, servidores e automações de um serviço de IPTV. A ferramenta visa otimizar a gestão, automatizar tarefas repetitivas e fornecer uma base sólida para o crescimento do negócio.

**Funcionalidades Principais**

1.  **Dashboard:**
    *   Visão geral das métricas mais importantes do negócio.
    *   **Cards de Métricas:** Receita diária e mensal, total de clientes, testes ativos, novos clientes no mês, e status de expiração (vencidos, vencendo hoje, amanhã, etc.).
    *   **Listas Rápidas:** Exibe os clientes vencendo no dia e os clientes adicionados recentemente.

2.  **Gerenciamento de Clientes (`/clientes`)**
    *   Lista todos os clientes (exceto testes) com seus status (`Ativo`, `Inativo`, `Bloqueado`).
    *   Permite adicionar, editar e visualizar detalhes de cada cliente.
    *   O status pode ser alterado diretamente da lista através de um menu de ações.
    *   A página de detalhes do cliente exibe todas as informações, incluindo IDs, dados de contato, histórico de pagamentos e o **link exclusivo da área do cliente** (copiável).

3.  **Gerenciamento de Testes (`/testes`)**
    *   Lista todos os usuários em período de teste, com status (`Em teste`, `Expirado`).
    *   Permite criar novos testes manualmente ou através de automação vinculada a um servidor.
    *   Um teste pode ser convertido em cliente com um único clique.

4.  **Gerenciamento de Planos e Grupos**
    *   **Planos Individuais (`/planos`):** Cadastro de cada plano com nome, preço, validade, telas, ID do painel, e visibilidade pública.
    *   **Grupos de Planos (`/planos/grupos`):** Permite organizar os planos individuais em "famílias" (ex: "Base R$30", "Base R$35"). Essa estrutura é a base para a futura área do cliente, que exibirá apenas os planos do grupo ao qual o cliente pertence.

5.  **Gerenciamento de Servidores (`/servidores`)**
    *   Cadastro de servidores de IPTV com URL, chave de API e status.
    *   **Configuração de Automação:** Para cada servidor, é possível ativar:
        *   **Automação de Testes:** Permite gerar testes via `API` ou `Chatbot`.
        *   **Gateway de Pagamento:** Prepara o servidor para futuras cobranças automáticas.

6.  **Notificações Automáticas (`/notificacoes`)**
    *   Sistema de templates para comunicação via WhatsApp e E-mail.
    *   **Lembretes de Vencimento:** Configure múltiplos lembretes antes da expiração.
    *   **Sequência de Instruções:** Envie dicas de uso para novos clientes.
    *   **Notificações de Eventos:** Personalize mensagens para eventos como criação de teste, boas-vindas e confirmação de pagamento.
    *   **Tags Dinâmicas:** Use tags como `{{NOME}}`, `{{USUARIO_IPTV}}`, `{{VENCIMENTO}}` e `{{LINK_CLIENTE}}` para personalizar as mensagens.

7.  **API de Integração (`/api/v1/bot`)**
    *   Um endpoint `POST` seguro que permite a comunicação com serviços externos, como o BotConversa.
    *   A autenticação é feita via Bearer Token (API Key), que pode ser configurada na página de Configurações.
    *   Atualmente, a API está estruturada para receber ações como `ping`, `get_customer`, `create_test`, etc.

### Possíveis Melhorias e Próximos Passos

A aplicação tem uma base sólida. Para evoluir para um sistema de produção, sugiro os seguintes focos:

1.  **Persistência de Dados (Prioridade Máxima)**:
    *   **Problema:** Atualmente, todos os dados (`clientes`, `planos`, etc.) estão em memória (`src/lib/data.ts`) e são resetados a cada reinicialização do servidor.
    *   **Solução:** Migrar a lógica de dados para um banco de dados real. **Firebase Firestore** é uma excelente opção dentro do ecossistema, pois oferece persistência, escalabilidade e atualizações em tempo real com baixo esforço de implementação.

2.  **Lógica de Negócios no Servidor**:
    *   **Problema:** Muitas lógicas de negócio (filtragem, cálculos de dashboard) estão nos componentes do cliente.
    *   **Solução:** Mover essas lógicas para as `Server Actions` ou para a camada de acesso a dados. Isso melhora a performance, a segurança e a manutenibilidade. Por exemplo, em vez de buscar todos os clientes e filtrar no front-end, crie uma função `getExpiringCustomers()` que busque apenas os dados necessários.

3.  **Segurança e Autenticação Reais**:
    *   **Problema:** Não há um sistema de login real para o administrador. A API Key é fixa.
    *   **Solução:** Implementar um sistema de autenticação, como o **Firebase Authentication**, para proteger o acesso ao painel. A API Key deve ser gerada dinamicamente e armazenada de forma segura (por exemplo, em variáveis de ambiente ou no banco de dados).

4.  **Desenvolvimento da Área do Cliente**:
    *   Com os links exclusivos gerados, o próximo grande passo é criar a página da Área do Cliente. Nela, o cliente poderá:
        *   Ver seus dados e data de vencimento.
        *   Selecionar um plano do seu grupo para renovar.
        *   Realizar o pagamento via gateway (BPIX).

5.  **Execução das Automações**:
    *   **Problema:** As chamadas de API e para chatbots estão simuladas (`console.log`).
    *   **Solução:** Implementar as chamadas `fetch` reais para as APIs dos painéis de IPTV e gateways de pagamento nas `Server Actions` correspondentes.
