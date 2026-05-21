// @/app/(app)/notificacoes/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Reminder, Instruction, OtherTemplate } from "./types";
import { createServerSupabaseClientForActions } from "@/lib/supabase/clients/server";
import type { Database } from "@/lib/database.types";

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
type NotificationChannel = NotificationInsert["type"];

async function assertAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabaseClientForActions();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Não autenticado." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Acesso negado. Apenas administradores." };
  }
  return { ok: true };
}

const NOTIFICATION_TYPE = {
  REMINDER: "expiration_reminder",
  INSTRUCTION: "usage_instruction",
  EVENT: "event_template",
} as const;

const reminderSchema = z.array(
  z.object({
    id: z.string(),
    daysBefore: z.number(),
    sendTime: z.string(),
    whatsappTemplate: z.string(),
    emailTemplate: z.string(),
    active: z.boolean(),
    sendDays: z.record(z.string(), z.boolean()),
    sendInterval: z.enum(["fast", "normal", "slow", "custom"]),
    customIntervalMin: z.number(),
    customIntervalMax: z.number(),
  })
);

const instructionSchema = z.array(
  z.object({
    id: z.string(),
    daysAfter: z.number(),
    sendTime: z.string(),
    whatsappTemplate: z.string(),
    emailTemplate: z.string(),
    active: z.boolean(),
  })
);

const otherTemplateSchema = z.array(
  z.object({
    id: z.string(),
    label: z.string(),
    whatsappTemplate: z.string(),
    emailTemplate: z.string(),
  })
);

type NotificationPayload = Record<string, unknown>;

function parsePayload(message: string | null): NotificationPayload {
  if (!message) return {};
  try {
    return JSON.parse(message) as NotificationPayload;
  } catch {
    return {};
  }
}

function rowToReminder(row: {
  event: string;
  days_before_expiration: number | null;
  subject: string | null;
  message: string | null;
  active: boolean;
}): Reminder {
  const payload = parsePayload(row.message);
  return {
    id: row.event,
    daysBefore: row.days_before_expiration ?? 0,
    sendTime: row.subject ?? "09:00",
    whatsappTemplate: (payload.whatsappTemplate as string) ?? "",
    emailTemplate: (payload.emailTemplate as string) ?? "",
    active: row.active,
    sendDays: (payload.sendDays as Reminder["sendDays"]) ?? {
      sun: true,
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: true,
    },
    sendInterval: (payload.sendInterval as Reminder["sendInterval"]) ?? "normal",
    customIntervalMin: (payload.customIntervalMin as number) ?? 120,
    customIntervalMax: (payload.customIntervalMax as number) ?? 240,
  };
}

function rowToInstruction(row: {
  event: string;
  days_before_expiration: number | null;
  subject: string | null;
  message: string | null;
  active: boolean;
}): Instruction {
  const payload = parsePayload(row.message);
  return {
    id: row.event,
    daysAfter: row.days_before_expiration ?? 0,
    sendTime: row.subject ?? "09:00",
    whatsappTemplate: (payload.whatsappTemplate as string) ?? "",
    emailTemplate: (payload.emailTemplate as string) ?? "",
    active: row.active,
  };
}

function rowToEventTemplate(row: {
  event: string;
  subject: string | null;
  message: string | null;
}): OtherTemplate {
  const payload = parsePayload(row.message);
  return {
    id: row.event,
    label: row.subject ?? row.event,
    whatsappTemplate: (payload.whatsappTemplate as string) ?? "",
    emailTemplate: (payload.emailTemplate as string) ?? "",
  };
}

async function getConfigsByType<T>(
  type: string,
  defaults: T[],
  mapRow: (row: {
    event: string;
    days_before_expiration: number | null;
    subject: string | null;
    message: string | null;
    active: boolean;
  }) => T
): Promise<T[]> {
  const supabase = await createServerSupabaseClientForActions();
  const { data, error } = await supabase
    .from("notifications")
    .select("event, days_before_expiration, subject, message, active")
    .eq("type", type as NotificationChannel)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Erro ao buscar notificações (${type}):`, error);
    return defaults;
  }

  if (!data?.length) {
    return defaults;
  }

  return data.map(mapRow);
}

async function saveConfigsByType<T extends { id: string }>(
  type: string,
  data: T[],
  schema: z.ZodType<T[]>,
  toRow: (item: T) => {
    type: string;
    event: string;
    days_before_expiration: number | null;
    subject: string | null;
    message: string;
    active: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await assertAdmin();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const validated = schema.parse(data);
    const supabase = await createServerSupabaseClientForActions();

    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("type", type as NotificationChannel);

    if (deleteError) {
      console.error(`Erro ao limpar notificações (${type}):`, deleteError);
      return { success: false, error: deleteError.message };
    }

    if (validated.length > 0) {
      const rows = validated.map(toRow);
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(rows as NotificationInsert[]);
      if (insertError) {
        console.error(`Erro ao salvar notificações (${type}):`, insertError);
        return { success: false, error: insertError.message };
      }
    }

    revalidatePath("/notificacoes");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating notifications:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: JSON.stringify(error.flatten()) };
    }
    return { success: false, error: "Ocorreu um erro ao salvar os dados." };
  }
}

export async function getExpirationReminders(defaults: Reminder[]): Promise<Reminder[]> {
  return getConfigsByType(NOTIFICATION_TYPE.REMINDER, defaults, rowToReminder);
}

export async function getUsageInstructions(defaults: Instruction[]): Promise<Instruction[]> {
  return getConfigsByType(NOTIFICATION_TYPE.INSTRUCTION, defaults, rowToInstruction);
}

export async function getEventTemplates(defaults: OtherTemplate[]): Promise<OtherTemplate[]> {
  return getConfigsByType(NOTIFICATION_TYPE.EVENT, defaults, rowToEventTemplate);
}

export async function saveExpirationReminders(data: Reminder[]) {
  return saveConfigsByType(NOTIFICATION_TYPE.REMINDER, data, reminderSchema, (item) => ({
    type: NOTIFICATION_TYPE.REMINDER,
    event: item.id,
    days_before_expiration: item.daysBefore,
    subject: item.sendTime,
    message: JSON.stringify({
      whatsappTemplate: item.whatsappTemplate,
      emailTemplate: item.emailTemplate,
      sendDays: item.sendDays,
      sendInterval: item.sendInterval,
      customIntervalMin: item.customIntervalMin,
      customIntervalMax: item.customIntervalMax,
    }),
    active: item.active,
  }));
}

export async function saveUsageInstructions(data: Instruction[]) {
  return saveConfigsByType(NOTIFICATION_TYPE.INSTRUCTION, data, instructionSchema, (item) => ({
    type: NOTIFICATION_TYPE.INSTRUCTION,
    event: item.id,
    days_before_expiration: item.daysAfter,
    subject: item.sendTime,
    message: JSON.stringify({
      whatsappTemplate: item.whatsappTemplate,
      emailTemplate: item.emailTemplate,
    }),
    active: item.active,
  }));
}

export async function saveEventTemplates(data: OtherTemplate[]) {
  return saveConfigsByType(NOTIFICATION_TYPE.EVENT, data, otherTemplateSchema, (item) => ({
    type: NOTIFICATION_TYPE.EVENT,
    event: item.id,
    days_before_expiration: null,
    subject: item.label,
    message: JSON.stringify({
      whatsappTemplate: item.whatsappTemplate,
      emailTemplate: item.emailTemplate,
    }),
    active: true,
  }));
}
