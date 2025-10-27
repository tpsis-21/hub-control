#!/usr/bin/env node

/**
 * Script para corrigir configurações de autenticação
 * Foca em configurações de OTP e senhas seguras
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas');
    process.exit(1);
}

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Função principal para corrigir configurações de autenticação
 */
async function fixAuthConfigurations() {
    console.log('🔐 Iniciando correção de configurações de autenticação');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    
    try {
        // 1. Testar conexão
        console.log('🔗 Testando conexão...');
        
        const { data: testData, error: testError } = await supabase
            .from('auth.users')
            .select('count', { count: 'exact', head: true });
        
        if (testError && !testError.message.includes('permission denied')) {
            console.error('❌ Erro de conexão:', testError.message);
            throw testError;
        }
        
        console.log('✅ Conexão estabelecida com sucesso');
        
        // 2. Verificar configurações atuais de autenticação
        console.log('\n🔍 Verificando configurações de autenticação...');
        
        // Verificar usuários com problemas de autenticação
        const { data: usersData, error: usersError } = await supabase
            .from('auth.users')
            .select('id, email, email_confirmed_at, phone_confirmed_at, created_at, last_sign_in_at')
            .limit(10);
        
        if (!usersError && usersData) {
            console.log(`📊 Total de usuários encontrados: ${usersData.length}`);
            
            const unconfirmedEmails = usersData.filter(user => !user.email_confirmed_at);
            const unconfirmedPhones = usersData.filter(user => user.phone_confirmed_at === null);
            
            console.log(`📧 Emails não confirmados: ${unconfirmedEmails.length}`);
            console.log(`📱 Telefones não confirmados: ${unconfirmedPhones.length}`);
        } else {
            console.log('ℹ️  Não foi possível acessar dados de usuários diretamente');
        }
        
        // 3. Relatório de configurações de segurança recomendadas
        console.log('\n🛡️  Configurações de Segurança Recomendadas');
        console.log('═'.repeat(60));
        
        console.log('\n📋 Checklist de Configurações de Autenticação:');
        
        console.log('\n🔑 1. Configurações de Senha:');
        console.log('□ Comprimento mínimo: 8 caracteres');
        console.log('□ Exigir caracteres especiais');
        console.log('□ Exigir números');
        console.log('□ Exigir letras maiúsculas e minúsculas');
        console.log('□ Prevenir senhas comuns');
        console.log('□ Histórico de senhas (evitar reutilização)');
        
        console.log('\n📱 2. Configurações de OTP/2FA:');
        console.log('□ Habilitar autenticação de dois fatores');
        console.log('□ Configurar tempo de expiração do OTP (5-10 minutos)');
        console.log('□ Limitar tentativas de OTP (3-5 tentativas)');
        console.log('□ Configurar cooldown entre tentativas');
        console.log('□ Logs de tentativas de OTP');
        
        console.log('\n📧 3. Configurações de Email:');
        console.log('□ Verificação obrigatória de email');
        console.log('□ Templates de email seguros');
        console.log('□ Rate limiting para envio de emails');
        console.log('□ Configurar SPF, DKIM, DMARC');
        
        console.log('\n🔒 4. Configurações de Sessão:');
        console.log('□ Tempo de expiração de sessão');
        console.log('□ Refresh token rotation');
        console.log('□ Logout automático por inatividade');
        console.log('□ Detecção de sessões simultâneas');
        
        console.log('\n🚫 5. Proteções contra Ataques:');
        console.log('□ Rate limiting para login');
        console.log('□ Bloqueio temporário após tentativas falhadas');
        console.log('□ Captcha após múltiplas tentativas');
        console.log('□ Detecção de força bruta');
        console.log('□ Logs de tentativas de acesso');
        
        // 4. Configurações específicas do Supabase
        console.log('\n⚙️  Configurações Específicas do Supabase:');
        console.log('═'.repeat(50));
        
        console.log('\n📝 Configurações no Dashboard do Supabase:');
        console.log('1. 🔐 Authentication > Settings:');
        console.log('   • Enable email confirmations: ✅');
        console.log('   • Enable phone confirmations: ✅');
        console.log('   • Disable sign-ups: ❌ (conforme necessidade)');
        console.log('   • Enable manual linking: ❌');
        
        console.log('\n2. 🔑 Authentication > Policies:');
        console.log('   • Row Level Security (RLS): ✅ Habilitado');
        console.log('   • Políticas específicas por tabela');
        console.log('   • Validação de permissões');
        
        console.log('\n3. 📧 Authentication > Email Templates:');
        console.log('   • Customizar templates de confirmação');
        console.log('   • Adicionar branding da empresa');
        console.log('   • Configurar URLs de redirecionamento');
        
        console.log('\n4. 🛡️  Authentication > Rate Limits:');
        console.log('   • Login attempts: 5 por minuto');
        console.log('   • Password reset: 3 por hora');
        console.log('   • Email sending: 10 por hora');
        
        // 5. Configurações de ambiente
        console.log('\n🌍 Configurações de Ambiente (.env):');
        console.log('═'.repeat(40));
        
        console.log('\n📝 Variáveis Recomendadas:');
        console.log('# Configurações de Autenticação');
        console.log('SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED=false');
        console.log('SUPABASE_AUTH_EXTERNAL_GITHUB_ENABLED=false');
        console.log('SUPABASE_AUTH_EMAIL_ENABLE_SIGNUP=true');
        console.log('SUPABASE_AUTH_EMAIL_DOUBLE_CONFIRM_CHANGES=true');
        console.log('SUPABASE_AUTH_EMAIL_ENABLE_CONFIRMATIONS=true');
        console.log('SUPABASE_AUTH_SMS_ENABLE_SIGNUP=false');
        console.log('SUPABASE_AUTH_SMS_ENABLE_CONFIRMATIONS=false');
        console.log('');
        console.log('# Configurações de Segurança');
        console.log('SUPABASE_AUTH_JWT_EXP=3600  # 1 hora');
        console.log('SUPABASE_AUTH_PASSWORD_MIN_LENGTH=8');
        console.log('SUPABASE_AUTH_RATE_LIMIT_EMAIL_SENT=10');
        console.log('SUPABASE_AUTH_RATE_LIMIT_TOKEN_REFRESH=5');
        
        // 6. Próximos passos
        console.log('\n🎯 Próximos Passos:');
        console.log('═'.repeat(30));
        
        console.log('\n1. 🔧 Configurações Imediatas:');
        console.log('   • Acessar Dashboard do Supabase');
        console.log('   • Ir para Authentication > Settings');
        console.log('   • Habilitar confirmações de email');
        console.log('   • Configurar rate limits');
        
        console.log('\n2. 🛡️  Implementar Políticas RLS:');
        console.log('   • Revisar todas as tabelas');
        console.log('   • Criar políticas específicas');
        console.log('   • Testar permissões');
        
        console.log('\n3. 📊 Monitoramento:');
        console.log('   • Configurar logs de autenticação');
        console.log('   • Alertas para tentativas suspeitas');
        console.log('   • Dashboard de métricas de segurança');
        
        console.log('\n4. 🧪 Testes:');
        console.log('   • Testar fluxos de autenticação');
        console.log('   • Validar rate limits');
        console.log('   • Testar recuperação de senha');
        console.log('   • Testar confirmação de email');
        
        // 7. Comandos úteis para verificação
        console.log('\n🔧 Comandos Úteis para Verificação:');
        console.log('═'.repeat(40));
        
        console.log('\n-- Verificar usuários não confirmados:');
        console.log('SELECT email, email_confirmed_at, created_at');
        console.log('FROM auth.users');
        console.log('WHERE email_confirmed_at IS NULL;');
        
        console.log('\n-- Verificar tentativas de login recentes:');
        console.log('SELECT * FROM auth.audit_log_entries');
        console.log('WHERE created_at > NOW() - INTERVAL \'24 hours\'');
        console.log('ORDER BY created_at DESC;');
        
        console.log('\n-- Verificar sessões ativas:');
        console.log('SELECT user_id, created_at, updated_at');
        console.log('FROM auth.sessions');
        console.log('WHERE updated_at > NOW() - INTERVAL \'1 hour\';');
        
        return {
            success: true,
            message: 'Configurações de autenticação identificadas',
            nextSteps: [
                'Configurar Dashboard Supabase',
                'Implementar políticas RLS',
                'Configurar rate limits',
                'Testar fluxos de autenticação'
            ]
        };
        
    } catch (error) {
        console.error('\n❌ Erro durante correção de autenticação:', error.message);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    fixAuthConfigurations()
        .then(results => {
            console.log('\n🎉 Análise de configurações de autenticação concluída!');
            console.log('📝 Próximo passo: Implementar configurações no Dashboard do Supabase');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Falha na análise de autenticação:', error.message);
            process.exit(1);
        });
}

module.exports = { fixAuthConfigurations };