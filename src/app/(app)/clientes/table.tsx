// @/app/(app)/clientes/table.tsx
"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, KeyRound, UserCheck, Trash2, Eye } from "lucide-react";
import type { Client, Plan, Server } from "@/lib/types";
import { AddCustomerForm } from "./add-customer-form";
import { EditCustomerForm } from "./edit-customer-form";
import { FormattedDate } from "@/components/app/formatted-date";
import { StatusBadge } from "@/components/ui/status-badge";
import { deleteCustomerAction, updateCustomerStatusAction } from "./actions";
import { ImportCustomersDialog } from "./import-customers-dialog";
import { BaseTable } from "@/components/ui/base-table";



type ClientesTableProps = {
    customers: Client[];
    allPlans: Plan[];
    allServers: Server[];
}

export function ClientesTable({ customers, allPlans, allServers }: ClientesTableProps) {
    const router = useRouter();

    const getPlanName = useCallback((planId: string) => {
        return allPlans.find(p => p.id === planId)?.name || 'N/A';
    }, [allPlans]);

    const handleStatusChange = async (customerId: string, newStatus: Client['status']) => {
        return await updateCustomerStatusAction(customerId, newStatus);
    };

    const handleDelete = async (customer: Client) => {
        return await deleteCustomerAction(customer.id);
    };

    const columns = [
        {
            key: 'cliente',
            label: 'Cliente',
            render: (customer: Client) => (
                <Link href={`/clientes/${customer.id}`} className="hover:underline group">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-medium group-hover:text-primary">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.iptvUsername}</p>
                            <div className="flex items-center gap-4 mt-1.5">
                                {customer.iptvUserId && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="ID IPTV">
                                        <KeyRound className="w-3 h-3"/>
                                        <span>{customer.iptvUserId}</span>
                                    </div>
                                )}
                                {customer.managerId && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="ID Gestor">
                                        <UserCheck className="w-3 h-3"/>
                                        <span>{customer.managerId}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (customer: Client) => (
                <StatusBadge 
                    customer={customer} 
                    onStatusChange={handleStatusChange}
                />
            ),
        },
        {
            key: 'plano',
            label: 'Plano',
            render: (customer: Client) => getPlanName(customer.planId),
        },
        {
            key: 'expiracao',
            label: 'Data de Expiração',
            render: (customer: Client) => (
                <FormattedDate dateString={customer.expirationDate} format="dd/MM/yyyy" />
            ),
        },
    ];

    const actions = [
        {
            label: 'Ver Perfil',
            icon: <Eye className="mr-2 h-4 w-4" />,
            onClick: (customer: Client) => router.push(`/clientes/${customer.id}`),
        },
        {
            label: 'Editar',
            component: (customer: Client) => (
                <EditCustomerForm customer={customer} plans={allPlans} servers={allServers}>
                    <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                        Editar
                    </button>
                </EditCustomerForm>
            ),
        },
        {
            label: 'Excluir',
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => {}, // Handled by BaseTable
            variant: 'destructive' as const,
        },
    ];

    const additionalButtons = (
        <div className="flex items-center gap-2">
            <ImportCustomersDialog allPlans={allPlans} allServers={allServers} />
            <AddCustomerForm plans={allPlans} servers={allServers} />
        </div>
    );

    return (
        <BaseTable
            title="Gerenciamento de Clientes"
            description="Visualize e gerencie todos os seus clientes ativos, inativos ou bloqueados."
            data={customers}
            columns={columns}
            actions={actions}
            searchPlaceholder="Buscar por nome, usuário, ID..."
            searchKey="name"
            addButton={additionalButtons}
            onDelete={handleDelete}
            getItemName={(customer) => customer.name}
            emptyMessage="Nenhum cliente encontrado."

        />
    );
}
