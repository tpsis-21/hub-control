// @/app/(app)/ajuda/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getArticles } from "./actions";
import { ArticleManagement } from "./article-management";

export default async function AjudaPage() {
    const articles = await getArticles();

    return (
                 <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Base de Conhecimento</CardTitle>
                                <CardDescription>
                                    Gerencie os artigos, tutoriais e FAQs que serão exibidos na área do cliente.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                       <ArticleManagement initialArticles={articles} />
                    </CardContent>
                </Card>
    );
}

