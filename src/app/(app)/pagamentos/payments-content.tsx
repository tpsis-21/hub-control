// @/app/(app)/pagamentos/payments-content.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { PaymentsTable } from "@/components/app/payments/payments-table";
import { getPayments } from "./actions";
import type { Payment } from "@/lib/types";

interface PaymentsContentProps {
  initialPayments: Payment[];
}

export function PaymentsContent({ initialPayments }: PaymentsContentProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>(initialPayments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, typeFilter]);

  const filterPayments = () => {
    let filtered = payments;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_type === typeFilter);
    }

    setFilteredPayments(filtered);
  };

  const handlePaymentUpdate = async () => {
    setLoading(true);
    try {
      const updatedPayments = await getPayments();
      setPayments(updatedPayments);
    } catch (error) {
      console.error('Erro ao recarregar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar pagamentos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, plano, servidor ou ID da transação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Aguardando">Aguardando</SelectItem>
                <SelectItem value="Confirmado">Confirmado</SelectItem>
                <SelectItem value="Recusado">Recusado</SelectItem>
                <SelectItem value="Pendente de ativação manual">Pendente Ativação</SelectItem>
                <SelectItem value="Ativado">Ativado</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="bank_transfer">Transferência</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pagamentos</CardTitle>
          <CardDescription>
            {filteredPayments.length} pagamento(s) encontrado(s)
            {loading && " • Atualizando..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsTable 
            payments={filteredPayments} 
            onPaymentUpdate={handlePaymentUpdate}
            showActions={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
