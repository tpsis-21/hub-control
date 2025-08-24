#!/usr/bin/env node

/**
 * Script de Inicialização do Sistema de Notificações
 * 
 * Este script configura automaticamente o sistema de notificações,
 * criando canais padrão, templates básicos e configurações iniciais.
 * 
 * Uso:
 *   node scripts/init-notifications.js
 *   npm run init:notifications
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Configuração do readline para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para fazer perguntas ao usuário
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Função para validar email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para validar URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Templates padrão do sistema
const defaultTemplates = [
  {
    name: 'welcome_user',
    type: 'user',
    subject_template: 'Bem-vindo ao {{app_name}}, {{user_name}}!',
    content_template: `Olá {{user_name}},\n\nBem-vindo ao {{app_name}}!\n\nSua conta foi criada com sucesso em {{created_date}}.\n\nAtenciosamente,\nEquipe {{app_name}}`,
    variables: ['user_name', 'app_name', 'created_date'],
    enabled: true
  },
  {
    name: 'security_alert',
    type: 'security',
    subject_template: 'Alerta de Segurança - {{alert_type}}',
    content_template: `ALERTA DE SEGURANÇA\n\nTipo: {{alert_type}}\nData/Hora: {{timestamp}}\nIP: {{ip_address}}\nDescrição: {{description}}\n\nSe você não reconhece esta atividade, entre em contato conosco imediatamente.`,
    variables: ['alert_type', 'timestamp', 'ip_address', 'description'],
    enabled: true
  },
  {
    name: 'backup_success',
    type: 'backup',
    subject_template: 'Backup realizado com sucesso - {{backup_name}}',
    content_template: `Backup realizado com sucesso!\n\nNome: {{backup_name}}\nTamanho: {{backup_size}}\nDuração: {{backup_duration}}\nData: {{backup_date}}\n\nTodos os dados foram salvos com segurança.`,
    variables: ['backup_name', 'backup_size', 'backup_duration', 'backup_date'],
    enabled: true
  },
  {
    name: 'system_maintenance',
    type: 'system',
    subject_template: 'Manutenção do Sistema - {{maintenance_type}}',
    content_template: `Manutenção programada do sistema\n\nTipo: {{maintenance_type}}\nInício: {{start_time}}\nDuração estimada: {{duration}}\nImpacto: {{impact}}\n\nDetalhes: {{details}}`,
    variables: ['maintenance_type', 'start_time', 'duration', 'impact', 'details'],
    enabled: true
  },
  {
    name: 'performance_alert',
    type: 'performance',
    subject_template: 'Alerta de Performance - {{metric_name}}',
    content_template: `Alerta de Performance\n\nMétrica: {{metric_name}}\nValor atual: {{current_value}}\nLimite: {{threshold}}\nSeveridade: {{severity}}\n\nAção recomendada: {{recommended_action}}`,
    variables: ['metric_name', 'current_value', 'threshold', 'severity', 'recommended_action'],
    enabled: true
  }
];

// Configurações padrão de canais
const defaultChannelConfigs = {
  email: {
    rate_limit: {
      max_requests: 100,
      window_seconds: 3600
    },
    retry_policy: {
      max_retries: 3,
      backoff_multiplier: 2,
      max_delay_seconds: 300
    }
  },
  webhook: {
    rate_limit: {
      max_requests: 500,
      window_seconds: 3600
    },
    retry_policy: {
      max_retries: 5,
      backoff_multiplier: 2,
      max_delay_seconds: 600
    }
  },
  in_app: {
    rate_limit: {
      max_requests: 1000,
      window_seconds: 3600
    },
    retry_policy: {
      max_retries: 2,
      backoff_multiplier: 1.5,
      max_delay_seconds: 60
    }
  }
};

async function main() {
  console.log('🚀 Inicializando Sistema de Notificações do Hub Control\n');

  try {
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas.');
      console.log('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no seu .env.local');
      process.exit(1);
    }

    // Conectar ao Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Conectado ao Supabase');

    // Verificar se as tabelas existem
    const { data: tables, error: tablesError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);

    if (tablesError && tablesError.code === '42P01') {
      console.error('❌ Erro: Tabelas do sistema de notificações não encontradas.');
      console.log('Execute as migrações primeiro: npx supabase db push');
      process.exit(1);
    }

    console.log('✅ Tabelas do sistema de notificações encontradas\n');

    // Configuração interativa
    console.log('📋 Configuração Inicial\n');

    const setupEmail = await question('Deseja configurar email (SMTP)? (s/n): ');
    let emailConfig = null;

    if (setupEmail.toLowerCase() === 's') {
      console.log('\n📧 Configuração de Email:');
      const smtpHost = await question('Host SMTP (ex: smtp.gmail.com): ');
      const smtpPort = await question('Porta SMTP (ex: 587): ');
      const smtpUser = await question('Usuário SMTP: ');
      const smtpPass = await question('Senha SMTP: ');
      const fromEmail = await question('Email remetente: ');
      const fromName = await question('Nome remetente: ');

      if (!isValidEmail(smtpUser) || !isValidEmail(fromEmail)) {
        console.log('❌ Email inválido fornecido.');
      } else {
        emailConfig = {
          channel: 'email',
          config: {
            smtp_host: smtpHost,
            smtp_port: parseInt(smtpPort) || 587,
            smtp_user: smtpUser,
            smtp_pass: smtpPass,
            from_email: fromEmail,
            from_name: fromName
          },
          enabled: true,
          ...defaultChannelConfigs.email
        };
      }
    }



    const setupWebhook = await question('\nDeseja configurar um webhook de teste? (s/n): ');
    let webhookConfig = null;

    if (setupWebhook.toLowerCase() === 's') {
      console.log('\n🔗 Configuração de Webhook:');
      const webhookUrl = await question('URL do webhook: ');
      const webhookName = await question('Nome do webhook: ');

      if (isValidUrl(webhookUrl)) {
        webhookConfig = {
          name: webhookName || 'Test Webhook',
          url: webhookUrl,
          events: ['notification.sent', 'notification.delivered', 'notification.failed'],
          enabled: true,
          retry_policy: {
            max_retries: 3,
            backoff_multiplier: 2
          }
        };
      } else {
        console.log('❌ URL do webhook inválida.');
      }
    }

    // Criar configurações de canais
    console.log('\n🔧 Criando configurações de canais...');

    if (emailConfig) {
      const { error } = await supabase
        .from('notification_channels')
        .upsert(emailConfig, { onConflict: 'channel' });

      if (error) {
        console.log('❌ Erro ao criar configuração de email:', error.message);
      } else {
        console.log('✅ Configuração de email criada');
      }
    }



    // Criar webhook se configurado
    if (webhookConfig) {
      const { error } = await supabase
        .from('notification_webhooks')
        .insert(webhookConfig);

      if (error) {
        console.log('❌ Erro ao criar webhook:', error.message);
      } else {
        console.log('✅ Webhook criado');
      }
    }

    // Criar templates padrão
    console.log('\n📝 Criando templates padrão...');

    for (const template of defaultTemplates) {
      const { error } = await supabase
        .from('notification_templates')
        .upsert(template, { onConflict: 'name' });

      if (error) {
        console.log(`❌ Erro ao criar template ${template.name}:`, error.message);
      } else {
        console.log(`✅ Template ${template.name} criado`);
      }
    }

    // Criar destinatário admin padrão
    const adminEmail = await question('\n👤 Email do administrador: ');
    if (isValidEmail(adminEmail)) {
      const { error } = await supabase
        .from('notification_recipients')
        .upsert({
          name: 'Administrador',
          email: adminEmail,
          channels: ['email'],
          preferences: {
            security: true,
            system: true,
            performance: true,
            backup: true
          },
          enabled: true
        }, { onConflict: 'email' });

      if (error) {
        console.log('❌ Erro ao criar destinatário admin:', error.message);
      } else {
        console.log('✅ Destinatário admin criado');
      }
    }

    // Testar sistema (opcional)
    const testSystem = await question('\n🧪 Deseja enviar uma notificação de teste? (s/n): ');
    
    if (testSystem.toLowerCase() === 's' && emailConfig && isValidEmail(adminEmail)) {
      console.log('\n📤 Enviando notificação de teste...');
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'system',
            channel: 'email',
            recipients: [{
              email: adminEmail,
              name: 'Administrador'
            }],
            subject: 'Sistema de Notificações Inicializado',
            content: 'O sistema de notificações do Hub Control foi configurado com sucesso!',
            priority: 'medium'
          })
        });

        if (response.ok) {
          console.log('✅ Notificação de teste enviada!');
        } else {
          console.log('❌ Erro ao enviar notificação de teste');
        }
      } catch (error) {
        console.log('❌ Erro ao enviar notificação de teste:', error.message);
        console.log('💡 Certifique-se de que o servidor está rodando');
      }
    }

    // Gerar arquivo de configuração
    const generateConfig = await question('\n📄 Deseja gerar arquivo de configuração .env? (s/n): ');
    
    if (generateConfig.toLowerCase() === 's') {
      const envContent = [];
      
      envContent.push('# Sistema de Notificações - Configuração Gerada');
      envContent.push('NOTIFICATION_SYSTEM_ENABLED=true');
      envContent.push('NOTIFICATION_DEFAULT_CHANNEL=email');
      envContent.push('NOTIFICATION_RATE_LIMIT_ENABLED=true');
      envContent.push('');
      
      if (emailConfig) {
        envContent.push('# Email (SMTP)');
        envContent.push(`SMTP_HOST=${emailConfig.config.smtp_host}`);
        envContent.push(`SMTP_PORT=${emailConfig.config.smtp_port}`);
        envContent.push(`SMTP_USER=${emailConfig.config.smtp_user}`);
        envContent.push(`SMTP_PASS=${emailConfig.config.smtp_pass}`);
        envContent.push(`SMTP_FROM=${emailConfig.config.from_email}`);
        envContent.push('');
      }
      
      if (slackConfig) {
        envContent.push('# Slack');
        envContent.push(`SLACK_BOT_TOKEN=${slackConfig.config.bot_token}`);
        envContent.push(`SLACK_DEFAULT_CHANNEL=${slackConfig.config.default_channel}`);
        envContent.push('');
      }
      
      const envPath = path.join(process.cwd(), '.env.notifications.generated');
      fs.writeFileSync(envPath, envContent.join('\n'));
      console.log(`✅ Arquivo de configuração salvo em: ${envPath}`);
      console.log('💡 Copie as configurações para seu .env.local');
    }

    console.log('\n🎉 Inicialização concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse /admin/notifications para gerenciar o sistema');
    console.log('2. Configure canais adicionais conforme necessário');
    console.log('3. Personalize templates para sua aplicação');
    console.log('4. Configure alertas automáticos');
    console.log('\n📖 Consulte o guia completo em: NOTIFICATION_SYSTEM_GUIDE.md');

  } catch (error) {
    console.error('❌ Erro durante a inicialização:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Executar script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };