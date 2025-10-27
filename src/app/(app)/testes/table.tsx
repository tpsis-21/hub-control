// @/app/(app)/testes/table.tsx
"use client";

import { useState, useTransition, useCallback } from "react"
import Link from "next/link"
import { MoreHorizontal, User, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { parseISO, isPast } from "date-fns"
import { Client, Plan, Server } from "@/lib/types"

import { DeleteTestDialog } from "./delete-test-dialog"
import { AddTestForm } from "./add-test-form"
import { ConvertTestButton } from "./convert-test-button"
import { FormattedDate } from "@/components/app/formatted-date"
import { useToast } from "@/hooks/use-toast"
import { deleteTestAction } from "./supabase-actions"


const statusConfig = {
  'Em teste': { color: 'bg-yellow-500', text: 'Em teste' },
  'Expirado': { color: 'bg-gray-500', text: 'Expirado' },
};

// Função local para determinar o status do cliente
const getStatus = (customer: Client) => {
  const expirationDate = parseISO(customer.expirationDate);
  const isExpired = isPast(expirationDate);
  
  if (isExpired) {
    return statusConfig['Expirado'];
  }
  
  return statusConfig['Em teste'];
};





type TestesTableProps = {
    customers: Client[];
    allPlans: Plan[];
    allServers: Server[];
}

export function TestesTable({ customers, allPlans, allServers }: TestesTableProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedTest, setSelectedTest] = useState<Client | null>(null)

    const getPlan = useCallback((planId: string) => {
        return allPlans.find(p => p.id === planId)
    }, [allPlans])

    const getServerName = useCallback((serverId?: string) => {
        return allServers.find(s => s.id === serverId)?.name || 'Manual'
    }, [allServers])

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Gerenciamento de Testes</CardTitle>
                        <CardDescription>
                            Visualize e gerencie todos os seus usuários em período de teste.
                        </CardDescription>
                    </div>
                    <AddTestForm plans={allPlans} servers={allServers} />
                </div>
            </CardHeader>
            <CardContent>
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuário</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Servidor</TableHead>
                                <TableHead>Data de Expiração</TableHead>
                                <TableHead>
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.map((customer) => {
                                const status = getStatus(customer)
                                if (!status) return null

                                const plan = getPlan(customer.planId)
                                const isExpired = status.text === 'Expirado'

                                return (
                                    <TableRow key={customer.id}>
                                        <TableCell>
                                            <Link href={`/testes/${customer.id}`} className="flex items-center gap-3 hover:underline group">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-medium group-hover:text-primary">{customer.name}</p>
                                                    <p className="text-sm text-muted-foreground">{customer.iptvUsername}</p>
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="flex w-fit items-center gap-2">
                                                <span className={cn("h-2 w-2 rounded-full", status.color)}></span>
                                                {status.text}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getServerName(customer.serverId)}</TableCell>
                                        <TableCell><FormattedDate dateString={customer.expirationDate} format="dd/MM/yyyy HH:mm" /></TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/testes/${customer.id}`}>Ver Detalhes</Link>
                                                    </DropdownMenuItem>
                                                    {!isExpired && (
                                                        <ConvertTestButton customer={customer} plan={plan} />
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                        onSelect={() => {
                                                            setSelectedTest(customer)
                                                            setIsDeleteDialogOpen(true)
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir Teste
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                    {selectedTest && (
                        <DeleteTestDialog
                            customerId={selectedTest.id}
                            customerName={selectedTest.name}
                            onOpenChange={setIsDeleteDialogOpen}
                        />
                    )}
                </AlertDialog>
                {customers.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                        Nenhum teste encontrado.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

