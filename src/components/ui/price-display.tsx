// @/components/ui/price-display.tsx
"use client";

import { cn } from "@/lib/utils";
import { formatPriceWithDiscount, calculateDiscountPercentage } from "@/lib/format-price";
import { Badge } from "@/components/ui/badge";

interface PriceDisplayProps {
  price: number;
  priceBeforeDiscount?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  showDiscountBadge?: boolean;
  layout?: "horizontal" | "vertical";
}

export function PriceDisplay({
  price,
  priceBeforeDiscount,
  className,
  size = "md",
  showDiscountBadge = false,
  layout = "horizontal"
}: PriceDisplayProps) {
  const { finalPrice, originalPrice, hasDiscount } = formatPriceWithDiscount(price, priceBeforeDiscount);
  const discountPercentage = hasDiscount && priceBeforeDiscount 
    ? calculateDiscountPercentage(priceBeforeDiscount, price) 
    : 0;

  const sizeClasses = {
    sm: {
      final: "text-sm font-semibold",
      original: "text-xs",
      badge: "text-xs px-1.5 py-0.5"
    },
    md: {
      final: "text-base font-semibold",
      original: "text-sm",
      badge: "text-xs px-2 py-1"
    },
    lg: {
      final: "text-xl font-bold",
      original: "text-base",
      badge: "text-sm px-2 py-1"
    }
  };

  const currentSizeClasses = sizeClasses[size];

  if (layout === "vertical") {
    return (
      <div className={cn("flex flex-col items-start gap-1", className)}>
        {hasDiscount && originalPrice && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-muted-foreground line-through",
              currentSizeClasses.original
            )}>
              {originalPrice}
            </span>
            {showDiscountBadge && discountPercentage > 0 && (
              <Badge variant="destructive" className={currentSizeClasses.badge}>
                -{discountPercentage}%
              </Badge>
            )}
          </div>
        )}
        <span className={cn(
          "text-foreground",
          currentSizeClasses.final
        )}>
          {finalPrice}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {hasDiscount && originalPrice && (
        <span className={cn(
          "text-muted-foreground line-through",
          currentSizeClasses.original
        )}>
          {originalPrice}
        </span>
      )}
      <span className={cn(
        "text-foreground",
        currentSizeClasses.final
      )}>
        {finalPrice}
      </span>
      {showDiscountBadge && hasDiscount && discountPercentage > 0 && (
        <Badge variant="destructive" className={currentSizeClasses.badge}>
          -{discountPercentage}%
        </Badge>
      )}
    </div>
  );
}

// Componente específico para tabelas
export function TablePriceDisplay({
  price,
  priceBeforeDiscount,
  className
}: {
  price: number;
  priceBeforeDiscount?: number | null;
  className?: string;
}) {
  return (
    <PriceDisplay
      price={price}
      priceBeforeDiscount={priceBeforeDiscount}
      size="sm"
      layout="vertical"
      showDiscountBadge={true}
      className={className}
    />
  );
}

// Componente específico para cards de planos
export function CardPriceDisplay({
  price,
  priceBeforeDiscount,
  className
}: {
  price: number;
  priceBeforeDiscount?: number | null;
  className?: string;
}) {
  return (
    <PriceDisplay
      price={price}
      priceBeforeDiscount={priceBeforeDiscount}
      size="lg"
      layout="vertical"
      showDiscountBadge={true}
      className={className}
    />
  );
}