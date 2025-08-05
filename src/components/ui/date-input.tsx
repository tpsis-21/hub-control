"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createBrazilDate, formatBrazilDate, fromBrazilTime } from "@/lib/timezone"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

export interface DateInputProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
}

export function DateInput({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled,
  className,
}: DateInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  // Sincronizar o valor do input com a data selecionada
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd/MM/yyyy"))
    } else {
      setInputValue("")
    }
  }, [value])

  const formatDateInput = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Aplica a máscara dd/mm/aaaa
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const formattedValue = formatDateInput(rawValue)
    setInputValue(formattedValue)

    // Tentar fazer parse da data conforme o usuário digita
    if (formattedValue.length === 10) { // dd/MM/yyyy
      try {
        const parsedDate = parse(formattedValue, "dd/MM/yyyy", new Date())
        if (isValid(parsedDate)) {
          // Criar data no fuso horário de Brasília
          const brazilDate = createBrazilDate(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())
          onChange?.(brazilDate)
        }
      } catch {
        // Ignorar erros de parse
      }
    }
  }

  const handleInputBlur = () => {
    // Validar e formatar a data quando o usuário sair do campo
    if (inputValue) {
      try {
        const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date())
        if (isValid(parsedDate)) {
          // Criar data no fuso horário de Brasília
          const brazilDate = createBrazilDate(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())
          onChange?.(brazilDate)
          setInputValue(format(parsedDate, "dd/MM/yyyy"))
        } else {
          // Se a data for inválida, limpar o campo
          setInputValue("")
          onChange?.(undefined)
        }
      } catch {
        setInputValue("")
        onChange?.(undefined)
      }
    }
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      // Criar data no fuso horário de Brasília
      const brazilDate = createBrazilDate(date.getFullYear(), date.getMonth(), date.getDate())
      onChange?.(brazilDate)
    } else {
      onChange?.(undefined)
    }
    setIsOpen(false)
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        placeholder="dd/mm/aaaa"
        className="flex-1"
        maxLength={10}
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            disabled={disabled}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}