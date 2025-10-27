// @/app/(app)/financeiro/add-transaction-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { addFinancialTransaction, getFinancialCategories } from "./actions";
import { useToast } from "@/hooks/use-toast";

type AddTransactionFormProps = {
  type: 'receita' | 'despesa';
};

// Componente interno para controlar o estado do formulário
function SubmitButton({ type, bgColorClass }: { type: 'receita' | 'despesa', bgColorClass: string }) {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      disabled={pending}
      className={bgColorClass}
    >
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function AddTransactionForm({ type }: AddTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const categories = {
    receita: [
      'Assinaturas',
      'Renovações',
      'Upgrades',
      'Serviços Extras',
      'Outros'
    ],
    despesa: [
      'Servidores',
      'Licenças',
      'Marketing',
      'Suporte',
      'Infraestrutura',
      'Impostos',
      'Outros'
    ]
  };

  // Função para lidar com o sucesso/erro da Server Action
  const handleFormAction = async (formData: FormData) => {
    try {
      const result = await addFinancialTransaction(formData);
      setOpen(false);
      toast({
        title: "Sucesso",
        description: `${type === 'receita' ? 'Receita' : 'Despesa'} adicionada com sucesso`,
      });
      
      // Reset form
      const form = document.getElementById(`add-${type}-form`) as HTMLFormElement;
      if (form) form.reset();
      
      // Recarregar a página para atualizar os dados
      window.location.reload();
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao adicionar transação",
        variant: "destructive",
      });
    }
  };

  const Icon = type === 'receita' ? TrendingUp : TrendingDown;
  const colorClass = type === 'receita' ? 'text-green-600' : 'text-red-600';
  const bgColorClass = type === 'receita' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={bgColorClass}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar {type === 'receita' ? 'Receita' : 'Despesa'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${colorClass}`} />
            Adicionar {type === 'receita' ? 'Receita' : 'Despesa'}
          </DialogTitle>
          <DialogDescription>
            Registre uma nova {type === 'receita' ? 'receita' : 'despesa'} no sistema financeiro.
          </DialogDescription>
        </DialogHeader>
        
        <form id={`add-${type}-form`} action={handleFormAction} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              name="description"
              placeholder={`Descrição da ${type}`}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select name="category" required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories[type].map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Observações adicionais (opcional)"
              rows={3}
            />
          </div>
        </form>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <SubmitButton type={type} bgColorClass={bgColorClass} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
