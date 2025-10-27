// @/components/ui/formatted-currency.tsx
"use client";

import { formatPrice } from "@/lib/format-price";

type FormattedCurrencyProps = {
  value: number;
  showCurrency?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  className?: string;
};

/**
 * Componente para formatar valores monetários em reais brasileiros.
 * 
 * @param {number} value - O valor numérico a ser formatado
 * @param {boolean} showCurrency - Se deve mostrar o símbolo da moeda (padrão: true)
 * @param {number} minimumFractionDigits - Número mínimo de casas decimais (padrão: 2)
 * @param {number} maximumFractionDigits - Número máximo de casas decimais (padrão: 2)
 * @param {string} className - Classes CSS adicionais
 * @returns Valor formatado como moeda brasileira
 */
export function FormattedCurrency({
  value,
  showCurrency = true,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  className
}: FormattedCurrencyProps) {
  const formattedValue = formatPrice(value, {
    showCurrency,
    minimumFractionDigits,
    maximumFractionDigits
  });

  return (
    <span className={className}>
      {formattedValue}
    </span>
  );
}
