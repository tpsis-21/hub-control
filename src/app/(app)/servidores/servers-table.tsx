// @/app/(app)/servidores/servers-table.tsx
"use client";

import { MoreHorizontal, AlertTriangle, Bell, BookOpen, CreditCard, KeyRound, RefreshCw, Code, EyeOff, RadioTower, Tv, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddServerForm } from "./add-server-form";
import { EditServerForm } from "./edit-server-form";
import { deleteServerAction } from "./actions";
import { useTransition, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ServerIntegrationDialog } from "@/components/servers/server-integration-dialog";
import type { Server } from "@/lib/types";


const statusConfig = {
  'Online': { variant: 'success', text: 'Online' },
  'Offline': { variant: 'destructive', text: 'Offline' },
  'Instável': { variant: 'warning', text: 'Instável' },
} as const;


function DeleteServerDialog({ serverId, serverName, onOpenChange }: { serverId: string, serverName: string, onOpenChange: (open: boolean) => void }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteServerAction(serverId);
            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: "Servidor excluído.",
                });
                onOpenChange(false);
            } else {
                toast({
                    title: "Erro",
                    description: "Não foi possível excluir o servidor.",
                    variant: "destructive",
                });
            }
        });
    }

    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente o servidor <span className="font-bold">{serverName}</span> e suas configurações de automação.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                    {isPending ? "Excluindo..." : "Confirmar Exclusão"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );
}

const AutomationBadge = ({ Icon, text, enabled }: { Icon: React.ElementType, text: string, enabled: boolean }) => (
    <Badge variant={enabled ? 'secondary' : 'outline'} className={!enabled ? 'text-muted-foreground' : ''}>
        <Icon className="h-3 w-3 mr-1.5" />
        {text}
    </Badge>
)


export function ServersTable({ initialServers }: { initialServers: Server[] }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const router = useRouter();

  const getIntegrationIcon = (type: Server['integrationType']) => {
    switch (type) {
      case 'natv': return RadioTower;
      case 'pixbot': return Tv;
      case 'generic': return Code;
      default: return EyeOff;
    }
  }
   const getIntegrationName = (type: Server['integrationType']) => {
    switch (type) {
      case 'natv': return "NATV";
      case 'pixbot': return "Pixbot";
      case 'generic': return "Genérico";
      default: return "Manual";
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <AddServerForm />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Automações</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialServers.map((server) => {
                      const IntegrationIcon = getIntegrationIcon(server.integrationType);
                      return (
                        <TableRow key={server.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                  <IntegrationIcon className="h-5 w-5 text-muted-foreground"/>
                                  <div>
                                    <button
                                      onClick={() => router.push(`/servidores/${server.id}`)}
                                      className="text-left hover:text-hub-blue transition-colors hover:underline flex items-center gap-1 font-medium"
                                    >
                                      {server.name}
                                      <ExternalLink className="h-3 w-3 opacity-50" />
                                    </button>
                                    <p className="text-sm text-muted-foreground">{getIntegrationName(server.integrationType)}</p>
                                  </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={statusConfig[server.status].variant}>
                                    {server.status === 'Instável' && <AlertTriangle className="h-3 w-3 mr-1.5"/>}
                                    {statusConfig[server.status].text}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {server.integrationType === 'natv' ? (
                                  <div className="flex items-center gap-2">
                                    {server.credits !== null && server.credits !== undefined ? (
                                      <>
                                        <span className="font-medium text-lg">{server.credits.toLocaleString('pt-BR')}</span>
                                        <Badge 
                                          variant={
                                            server.credits >= 100 ? 'default' : 
                                            server.credits >= 50 ? 'secondary' : 
                                            server.credits >= 10 ? 'outline' : 'destructive'
                                          }
                                          className="text-xs"
                                        >
                                          {server.credits >= 100 ? 'Disponível' : 
                                           server.credits >= 50 ? 'Médio' : 
                                           server.credits >= 10 ? 'Baixo' : 'Crítico'}
                                        </Badge>
                                      </>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">Carregando...</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Manual</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <AutomationBadge Icon={KeyRound} text="Teste" enabled={server.testAutomation} />
                                  <AutomationBadge Icon={RefreshCw} text="Renovação" enabled={server.renewalAutomation} />
                                  <AutomationBadge Icon={CreditCard} text="Cobrança" enabled={server.paymentGateway} />
                                  <AutomationBadge Icon={Bell} text="Lembretes" enabled={server.sendExpirationReminder} />
                                  <AutomationBadge Icon={BookOpen} text="Instruções" enabled={server.sendUsageInstructions} />
                                </div>
                            </TableCell>
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
                                <DropdownMenuItem onClick={() => router.push(`/servidores/${server.id}`)}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Ver Detalhes
                                </DropdownMenuItem>
                                <EditServerForm server={server}>
                                    <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">Editar</button>
                                </EditServerForm>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    onSelect={() => {
                                        setSelectedServer(server);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >Excluir</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
            </Table>
            {selectedServer && <DeleteServerDialog serverId={selectedServer.id} serverName={selectedServer.name} onOpenChange={setIsDeleteDialogOpen} />}
        </AlertDialog>
         {initialServers.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
                Nenhum servidor encontrado. Clique em &quot;Adicionar Servidor&quot; para começar.
            </div>
         )}
      </div>
    </>
  );
}
