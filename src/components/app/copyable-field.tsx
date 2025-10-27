// @/components/app/copyable-field.tsx
"use client";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CopyableFieldProps = {
    icon: LucideIcon;
    label?: string;
    value: string;
    className?: string;
};

export function CopyableField({ icon: Icon, label, value, className }: CopyableFieldProps) {
    const { toast } = useToast();

    const handleCopy = (textToCopy: string, fieldName: string) => {
        navigator.clipboard.writeText(textToCopy);
        toast({
            title: "Copiado!",
            description: `${fieldName} copiado para a área de transferência.`,
        });
    };

    return (
        <div className={cn("flex items-center gap-3 text-sm group", className)}>
            <Icon className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
                {label && <p className="text-xs text-muted-foreground">{label}</p>}
                <span className="font-mono text-sm">{value}</span>
            </div>
            <button
                onClick={() => handleCopy(value, label || 'Valor')}
                className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            >
                <Copy className="w-4 h-4 text-muted-foreground" />
                <span className="sr-only">Copiar {label}</span>
            </button>
        </div>
    );
}

