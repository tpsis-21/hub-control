// @/app/(app)/ajuda/edit-article-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { editArticleAction } from "./actions";
import { Textarea } from "@/components/ui/textarea";
import { editArticleSchema } from "@/lib/schemas";
import { Switch } from "@/components/ui/switch";
import { HtmlEditor } from "@/components/ui/html-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { getServers } from "@/app/(app)/servidores/actions";
import type { KnowledgeBaseArticle, Server } from "@/lib/types";

type EditArticleFormProps = {
    article: KnowledgeBaseArticle;
    children: React.ReactNode;
}

export function EditArticleForm({ article, children }: EditArticleFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [servers, setServers] = useState<Server[]>([]);
  const { toast } = useToast();

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && servers.length === 0) {
      const serverList = await getServers();
      setServers(serverList);
    }
  };

  const form = useForm<z.infer<typeof editArticleSchema>>({
    resolver: zodResolver(editArticleSchema),
    defaultValues: {
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category,
      isPublic: article.isPublic,
      serverIds: article.serverIds || [],
      visibleToAllServers: article.visibleToAllServers ?? true,
    },
  });

  function onSubmit(values: z.infer<typeof editArticleSchema>) {
    startTransition(async () => {
      const result = await editArticleAction(values);
      if (result.success && result.article) {
        toast({
          title: "Sucesso!",
          description: `Artigo "${result.article.title}" atualizado.`,
        });
        setOpen(false);
      } else {
         toast({
          title: "Erro",
          description: "Não foi possível atualizar o artigo.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Artigo</DialogTitle>
          <DialogDescription>
            Atualize os dados do artigo da base de conhecimento.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Como instalar na Smart TV?" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Conteúdo</FormLabel>
                    <FormControl>
                        <HtmlEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Digite o conteúdo do artigo..."
                        className="min-h-[200px]"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="FAQ">Perguntas Frequentes (FAQ)</SelectItem>
                        <SelectItem value="Tutoriais">Tutoriais</SelectItem>
                        <SelectItem value="Solução de Problemas">Solução de Problemas</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
              control={form.control}
              name="visibleToAllServers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Visível em Todos os Servidores</FormLabel>
                    <FormDescription>
                      Se ativado, o artigo será visível para todos os servidores.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!form.watch('visibleToAllServers') && (
              <FormField
                control={form.control}
                name="serverIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servidores Específicos</FormLabel>
                    <FormDescription>
                      Selecione os servidores onde este artigo será visível.
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {servers.map((server) => (
                        <div key={server.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={server.id}
                            checked={field.value?.includes(server.id) || false}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, server.id]);
                              } else {
                                field.onChange(currentValue.filter((id) => id !== server.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={server.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {server.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Visível na Área do Cliente</FormLabel>
                    <FormDescription>
                        Se desativado, o artigo só será visível no painel administrativo.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
