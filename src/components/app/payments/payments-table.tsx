// @/components/app/payments/payments-table.tsx
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, Clock, XCircle, AlertTriangle, Play } from "lucide-react";
import { FormattedDate } from "@/components/app/formatted-date";
import { FormattedCurrency } from "@/components/ui/formatted-currency";
import { updatePaymentStatus, activatePayment } from "@/app/(app)/pagamentos/actions";
import { useToast } from "@/hooks/use-toast";
import type { Payment } from "@/lib/types";

interface PaymentsTableProps {
  payments: Payment[];
  onPaymentUpdate?: () => void;
  showActions?: boolean;
}

const statusConfig = {
  'Aguardando': {
    label: 'Aguardando',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-yellow-600'
  },
  'Confirmado': {
    label: 'Confirmado',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-blue-600'
  },
  'Recusado': {
    label: 'Recusado',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600'
  },
  'Pendente de ativação manual': {
    label: 'Pendente Ativação',
    variant: 'outline' as const,
    icon: AlertTriangle,
    color: 'text-orange-600'
  },
  'Ativado': {
    label: 'Ativado',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600'
  },
  'Pago': {
    label: 'Pago',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600'
  },
  'Pendente': {
    label: 'Pendente',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-yellow-600'
  },
  'Atrasado': {
    label: 'Atrasado',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600'
  }
};

const paymentTypeConfig = {
  'pix': 'PIX',
  'credit_card': 'Cartão de Crédito',
  'bank_transfer': 'Transferência',
  'cash': 'Dinheiro',
  'other': 'Outro'
};

export function PaymentsTable({ payments, onPaymentUpdate, showActions = false }: PaymentsTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStatusUpdate = async (paymentId: string, newStatus: string) => {
    setLoading(paymentId);
    try {
      const result = await updatePaymentStatus(paymentId, newStatus as any);
      if (result.success) {
        toast({
          title: "Status atualizado",
          description: "O status do pagamento foi atualizado com sucesso.",
        });
        onPaymentUpdate?.();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleActivatePayment = async (paymentId: string) => {
    setLoading(paymentId);
    try {
      const result = await activatePayment(paymentId);
      if (result.success) {
        toast({
          title: "Pagamento ativado",
          description: "O pagamento foi ativado e o cliente foi notificado.",
        });
        onPaymentUpdate?.();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao ativar pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: 'secondary' as const,
      icon: Clock,
      color: 'text-gray-600'
    };

    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className={`w-3 h-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum pagamento encontrado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Servidor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="w-[70px]">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                <FormattedDate 
                  dateString={payment.date} 
                  format="dd/MM/yyyy HH:mm" 
                />
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{payment.client?.name || 'N/A'}</p>
                  {payment.client?.whatsapp && (
                    <p className="text-sm text-muted-foreground">
                      {payment.client.whatsapp}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{payment.plan?.name || 'N/A'}</p>
                  {payment.plan?.price && (
                    <p className="text-sm text-muted-foreground">
                      <FormattedCurrency value={payment.plan.price} />
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {payment.server?.name || 'Manual'}
              </TableCell>
              <TableCell>
                {paymentTypeConfig[payment.payment_type as keyof typeof paymentTypeConfig] || payment.payment_type || 'N/A'}
              </TableCell>
              <TableCell>
                <FormattedCurrency value={payment.amount} />
              </TableCell>
              <TableCell>
                {getStatusBadge(payment.status)}
              </TableCell>
              {showActions && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="px-2"
                        disabled={loading === payment.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {payment.status === 'Pendente de ativação manual' && (
                        <DropdownMenuItem
                          onClick={() => handleActivatePayment(payment.id)}
                          className="text-green-600"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Ativar Pagamento
                        </DropdownMenuItem>
                      )}
                      {payment.status === 'Confirmado' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(payment.id, 'Ativado')}
                          className="text-green-600"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marcar como Ativado
                        </DropdownMenuItem>
                      )}
                      {payment.status === 'Aguardando' && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(payment.id, 'Confirmado')}
                            className="text-blue-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirmar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusUpdate(payment.id, 'Recusado')}
                            className="text-red-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Recusar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
