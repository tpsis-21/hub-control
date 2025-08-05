// @/app/(app)/ajuda/article-management.tsx
"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit, Trash2 } from "lucide-react";
import type { KnowledgeBaseArticle } from "@/lib/types";
import { AddArticleForm } from "./add-article-form";
import { EditArticleForm } from "./edit-article-form";
import { DeleteArticleDialog } from "./delete-article-dialog";

function ArticleList({ title, articles }: { title: string, articles: KnowledgeBaseArticle[] }) {
    if (articles.length === 0) return null;

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">{title}</h3>
            <div className="space-y-2">
                {articles.map(article => (
                    <Card key={article.id}>
                        <div className="p-4 flex items-center justify-between">
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value={article.id} className="border-b-0">
                                    <AccordionTrigger className="font-medium hover:no-underline">{article.title}</AccordionTrigger>
                                    <AccordionContent className="whitespace-pre-wrap text-muted-foreground pt-2">
                                        {article.content}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            <div className="flex gap-2 ml-4">
                                <EditArticleForm article={article}>
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </EditArticleForm>
                                <DeleteArticleDialog articleId={article.id} articleTitle={article.title} />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export function ArticleManagement({ initialArticles }: { initialArticles: KnowledgeBaseArticle[] }) {
    const faqs = initialArticles.filter(a => a.category === 'FAQ');
    const tutorials = initialArticles.filter(a => a.category === 'Tutoriais');
    const troubleshooting = initialArticles.filter(a => a.category === 'Solução de Problemas');

    return (
        <>
            <div className="flex justify-end">
                 <AddArticleForm />
            </div>
            {initialArticles.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                    Nenhum artigo encontrado. Clique em &quot;Adicionar Artigo&quot; para começar.
                </div>
            ) : (
                <div className="space-y-8">
                    <ArticleList title="Perguntas Frequentes (FAQ)" articles={faqs} />
                    <ArticleList title="Tutoriais" articles={tutorials} />
                    <ArticleList title="Solução de Problemas" articles={troubleshooting} />
                </div>
            )}
        </>
    );
}
