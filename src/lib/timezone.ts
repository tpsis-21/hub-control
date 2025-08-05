// @/lib/timezone.ts
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

// Fuso horário de Brasília
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data para o fuso horário de Brasília
 */
export function toBrazilTime(date: Date): Date {
  return toZonedTime(date, BRAZIL_TIMEZONE);
}

/**
 * Converte uma data do fuso horário de Brasília para UTC
 */
export function fromBrazilTime(date: Date): Date {
  return fromZonedTime(date, BRAZIL_TIMEZONE);
}

/**
 * Formata uma data no fuso horário de Brasília
 */
export function formatBrazilDate(date: Date, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const brazilDate = toBrazilTime(date);
  return format(brazilDate, formatStr, { 
    timeZone: BRAZIL_TIMEZONE,
    locale: ptBR 
  });
}

/**
 * Obtém a data atual no fuso horário de Brasília
 */
export function nowInBrazil(): Date {
  return toBrazilTime(new Date());
}

/**
 * Cria uma data no fuso horário de Brasília
 */
export function createBrazilDate(year: number, month: number, day: number, hour: number = 12, minute: number = 0): Date {
  const localDate = new Date(year, month, day, hour, minute);
  return fromBrazilTime(localDate);
}

/**
 * Verifica se uma data está no mesmo dia no fuso horário de Brasília
 */
export function isSameDayInBrazil(date1: Date, date2: Date): boolean {
  const brazil1 = toBrazilTime(date1);
  const brazil2 = toBrazilTime(date2);
  
  return brazil1.getFullYear() === brazil2.getFullYear() &&
         brazil1.getMonth() === brazil2.getMonth() &&
         brazil1.getDate() === brazil2.getDate();
}

/**
 * Obtém o início do dia no fuso horário de Brasília
 */
export function startOfDayInBrazil(date: Date): Date {
  const brazilDate = toBrazilTime(date);
  const startOfDay = new Date(brazilDate.getFullYear(), brazilDate.getMonth(), brazilDate.getDate(), 0, 0, 0);
  return fromBrazilTime(startOfDay);
}

/**
 * Obtém o fim do dia no fuso horário de Brasília
 */
export function endOfDayInBrazil(date: Date): Date {
  const brazilDate = toBrazilTime(date);
  const endOfDay = new Date(brazilDate.getFullYear(), brazilDate.getMonth(), brazilDate.getDate(), 23, 59, 59, 999);
  return fromBrazilTime(endOfDay);
}