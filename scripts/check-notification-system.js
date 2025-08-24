#!/usr/bin/env node

/**
 * Script de Verificação do Sistema de Notificações
 * 
 * Este script verifica se o sistema de notificações está funcionando corretamente,
 * testando conectividade, configurações e funcionalidades básicas.
 * 
 * Uso:
 *   node scripts/check-notification-system.js
 *   npm run notifications:check
 */

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

class NotificationSystemChecker {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.results = {
      database: { status: 'pending', details: [] },
      channels: { status: 'pending', details: [] },
      templates: { status: 'pending', details: [] },
      configuration: { status: 'pending', details: [] },
      connectivity: { status: 'pending', details: [] }
    };
  }

  async run() {
    console.log('🔍 Verificando Sistema de Notificações...\n');

    try {
      await this.checkDatabase();
      await this.checkChannels();
      await this.checkTemplates();
      await this.checkConfiguration();
      await this.checkConnectivity();
      
      this.printResults();
      this.printRecommendations();
      
    } catch (error) {
      console.error('❌ Erro durante verificação:', error.message);
      process.exit(1);
    }
  }

  async checkDatabase() {
    console.log('📊 Verificando banco de dados...');
    
    try {
      // Verificar se as tabelas existem
      const tables = [
        'notifications',
        'notification_templates', 
        'notification_channels',
        'notification_delivery_logs',
        'notification_webhooks',
        'notification_recipients'
      ];
      
      for (const table of tables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          this.results.database.details.push(`❌ Tabela '${table}' não encontrada`);
        } else {
          this.results.database.details.push(`✅ Tabela '${table}' OK`);
        }
      }
      
      // Verificar funções
      const { data: functions, error: funcError } = await this.supabase
        .rpc('check_notification_system_health');
      
      if (funcError) {
        this.results.database.details.push('❌ Funções do sistema não encontradas');
      } else {
        this.results.database.details.push('✅ Funções do sistema OK');
      }
      
      // Verificar tipos ENUM
      const { data: types, error: typeError } = await this.supabase
        .from('pg_type')
        .select('typname')
        .in('typname', ['notification_type', 'notification_channel', 'notification_priority']);
      
      if (!typeError && types?.length === 3) {
        this.results.database.details.push('✅ Tipos ENUM OK');
      } else {
        this.results.database.details.push('❌ Tipos ENUM não encontrados');
      }
      
      this.results.database.status = this.results.database.details.every(d => d.startsWith('✅')) ? 'success' : 'error';
      
    } catch (error) {
      this.results.database.status = 'error';
      this.results.database.details.push(`❌ Erro: ${error.message}`);
    }
  }

  async checkChannels() {
    console.log('📡 Verificando canais...');
    
    try {
      const { data: channels, error } = await this.supabase
        .from('notification_channels')
        .select('*');
      
      if (error) {
        this.results.channels.status = 'error';
        this.results.channels.details.push(`❌ Erro ao buscar canais: ${error.message}`);
        return;
      }
      
      if (!channels || channels.length === 0) {
        this.results.channels.status = 'warning';
        this.results.channels.details.push('⚠️ Nenhum canal configurado');
        return;
      }
      
      const channelTypes = ['email', 'webhook', 'in_app'];
      const configuredChannels = channels.map(c => c.channel);
      
      for (const channelType of channelTypes) {
        const channel = channels.find(c => c.channel === channelType);
        if (channel) {
          const status = channel.enabled ? '✅' : '⚠️';
          const enabledText = channel.enabled ? 'habilitado' : 'desabilitado';
          this.results.channels.details.push(`${status} Canal ${channelType}: ${enabledText}`);
        } else {
          this.results.channels.details.push(`❌ Canal ${channelType}: não configurado`);
        }
      }
      
      const enabledChannels = channels.filter(c => c.enabled).length;
      if (enabledChannels > 0) {
        this.results.channels.status = 'success';
        this.results.channels.details.push(`✅ ${enabledChannels} canal(is) habilitado(s)`);
      } else {
        this.results.channels.status = 'warning';
        this.results.channels.details.push('⚠️ Nenhum canal habilitado');
      }
      
    } catch (error) {
      this.results.channels.status = 'error';
      this.results.channels.details.push(`❌ Erro: ${error.message}`);
    }
  }

  async checkTemplates() {
    console.log('📝 Verificando templates...');
    
    try {
      const { data: templates, error } = await this.supabase
        .from('notification_templates')
        .select('*');
      
      if (error) {
        this.results.templates.status = 'error';
        this.results.templates.details.push(`❌ Erro ao buscar templates: ${error.message}`);
        return;
      }
      
      if (!templates || templates.length === 0) {
        this.results.templates.status = 'warning';
        this.results.templates.details.push('⚠️ Nenhum template encontrado');
        return;
      }
      
      const defaultTemplates = [
        'welcome_user',
        'security_alert', 
        'backup_success',
        'system_maintenance',
        'performance_alert'
      ];
      
      for (const templateName of defaultTemplates) {
        const template = templates.find(t => t.name === templateName);
        if (template) {
          const status = template.enabled ? '✅' : '⚠️';
          const enabledText = template.enabled ? 'habilitado' : 'desabilitado';
          this.results.templates.details.push(`${status} Template '${templateName}': ${enabledText}`);
        } else {
          this.results.templates.details.push(`❌ Template '${templateName}': não encontrado`);
        }
      }
      
      const enabledTemplates = templates.filter(t => t.enabled).length;
      this.results.templates.details.push(`✅ ${templates.length} template(s) total, ${enabledTemplates} habilitado(s)`);
      
      this.results.templates.status = templates.length > 0 ? 'success' : 'warning';
      
    } catch (error) {
      this.results.templates.status = 'error';
      this.results.templates.details.push(`❌ Erro: ${error.message}`);
    }
  }

  async checkConfiguration() {
    console.log('⚙️ Verificando configuração...');
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const optionalEnvVars = [
      'SMTP_HOST',
      'SMTP_USER', 
      'SMTP_PASS',
      'TWILIO_ACCOUNT_SID',
      'SLACK_BOT_TOKEN',
      'WEBHOOK_SECRET'
    ];
    
    // Verificar variáveis obrigatórias
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.results.configuration.details.push(`✅ ${envVar}: configurado`);
      } else {
        this.results.configuration.details.push(`❌ ${envVar}: não configurado`);
      }
    }
    
    // Verificar variáveis opcionais
    let configuredOptional = 0;
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        this.results.configuration.details.push(`✅ ${envVar}: configurado`);
        configuredOptional++;
      } else {
        this.results.configuration.details.push(`⚠️ ${envVar}: não configurado`);
      }
    }
    
    // Verificar arquivo .env
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envPath)) {
      this.results.configuration.details.push('✅ Arquivo .env.local encontrado');
    } else {
      this.results.configuration.details.push('⚠️ Arquivo .env.local não encontrado');
    }
    
    const hasRequired = requiredEnvVars.every(v => process.env[v]);
    this.results.configuration.status = hasRequired ? 'success' : 'error';
    
    if (configuredOptional === 0) {
      this.results.configuration.details.push('⚠️ Nenhum canal externo configurado');
    }
  }

  async checkConnectivity() {
    console.log('🌐 Verificando conectividade...');
    
    // Testar conexão com Supabase
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (!error) {
        this.results.connectivity.details.push('✅ Conexão com Supabase: OK');
      } else {
        this.results.connectivity.details.push('❌ Conexão com Supabase: Falha');
      }
    } catch (error) {
      this.results.connectivity.details.push(`❌ Conexão com Supabase: ${error.message}`);
    }
    
    // Testar SMTP se configurado
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        
        await transporter.verify();
        this.results.connectivity.details.push('✅ Conexão SMTP: OK');
      } catch (error) {
        this.results.connectivity.details.push(`❌ Conexão SMTP: ${error.message}`);
      }
    } else {
      this.results.connectivity.details.push('⚠️ SMTP não configurado');
    }
    
    // Testar Slack se configurado
    if (process.env.SLACK_BOT_TOKEN) {
      try {
        const { WebClient } = require('@slack/web-api');
        const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
        
        await slack.auth.test();
        this.results.connectivity.details.push('✅ Conexão Slack: OK');
      } catch (error) {
        this.results.connectivity.details.push(`❌ Conexão Slack: ${error.message}`);
      }
    } else {
      this.results.connectivity.details.push('⚠️ Slack não configurado');
    }
    
    const hasErrors = this.results.connectivity.details.some(d => d.startsWith('❌'));
    this.results.connectivity.status = hasErrors ? 'error' : 'success';
  }

  printResults() {
    console.log('\n📋 Resultados da Verificação:');
    console.log('=' .repeat(50));
    
    for (const [category, result] of Object.entries(this.results)) {
      const icon = this.getStatusIcon(result.status);
      const color = this.getStatusColor(result.status);
      
      console.log(`\n${icon} ${category.toUpperCase()}:`);
      
      for (const detail of result.details) {
        console.log(`  ${detail}`);
      }
    }
  }

  printRecommendations() {
    console.log('\n💡 Recomendações:');
    console.log('=' .repeat(50));
    
    const recommendations = [];
    
    // Verificar problemas e gerar recomendações
    if (this.results.database.status === 'error') {
      recommendations.push('🔧 Execute as migrações: npx supabase db push');
    }
    
    if (this.results.channels.status === 'warning') {
      recommendations.push('⚙️ Configure os canais: npm run init:notifications');
    }
    
    if (this.results.templates.status === 'warning') {
      recommendations.push('📝 Crie templates padrão: npm run init:notifications');
    }
    
    if (this.results.configuration.status === 'error') {
      recommendations.push('📄 Configure as variáveis de ambiente necessárias');
    }
    
    if (this.results.connectivity.status === 'error') {
      recommendations.push('🌐 Verifique as configurações de conectividade');
    }
    
    // Recomendações gerais
    const hasEnabledChannels = this.results.channels.details.some(d => d.includes('habilitado'));
    if (!hasEnabledChannels) {
      recommendations.push('📡 Habilite pelo menos um canal de notificação');
    }
    
    if (recommendations.length === 0) {
      console.log('✅ Sistema funcionando corretamente!');
      console.log('\nPróximos passos:');
      console.log('  • Teste o envio: npm run notifications:test');
      console.log('  • Acesse o dashboard: /admin/notifications');
      console.log('  • Configure webhooks se necessário');
    } else {
      for (const recommendation of recommendations) {
        console.log(`  ${recommendation}`);
      }
    }
    
    console.log('\nDocumentação:');
    console.log('  • Guia completo: ./NOTIFICATION_SYSTEM_GUIDE.md');
    console.log('  • Documentação técnica: ./docs/NOTIFICATION_SYSTEM_TECHNICAL.md');
    console.log('  • README: ./src/lib/notifications/README.md');
  }

  getStatusIcon(status) {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '⏳';
    }
  }

  getStatusColor(status) {
    switch (status) {
      case 'success': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  }
}

// Executar verificação se chamado diretamente
if (require.main === module) {
  const checker = new NotificationSystemChecker();
  checker.run().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = NotificationSystemChecker;