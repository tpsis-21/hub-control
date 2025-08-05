// @/app/(app)/notificacoes/types.ts

export type Reminder = {
    id: string;
    daysBefore: number;
    sendTime: string;
    whatsappTemplate: string;
    emailTemplate: string;
    active: boolean;
    sendDays: Record<string, boolean>;
    sendInterval: 'fast' | 'normal' | 'slow' | 'custom';
    customIntervalMin: number;
    customIntervalMax: number;
};

export type Instruction = {
    id: string;
    daysAfter: number;
    sendTime: string;
    whatsappTemplate: string;
    emailTemplate: string;
    active: boolean;
}

export type OtherTemplate = {
    id: string;
    label: string;
    whatsappTemplate: string;
    emailTemplate: string;
};
