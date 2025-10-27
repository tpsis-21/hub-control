// @/lib/format-price.ts

/**
 * Formata um valor numérico para o formato de moeda brasileira
 * @param value - Valor numérico a ser formatado
 * @param options - Opções de formatação
 * @returns String formatada como moeda brasileira
 */
export function formatPrice(value: number, options?: {
  showCurrency?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}): string {
  const {
    showCurrency = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options || {};

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: showCurrency ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits,
    maximumFractionDigits
  });

  return formatter.format(value);
}

/**
 * Formata um preço com desconto, exibindo o preço original riscado e o preço final
 * @param price - Preço final
 * @param priceBeforeDiscount - Preço original (opcional)
 * @returns Objeto com as strings formatadas
 */
export function formatPriceWithDiscount(price: number, priceBeforeDiscount?: number | null) {
  const finalPrice = formatPrice(price);
  const originalPrice = priceBeforeDiscount ? formatPrice(priceBeforeDiscount) : null;
  
  return {
    finalPrice,
    originalPrice,
    hasDiscount: !!priceBeforeDiscount && priceBeforeDiscount > price
  };
}

/**
 * Calcula a porcentagem de desconto
 * @param originalPrice - Preço original
 * @param finalPrice - Preço final
 * @returns Porcentagem de desconto arredondada
 */
export function calculateDiscountPercentage(originalPrice: number, finalPrice: number): number {
  if (originalPrice <= finalPrice) return 0;
  return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
}
