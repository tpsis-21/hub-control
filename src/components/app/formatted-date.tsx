// @/components/app/formatted-date.tsx
"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBrazilDate } from "@/lib/timezone";

type FormattedDateProps = {
  dateString: string;
  format: string;
};

/**
 * Componente para formatar datas no lado do cliente, evitando erros de hidratação.
 * Ele garante que a data seja sempre renderizada no fuso horário e localidade do navegador do usuário.
 *
 * @param {string} dateString - A data em formato ISO (ex: "2023-10-27T10:00:00.000Z").
 * @param {string} formatString - O formato desejado (ex: "dd/MM/yyyy").
 * @returns A data formatada como string.
 */
export function FormattedDate({ dateString, format: formatString }: FormattedDateProps) {
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    // A formatação da data só ocorre após a montagem do componente no cliente.
    try {
      const date = parseISO(dateString);
      setFormattedDate(formatBrazilDate(date, formatString));
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      setFormattedDate("Data inválida");
    }
  }, [dateString, formatString]);

  // Durante a renderização no servidor (SSR) ou a primeira renderização no cliente,
  // retorna nulo para evitar a disparidade de conteúdo.
  if (!formattedDate) {
    return null;
  }

  // Retorna a data formatada.
  return <>{formattedDate}</>;
}
