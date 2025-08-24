"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  priority?: 'high' | 'medium' | 'low'; // Para responsividade
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  title?: string;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  title,
  className,
  emptyMessage = "Nenhum item encontrado",
  loading = false,
  onRowClick,
  actions
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);

  const toggleRowExpansion = (id: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Colunas visíveis baseadas na prioridade e tamanho da tela
  const visibleColumns = isMobile 
    ? columns.filter(col => col.priority === 'high')
    : columns;

  const hiddenColumns = isMobile 
    ? columns.filter(col => col.priority !== 'high')
    : [];

  if (loading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isMobile) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-0">
          <div className="space-y-2">
            {sortedData.map((item) => {
              const id = item[keyField];
              const isExpanded = expandedRows.has(id);
              
              return (
                <div key={String(id)} className="border rounded-lg">
                  <div 
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        {visibleColumns.map((column) => {
                          const value = item[column.key];
                          const rendered = column.render ? column.render(value, item) : value;
                          
                          return (
                            <div key={String(column.key)} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-medium min-w-0">
                                {column.label}:
                              </span>
                              <span className="text-sm truncate">{rendered}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {actions && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {actions(item)}
                          </div>
                        )}
                        
                        {hiddenColumns.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && hiddenColumns.length > 0 && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {hiddenColumns.map((column) => {
                          const value = item[column.key];
                          const rendered = column.render ? column.render(value, item) : value;
                          
                          return (
                            <div key={String(column.key)} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-medium min-w-0">
                                {column.label}:
                              </span>
                              <span className="text-sm">{rendered}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop table
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className={cn(
                      column.sortable && "cursor-pointer hover:text-foreground",
                      column.className
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && sortConfig?.key === column.key && (
                        <span className="text-xs">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
                {actions && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item) => (
                <TableRow
                  key={String(item[keyField])}
                  className={cn(
                    "hover:bg-muted/50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => {
                    const value = item[column.key];
                    const rendered = column.render ? column.render(value, item) : value;
                    
                    return (
                      <TableCell key={String(column.key)} className={column.className}>
                        {rendered}
                      </TableCell>
                    );
                  })}
                  {actions && (
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        {actions(item)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Componentes auxiliares para renderização comum
export function StatusBadge({ status, variant }: { status: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }) {
  return <Badge variant={variant}>{status}</Badge>;
}

export function ActionButton({ onClick, children, variant = "ghost", size = "sm" }: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "lg";
}) {
  return (
    <Button variant={variant} size={size} onClick={onClick}>
      {children}
    </Button>
  );
}

// Componente simples para compatibilidade com código existente
export function SimpleResponsiveTable({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ScrollArea className="w-full">
        <div className="min-w-[600px]">
          <Table {...props}>
            {children}
          </Table>
        </div>
      </ScrollArea>
    );
  }

  return (
    <Table {...props}>
      {children}
    </Table>
  );
}