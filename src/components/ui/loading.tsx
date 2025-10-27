import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";

interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "pulse";
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12"
};

function SpinnerLoader({ size = "md", className }: { size: LoadingProps["size"]; className?: string }) {
  return (
    <Loader2 
      className={cn("animate-spin", sizeClasses[size!], className)} 
      role="status"
      aria-label="Carregando..."
    />
  );
}

function DotsLoader({ size = "md", className }: { size: LoadingProps["size"]; className?: string }) {
  const dotSize = size === "sm" ? "w-1 h-1" : size === "lg" ? "w-3 h-3" : size === "xl" ? "w-4 h-4" : "w-2 h-2";
  
  return (
    <div className={cn("flex space-x-1", className)} role="status" aria-label="Carregando...">
      <div className={cn("bg-current rounded-full animate-bounce", dotSize)} style={{ animationDelay: "0ms" }} />
      <div className={cn("bg-current rounded-full animate-bounce", dotSize)} style={{ animationDelay: "150ms" }} />
      <div className={cn("bg-current rounded-full animate-bounce", dotSize)} style={{ animationDelay: "300ms" }} />
    </div>
  );
}

function PulseLoader({ size = "md", className }: { size: LoadingProps["size"]; className?: string }) {
  return (
    <div 
      className={cn("rounded-full bg-current animate-pulse", sizeClasses[size!], className)} 
      role="status"
      aria-label="Carregando..."
    />
  );
}

export function Loading({ 
  size = "md", 
  variant = "spinner", 
  text, 
  className, 
  fullScreen = false 
}: LoadingProps) {
  const LoaderComponent = {
    spinner: SpinnerLoader,
    dots: DotsLoader,
    pulse: PulseLoader
  }[variant];

  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-2",
      fullScreen && "min-h-screen",
      className
    )}>
      <LoaderComponent size={size} className="text-primary" />
      {text && (
        <p className={cn(
          "text-muted-foreground",
          size === "sm" ? "text-xs" : size === "lg" ? "text-base" : size === "xl" ? "text-lg" : "text-sm"
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

// Componentes específicos para casos comuns
export function LoadingSpinner({ size = "md", className }: { size?: LoadingProps["size"]; className?: string }) {
  return <Loading variant="spinner" size={size} className={className} />;
}

export function LoadingDots({ size = "md", className }: { size?: LoadingProps["size"]; className?: string }) {
  return <Loading variant="dots" size={size} className={className} />;
}

export function LoadingPage({ text = "Carregando..." }: { text?: string }) {
  return <Loading variant="spinner" size="lg" text={text} fullScreen />;
}

interface LoadingButtonProps extends Omit<ButtonProps, 'disabled'> {
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, disabled = false, children, className, ...props }, ref) => {
    const isDisabled = loading || disabled;
    
    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        className={cn("flex items-center gap-2", className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 
              className="h-4 w-4 animate-spin" 
              role="status"
              aria-label="Carregando..."
            />
            {loadingText ? loadingText : children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";
