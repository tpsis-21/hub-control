import { cn } from "@/lib/utils"

// Componente Skeleton utilizado como placeholder visual durante carregamentos de conteúdo
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
