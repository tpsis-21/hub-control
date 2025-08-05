"use client";

import { useState, useTransition, useCallback, ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Search, Filter, Trash2, Loader2 } from "lucide-react";
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
  DropdownMenuCheckboxItem,
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
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
};

type Action<T> = {
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
  disabled?: (item: T) => boolean;
  component?: (item: T) => ReactNode;
};

type Filter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

type BaseTableProps<T> = {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  addButton?: ReactNode;
  onDelete?: (item: T) => Promise<{ success: boolean; error?: string }>;
  getItemName?: (item: T) => string;
  emptyMessage?: string;
  className?: string;
  filters?: Filter[];
};

export function BaseTable<T extends { id: string }>({ 
  title,
  description,
  data,
  columns,
  actions = [],
  searchPlaceholder = "Buscar...",
  searchKey,
  addButton,
  onDelete,
  getItemName,
  emptyMessage = "Nenhum item encontrado.",
  className,
  filters = []
}: BaseTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Filtrar dados baseado na busca
  const filteredData = data.filter(item => {
    if (!searchTerm || !searchKey) return true;
    const searchValue = String(item[searchKey]).toLowerCase();
    return searchValue.includes(searchTerm.toLowerCase());
  });

  const handleDelete = () => {
    if (!selectedItem || !onDelete) return;
    
    startTransition(async () => {
      const result = await onDelete(selectedItem);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: `${getItemName?.(selectedItem) || 'Item'} excluído com sucesso.`,
        });
      } else {
        toast({
          title: "Erro",
          description: result.error || "Não foi possível excluir o item.",
          variant: "destructive",
        });
      }
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          {addButton}
        </div>
        
        {/* Barra de busca e filtros */}
        {(searchKey || filters.length > 0) && (
          <div className="flex items-center space-x-2">
            {searchKey && (
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            )}
            {filters.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {filters.map((filter) => (
                    <div key={filter.key}>
                      <DropdownMenuLabel>{filter.label}</DropdownMenuLabel>
                      {filter.options.map((option) => (
                        <DropdownMenuCheckboxItem key={option.value}>
                          {option.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                      <DropdownMenuSeparator />
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                {actions.length > 0 && (
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render(item)}
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="px-2">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          {actions.map((action, index) => {
                            const isDisabled = action.disabled?.(item) || false;
                            
                            if (action.variant === 'destructive') {
                              return (
                                <div key={index}>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    disabled={isDisabled}
                                    onSelect={() => {
                                      setSelectedItem(item);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    {action.icon}
                                    {action.label}
                                  </DropdownMenuItem>
                                </div>
                              );
                            }
                            
                            // Support for custom component actions
                            if ('component' in action && action.component) {
                              return (
                                <div key={index}>
                                  {action.component(item)}
                                </div>
                              );
                            }
                            
                            return (
                              <DropdownMenuItem
                                key={index}
                                disabled={isDisabled}
                                onSelect={() => action.onClick(item)}
                              >
                                {action.icon}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Dialog de confirmação de exclusão */}
          {selectedItem && onDelete && (
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir {getItemName?.(selectedItem) || 'este item'}? 
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          )}
        </AlertDialog>
        
        {filteredData.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}