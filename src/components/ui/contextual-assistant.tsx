// @/components/ui/contextual-assistant.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string; // Seletor CSS do elemento alvo
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ContextualAssistantProps {
  pageId: string;
  steps: TourStep[];
  autoStart?: boolean;
  className?: string;
}

const STORAGE_KEY = 'hub_control_tours_completed';

function getCompletedTours(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const completed = localStorage.getItem(STORAGE_KEY);
    return completed ? JSON.parse(completed) : [];
  } catch {
    return [];
  }
}

function markTourCompleted(pageId: string) {
  if (typeof window === 'undefined') return;
  
  try {
    const completed = getCompletedTours();
    if (!completed.includes(pageId)) {
      completed.push(pageId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }
  } catch {
    // Falha silenciosa
  }
}

function resetTours() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function ContextualAssistant({
  pageId,
  steps,
  autoStart = true,
  className
}: ContextualAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    const completedTours = getCompletedTours();
    const hasCompleted = completedTours.includes(pageId);
    setHasSeenTour(hasCompleted);
    
    if (!hasCompleted && autoStart && steps.length > 0) {
      // Pequeno delay para garantir que a página carregou
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [pageId, autoStart, steps.length]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    markTourCompleted(pageId);
    setHasSeenTour(true);
    setIsOpen(false);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  if (steps.length === 0) return null;

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      {/* Botão de ajuda sempre visível */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={hasSeenTour ? "outline" : "default"}
            size="sm"
            className={cn(
              "rounded-full shadow-lg transition-all duration-200",
              !hasSeenTour && "bg-primary text-primary-foreground"
            )}
            onClick={() => {
              if (hasSeenTour) {
                handleRestart();
              } else {
                setIsOpen(true);
              }
            }}
          >
            {hasSeenTour ? (
              <HelpCircle className="h-4 w-4" />
            ) : (
              <Lightbulb className="h-4 w-4" />
            )}
            {!hasSeenTour && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                !
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-80 p-0" 
          side="left" 
          align="end"
          sideOffset={10}
        >
          {currentStepData && (
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {currentStep + 1} de {steps.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-1 mb-4">
                <div 
                  className="bg-primary h-1 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">
                  {currentStepData.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentStepData.content}
                </p>
                
                {/* Action button se disponível */}
                {currentStepData.action && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={currentStepData.action.onClick}
                    className="w-full"
                  >
                    {currentStepData.action.label}
                  </Button>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Pular tour
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className={isLastStep ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {isLastStep ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Concluir
                      </>
                    ) : (
                      <>
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Hook para gerenciar tours
export function useTour(pageId: string) {
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    const completedTours = getCompletedTours();
    setHasSeenTour(completedTours.includes(pageId));
  }, [pageId]);

  const markAsCompleted = () => {
    markTourCompleted(pageId);
    setHasSeenTour(true);
  };

  const resetTour = () => {
    const completedTours = getCompletedTours();
    const filtered = completedTours.filter(id => id !== pageId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    setHasSeenTour(false);
  };

  return {
    hasSeenTour,
    markAsCompleted,
    resetTour,
    resetAllTours: resetTours
  };
}
