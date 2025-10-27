// @/app/(app)/notificacoes/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
// Removido: import { db } from "@/lib/firebase";
// Removido: import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import type { Reminder, Instruction, OtherTemplate } from './types';
import { createServerSupabaseClientForActions } from "@/lib/supabase/clients/server";

// --- as definições de collections removidas pois não são mais usadas ---

// Schemas for validation
const reminderSchema = z.array(z.object({
    id: z.string(),
    daysBefore: z.number(),
    sendTime: z.string(),
    whatsappTemplate: z.string(),
    emailTemplate: z.string(),
    active: z.boolean(),
    sendDays: z.record(z.string(), z.boolean()),
    sendInterval: z.enum(['fast', 'normal', 'slow', 'custom']),
    customIntervalMin: z.number(),
    customIntervalMax: z.number(),
}));

const instructionSchema = z.array(z.object({
    id: z.string(),
    daysAfter: z.number(),
    sendTime: z.string(),
    whatsappTemplate: z.string(),
    emailTemplate: z.string(),
    active: z.boolean(),
}));

const otherTemplateSchema = z.array(z.object({
    id: z.string(),
    label: z.string(),
    whatsappTemplate: z.string(),
    emailTemplate: z.string(),
}));


// --- GETTERS ---
type WithId = { id: string };

// Função para mapear propriedades camelCase para snake_case
function mapPropertiesToSnakeCase(obj: any): any {
    const mapped: any = {};
    for (const [key, value] of Object.entries(obj)) {
        // Converter camelCase para snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        mapped[snakeKey] = value;
    }
    return mapped;
}

async function getCollectionData(table: string, defaultData: any[]): Promise<any[]> {
    const supabase = await createServerSupabaseClientForActions();
    const { data, error } = await (supabase as any).from(table).select('*');
    if (!data || data.length === 0) {
        // Se a tabela estiver vazia, popular com os dados padrão
        for (const item of defaultData) {
            const { id, ...itemWithoutId } = item;
            // Mapear propriedades camelCase para snake_case se necessário
            const mappedItem = mapPropertiesToSnakeCase(itemWithoutId);
            await (supabase as any).from(table).insert([mappedItem]);
        }
        return defaultData;
    }
    // Ordenar por ID para manter ordem consistente
    return (data as any[]).sort((a: any, b: any) => a.id.localeCompare(b.id));
}

export async function getExpirationReminders(defaults: Reminder[]): Promise<Reminder[]> {
    return getCollectionData('notificationReminders', defaults);
}

export async function getUsageInstructions(defaults: Instruction[]): Promise<Instruction[]> {
    return getCollectionData('notificationInstructions', defaults);
}

export async function getEventTemplates(defaults: OtherTemplate[]): Promise<OtherTemplate[]> {
    return getCollectionData('notificationEventTemplates', defaults);
}


// --- SETTERS / UPDATERS ---
async function updateCollection(table: string, data: any[], schema: any): Promise<{ success: boolean, error?: string }> {
    try {
        const validatedData = schema.parse(data);
        const supabase = await createServerSupabaseClientForActions();
        
        // Para notificações do sistema, usar a tabela notification_templates em vez de notifications
        // A tabela notifications é para notificações ativas do sistema de notificações
        for (const item of validatedData) {
            // Usar notification_templates para armazenar templates/configurações
            const { data: templateData, error } = await (supabase as any).from('notification_templates').upsert({
                id: item.id,
                name: `template_${item.id}`,
                type: 'custom', // Usando enum válido do sistema
                subject_template: item.title || 'Notificação',
                content_template: JSON.stringify(item), // Serializar o item completo
                variables: [],
                enabled: true,
                version: 1
            }, { onConflict: 'id' });
            
            if (error) console.error('Error upserting notification template:', error);
        }
        revalidatePath('/notificacoes');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating collection: ", error);
        if (error instanceof z.ZodError) {
            return { success: false, error: JSON.stringify(error.flatten()) };
        }
        return { success: false, error: "Ocorreu um erro ao salvar os dados." };
    }
}

export async function saveExpirationReminders(data: Reminder[]) {
    return updateCollection('notificationReminders', data, reminderSchema);
}

export async function saveUsageInstructions(data: Instruction[]) {
    return updateCollection('notificationInstructions', data, instructionSchema);
}

export async function saveEventTemplates(data: OtherTemplate[]) {
    return updateCollection('notificationEventTemplates', data, otherTemplateSchema);
}

