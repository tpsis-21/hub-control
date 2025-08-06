// @/app/(app)/clientes/import-customers-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { UploadCloud, File, Loader2, AlertTriangle, CheckCircle, Info, Download } from "lucide-react";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { importCustomersAction } from "./actions";
import type { Plan, Server } from "@/lib/types";
import type { z } from "zod";
import { importCustomerSchema } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";

// Cabeçalhos obrigatórios para importação de clientes via CSV/Excel
// planId deve ser o ID numérico de 2 dígitos (10-99)
// serverId deve ser o ID numérico de 2 dígitos (10-99) ou "none" para nenhum servidor
const expectedHeaders = ["name", "iptvUsername", "iptvPassword", "email", "whatsapp", "planId", "serverId", "notes"];

type ParsedData = z.infer<typeof importCustomerSchema>;
type ImportError = { line: number, message: string, data: any };

export function ImportCustomersDialog({ allPlans, allServers }: { allPlans: Plan[]; allServers: Server[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [importResult, setImportResult] = useState<{ successCount: number; failureCount: number; } | null>(null);

  const { toast } = useToast();

  // Função para gerar e baixar arquivo de exemplo CSV
  const downloadExampleCSV = () => {
    const exampleData = [
      expectedHeaders,
      [
        "João Silva",
        "joao123",
        "senha123",
        "joao@email.com",
        "5511999999999",
        allPlans[0]?.panelPlanId || "10",
        allServers[0]?.panelServerId || "none",
        "Cliente VIP - Renovação automática"
      ],
      [
        "Maria Santos",
        "maria456",
        "senha456",
        "maria@email.com",
        "5511888888888",
        allPlans[1]?.panelPlanId || "11",
        "none",
        "Cliente novo"
      ]
    ];
    
    const csv = Papa.unparse(exampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo-importacao-clientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Arquivo baixado!",
      description: "Exemplo de CSV baixado com sucesso.",
    });
  };

  // Função para gerar e baixar arquivo de exemplo Excel
  const downloadExampleExcel = () => {
    const exampleData = [
      expectedHeaders,
      [
        "João Silva",
        "joao123",
        "senha123",
        "joao@email.com",
        "5511999999999",
        allPlans[0]?.panelPlanId || "10",
        allServers[0]?.panelServerId || "none",
        "Cliente VIP - Renovação automática"
      ],
      [
        "Maria Santos",
        "maria456",
        "senha456",
        "maria@email.com",
        "5511888888888",
        allPlans[1]?.panelPlanId || "11",
        "none",
        "Cliente novo"
      ]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "exemplo-importacao-clientes.xlsx");
    
    toast({
      title: "Arquivo baixado!",
      description: "Exemplo de Excel baixado com sucesso.",
    });
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setImportResult(null);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
        
        if (fileExtension === 'csv') {
            parseCsv(selectedFile);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            parseExcel(selectedFile);
        } else {
            toast({
                title: "Formato não suportado",
                description: "Por favor, selecione um arquivo CSV ou Excel (.xlsx/.xls)",
                variant: "destructive",
            });
            resetState();
        }
    }
  };

  const parseCsv = (fileToParse: File) => {
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        if (JSON.stringify(headers.sort()) !== JSON.stringify([...expectedHeaders].sort())) {
             toast({
                title: "Erro no Cabeçalho do CSV",
                description: `O cabeçalho do arquivo não corresponde ao esperado. Verifique o modelo. Esperado: ${expectedHeaders.join(', ')}`,
                variant: "destructive",
                duration: 8000
            });
            resetState();
        } else {
            setParsedData(results.data as ParsedData[]);
        }
      },
      error: (error: any) => {
        toast({
            title: "Erro ao ler o arquivo",
            description: error.message,
            variant: "destructive",
        });
        resetState();
      },
    });
  };

  const parseExcel = (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          toast({
            title: "Arquivo vazio",
            description: "O arquivo Excel não contém dados.",
            variant: "destructive",
          });
          resetState();
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1);
        
        if (JSON.stringify(headers.sort()) !== JSON.stringify([...expectedHeaders].sort())) {
          toast({
            title: "Erro no Cabeçalho do Excel",
            description: `O cabeçalho do arquivo não corresponde ao esperado. Verifique o modelo. Esperado: ${expectedHeaders.join(', ')}`,
            variant: "destructive",
            duration: 8000
          });
          resetState();
          return;
        }
        
        // Converter dados para o formato esperado
        const parsedRows = (rows as any[][])
          .filter((row: any[]) => row.some((cell: any) => cell !== null && cell !== undefined && cell !== ''))
          .map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
        
        setParsedData(parsedRows as ParsedData[]);
      } catch (error) {
        toast({
          title: "Erro ao ler o arquivo Excel",
          description: "Não foi possível processar o arquivo Excel. Verifique se o arquivo não está corrompido.",
          variant: "destructive",
        });
        resetState();
      }
    };
    reader.readAsArrayBuffer(fileToParse);
  };

  const handleImport = () => {
    if (parsedData.length === 0) {
        toast({ title: "Nenhum dado para importar.", variant: "destructive" });
        return;
    }
    startTransition(async () => {
      const result = await importCustomersAction(parsedData, allPlans);
      setImportResult({ successCount: result.successCount, failureCount: result.failureCount });
      setErrors(result.errors);
      toast({
        title: "Importação Concluída!",
        description: `${result.successCount} clientes importados com sucesso e ${result.failureCount} falharam.`,
      });
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
      if (!isOpen) {
          resetState();
      }
      setOpen(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadCloud className="mr-2 h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Clientes via CSV</DialogTitle>
           {importResult === null && (
            <DialogDescription>
                Selecione um arquivo CSV para importar múltiplos clientes de uma vez.
            </DialogDescription>
           )}
        </DialogHeader>

        {importResult ? (
            <div className="space-y-4">
                <Alert variant={importResult.failureCount > 0 ? "destructive" : "default"} className={importResult.failureCount === 0 ? 'bg-green-50 border-green-200' : ''}>
                    {importResult.failureCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    <AlertTitle>Importação Finalizada</AlertTitle>
                    <AlertDescription>
                       <p>{importResult.successCount} clientes importados com sucesso.</p>
                       <p>{importResult.failureCount} linhas falharam na importação.</p>
                    </AlertDescription>
                </Alert>
                {errors.length > 0 && (
                    <div>
                        <h4 className="font-medium mb-2">Detalhes dos Erros:</h4>
                         <ScrollArea className="h-64">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Linha</TableHead>
                                        <TableHead>Erro</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {errors.map((err, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{err.line}</TableCell>
                                            <TableCell className="text-xs">{err.message}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}
                 <DialogFooter className="pt-4">
                    <Button onClick={() => handleOpenChange(false)}>Fechar</Button>
                </DialogFooter>
            </div>
        ) : (
            <div className="space-y-4">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Formato do Arquivo (CSV ou Excel)</AlertTitle>
                    <AlertDescription>
                        <p>O arquivo deve ser um CSV ou Excel (.xlsx/.xls) com os seguintes cabeçalhos (em qualquer ordem):</p>
                        <code className="text-xs font-mono mt-2 block bg-muted p-2 rounded-md">{expectedHeaders.join(", ")}</code>
                        <div className="mt-3 space-y-2">
                            <p className="font-medium">Informações importantes:</p>
                            <ul className="text-xs space-y-1 ml-4">
                                <li>• <strong>planId:</strong> Use APENAS o ID numérico de 2 dígitos do plano (ex: 10, 25, 99)</li>
                                <li>• <strong>serverId:</strong> Use APENAS o ID numérico de 2 dígitos do servidor ou "none" para nenhum servidor</li>
                                <li>• <strong>notes:</strong> Campo opcional para observações sobre o cliente</li>
                            </ul>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                            <p className="font-medium text-sm">📥 Baixar arquivos de exemplo:</p>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={downloadExampleCSV}
                                    className="text-xs"
                                >
                                    <Download className="mr-1 h-3 w-3" />
                                    Exemplo CSV
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={downloadExampleExcel}
                                    className="text-xs"
                                >
                                    <Download className="mr-1 h-3 w-3" />
                                    Exemplo Excel
                                </Button>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                                <p className="font-medium text-xs mb-2">📋 Planos disponíveis (use APENAS o ID de 2 dígitos):</p>
                                <div className="max-h-20 overflow-y-auto bg-muted/50 p-2 rounded text-xs">
                                    {allPlans.length > 0 ? (
                                        allPlans.map(plan => (
                                            <div key={plan.id} className="flex justify-between py-1">
                                                <span className="truncate">{plan.name}</span>
                                                <code className="bg-background px-1 rounded font-bold text-green-600">
                                                    {plan.panelPlanId || 'ID não definido'}
                                                </code>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground">Nenhum plano encontrado</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="font-medium text-xs mb-2">🖥️ Servidores disponíveis (use APENAS o ID de 2 dígitos ou "none"):</p>
                                <div className="max-h-20 overflow-y-auto bg-muted/50 p-2 rounded text-xs">
                                    <div className="flex justify-between py-1">
                                        <span className="text-orange-600 font-medium">Nenhum servidor</span>
                                        <code className="bg-background px-1 rounded font-bold text-orange-600">none</code>
                                    </div>
                                    {allServers.length > 0 ? (
                                        allServers.map(server => (
                                            <div key={server.id} className="flex justify-between py-1">
                                                <span className="truncate">{server.name}</span>
                                                <code className="bg-background px-1 rounded font-bold text-blue-600">
                                                    {server.panelServerId || 'ID não definido'}
                                                </code>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground">Nenhum servidor encontrado</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="font-medium text-xs mb-1">💡 Exemplo de linha CSV/Excel completa:</p>
                            <code className="text-xs bg-muted/50 p-2 rounded block">
                                João Silva,joao123,senha123,joao@email.com,5511999999999,{allPlans[0]?.panelPlanId || '25'},{allServers[0]?.panelServerId || 'none'},Cliente VIP - Renovação automática
                            </code>
                            <p className="text-xs text-muted-foreground mt-1">
                                ⚠️ <strong>Importante:</strong> Use APENAS os IDs numéricos de 2 dígitos (planos e servidores), não os UUIDs!
                            </p>
                        </div>
                    </AlertDescription>
                </Alert>

                <div className="flex items-center justify-center w-full">
                    <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Clique para carregar</span> ou arraste e solte
                            </p>
                            <p className="text-xs text-muted-foreground">Arquivo CSV (máx. 2MB)</p>
                        </div>
                        <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                    </label>
                </div>
                
                {file && (
                     <div className="p-4 border rounded-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-medium">
                                <File className="h-5 w-5" />
                                <span>{file.name}</span>
                            </div>
                            <Badge variant="secondary">{parsedData.length} linhas encontradas</Badge>
                        </div>
                    </div>
                )}
               
                {parsedData.length > 0 && (
                    <div>
                        <h4 className="font-medium mb-2">Pré-visualização dos Dados (primeiras 5 linhas)</h4>
                        <ScrollArea className="h-64">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {Object.keys(parsedData[0]).map(header => <TableHead key={header}>{header}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedData.slice(0, 5).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                            {Object.values(row).map((cell, cellIndex) => (
                                                <TableCell key={cellIndex} className="text-xs">{String(cell)}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={handleImport} disabled={isPending || parsedData.length === 0}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isPending ? "Importando..." : "Importar Clientes"}
                    </Button>
                </DialogFooter>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
