/**
 * API unificada de toasts — use em código novo.
 * - Componentes client: preferir `useToast()` de @/hooks/use-toast (shadcn)
 * - Chamadas imperativas / módulos legado: `appToast` (sonner)
 */
import { toast as sonnerToast } from "sonner";

export type AppToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export const appToast = {
  success(title: string, description?: string) {
    sonnerToast.success(title, { description });
  },
  error(title: string, description?: string) {
    sonnerToast.error(title, { description });
  },
  warning(title: string, description?: string) {
    sonnerToast.warning(title, { description });
  },
  message(title: string, description?: string) {
    sonnerToast(title, { description });
  },
  fromShadcn({ title, description, variant }: AppToastOptions) {
    if (variant === "destructive") {
      sonnerToast.error(title ?? "Erro", { description });
    } else {
      sonnerToast.success(title ?? "Sucesso", { description });
    }
  },
  loading(title: string, options?: { id?: string; description?: string }) {
    return sonnerToast.loading(title, {
      id: options?.id,
      description: options?.description,
    });
  },
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
};

export { toast as sonnerToast } from "sonner";
