// @/app/(app)/notificacoes/page.tsx
import { getExpirationReminders, getUsageInstructions, getEventTemplates } from "./actions";
import { NotificationForms } from "./notification-forms";
import type { Reminder, Instruction, OtherTemplate } from './types';


const initialWeekDaysState = {
    sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true
};

// Default state for expiration reminders, used if DB is empty
const defaultExpirationReminders: Reminder[] = [
    {
        id: "reminder-1",
        daysBefore: 5,
        sendTime: "09:00",
        whatsappTemplate: "Olá {{NOME}}, sua assinatura expira em 5 dias ({{VENCIMENTO}}). Renove para não perder o acesso! Acesse sua área de cliente: {{LINK_CLIENTE}}",
        emailTemplate: "<h1>Sua assinatura está expirando!</h1><p>Olá {{NOME}}, renove sua assinatura que expira em {{VENCIMENTO}}.</p>",
        active: true,
        sendDays: { ...initialWeekDaysState },
        sendInterval: 'normal',
        customIntervalMin: 120,
        customIntervalMax: 240,
    },
    {
        id: "reminder-2",
        daysBefore: 1,
        sendTime: "10:00",
        whatsappTemplate: "Atenção, {{NOME}}! Sua assinatura do plano {{PLANO}} vence AMANHÃ ({{VENCIMENTO}}). Garanta a renovação para continuar aproveitando. Acesse sua área de cliente: {{LINK_CLIENTE}}",
        emailTemplate: "<h1>Sua assinatura vence amanhã!</h1><p>Olá {{NOME}}, não se esqueça de renovar sua assinatura do plano {{PLANO}}.</p>",
        active: true,
        sendDays: { ...initialWeekDaysState },
        sendInterval: 'fast',
        customIntervalMin: 120,
        customIntervalMax: 240,
    }
];

// Default state for instructions, used if DB is empty
const defaultInstructions: Instruction[] = [
    {
        id: 'instr-1',
        daysAfter: 1,
        sendTime: "10:00",
        whatsappTemplate: "Olá {{NOME}}, tudo certo com seu acesso? Aqui vai uma dica: adicione nossos canais aos seus favoritos para encontrá-los facilmente!",
        emailTemplate: "<h1>Dica #1 para seu acesso</h1><p>Olá {{NOME}}, aproveite ao máximo nosso serviço. Adicione canais aos favoritos!</p>",
        active: true,
    },
    {
        id: 'instr-2',
        daysAfter: 3,
        sendTime: "11:00",
        whatsappTemplate: "Oi, {{NOME}}! Sabia que você pode usar nosso serviço em vários dispositivos? Baixe nosso aplicativo na loja do seu celular ou Smart TV.",
        emailTemplate: "<h1>Dica #2: Use em múltiplos dispositivos</h1><p>Olá {{NOME}}, acesse de onde estiver. Baixe nossos apps!</p>",
        active: true,
    }
];

// Default templates for other events, used if DB is empty
const defaultEventTemplates: OtherTemplate[] = [
    {
        id: "welcome_manual",
        label: "Boas-vindas (Pagamento Manual)",
        whatsappTemplate: "Olá {{NOME}}! Seja bem-vindo(a). Seu acesso ao plano {{PLANO}} está liberado! 🎉 Segue seus dados:\nUsuário: {{USUARIO_IPTV}}\nSenha: {{SENHA_IPTV}}\nExpira em: {{VENCIMENTO}}\n\nÁrea do Cliente: {{LINK_CLIENTE}}",
        emailTemplate: "<h1>Bem-vindo(a), {{NOME}}!</h1><p>Seu acesso ao nosso serviço de IPTV foi ativado com sucesso.</p>"
    },
    {
        id: "welcome_auto",
        label: "Boas-vindas (Pagamento Automático)",
        whatsappTemplate: "Olá {{NOME}}! Seja bem-vindo(a). Seu acesso ao plano {{PLANO}} foi ativado por nossa automação! 🎉 Segue seus dados:\nUsuário: {{USUARIO_IPTV}}\nSenha: {{SENHA_IPTV}}\nExpira em: {{VENCIMENTO}}\n\nÁrea do Cliente: {{LINK_CLIENTE}}",
        emailTemplate: "<h1>Bem-vindo(a), {{NOME}}!</h1><p>Seu acesso foi ativado automaticamente.</p>"
    },
    {
        id: "test_creation",
        label: "Criação de Teste",
        whatsappTemplate: "Olá! Seu teste grátis do plano {{PLANO}} foi criado com sucesso. Aproveite! 😉\n\n*Dados de Acesso:*\nUsuário: `{{USUARIO_IPTV}}`\nSenha: `{{SENHA_IPTV}}`\n\nUse estes dados para fazer login no seu aplicativo de preferência.",
        emailTemplate: "<h1>Seu teste grátis está pronto!</h1><p>Acesse agora e explore nosso catálogo completo. Use o usuário {{USUARIO_IPTV}} e senha {{SENHA_IPTV}}</p>"
    },
     {
        id: "payment_overdue",
        label: "Aviso de Fatura Atrasada",
        whatsappTemplate: "Olá, {{NOME}}. Não identificamos o pagamento da sua fatura referente ao plano {{PLANO}}. Para evitar o bloqueio, regularize sua situação através do link: {{LINK_CLIENTE}}",
        emailTemplate: "<h1>Pagamento Pendente</h1><p>Olá {{NOME}}, sua fatura está em aberto. Regularize para evitar a suspensão do serviço.</p>"
    },
    {
        id: "payment_confirmation",
        label: "Confirmação de Pagamento",
        whatsappTemplate: "Seu pagamento foi confirmado com sucesso! Sua assinatura do plano {{PLANO}} foi renovada até {{VENCIMENTO}}. Obrigado pela preferência. ✅",
        emailTemplate: "<h1>Pagamento Confirmado</h1><p>Recebemos seu pagamento e sua assinatura foi renovada.</p>"
    }
];

export default async function NotificacoesPage() {
    const [reminders, instructions, eventTemplates] = await Promise.all([
        getExpirationReminders(defaultExpirationReminders),
        getUsageInstructions(defaultInstructions),
        getEventTemplates(defaultEventTemplates)
    ]);

  return (
        <NotificationForms 
            initialReminders={reminders}
            initialInstructions={instructions}
            initialEventTemplates={eventTemplates}
        />
  );
}

