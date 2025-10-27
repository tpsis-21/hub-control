// @/app/(app)/ajuda/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
// Removido: import { db } from "@/lib/firebase";
// Removido: import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import type { KnowledgeBaseArticle } from "@/lib/types";
import { articleSchema, editArticleSchema } from "@/lib/schemas";
import { createServerSupabaseClientForActions } from "@/lib/supabase/clients/server";

// --- definição de articlesCollection removida pois não é mais usada ---

// Substituir todas as operações Firestore por chamadas Supabase
export async function getArticles(): Promise<KnowledgeBaseArticle[]> {
    const supabase = await createServerSupabaseClientForActions();
    const { data, error } = await supabase.from('knowledge_base_articles').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(article => ({
        id: article.id,
      title: article.title,
      content: article.content,
      category: article.category as 'FAQ' | 'Tutoriais' | 'Solução de Problemas',
      isPublic: article.is_public,
      serverIds: article.server_ids || [],
      visibleToAllServers: article.visible_to_all_servers,
      created_at: article.created_at,
      updated_at: article.updated_at
    }));
}

export async function addArticleAction(data: z.infer<typeof articleSchema>) {
    const supabase = await createServerSupabaseClientForActions();
    
    const articleData = {
        title: data.title,
        content: data.content,
        category: data.category,
        is_public: data.isPublic,
        server_ids: data.serverIds || [],
        visible_to_all_servers: data.visibleToAllServers ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    const { data: article, error } = await supabase
        .from('knowledge_base_articles')
        .insert(articleData)
        .select()
        .single();
    
    revalidatePath('/ajuda');
    revalidatePath('/cliente');
    
    if (error) {
        console.error('Error adding article:', error);
        return { success: false, error: error.message };
    }
    
    return { success: true, article: {
        id: article.id,
        title: article.title,
        content: article.content,
        category: article.category as 'FAQ' | 'Tutoriais' | 'Solução de Problemas',
        isPublic: article.is_public,
        serverIds: article.server_ids || [],
        visibleToAllServers: article.visible_to_all_servers,
        created_at: article.created_at,
        updated_at: article.updated_at
    } as KnowledgeBaseArticle };
}

export async function editArticleAction(data: z.infer<typeof editArticleSchema>) {
    const { id, serverIds, visibleToAllServers, ...updateData } = data;
    const supabase = await createServerSupabaseClientForActions();
    
    const dbUpdateData = {
        ...updateData,
        server_ids: serverIds || [],
        visible_to_all_servers: visibleToAllServers ?? true,
        updated_at: new Date().toISOString()
    };
    
    const { data: article, error } = await supabase
        .from('knowledge_base_articles')
        .update(dbUpdateData)
        .eq('id', id)
        .select()
        .single();
    
    revalidatePath('/ajuda');
    revalidatePath('/cliente');
    
    if (error) {
        console.error('Erro ao atualizar artigo:', error);
        return { success: false, error: error.message };
    }
    
    return { success: true, article: {
        id: article.id,
        title: article.title,
        content: article.content,
        category: article.category as 'FAQ' | 'Tutoriais' | 'Solução de Problemas',
        isPublic: article.is_public,
        serverIds: article.server_ids || [],
        visibleToAllServers: article.visible_to_all_servers,
        created_at: article.created_at,
        updated_at: article.updated_at
    } as KnowledgeBaseArticle };
}

export async function deleteArticleAction(articleId: string) {
    const supabase = await createServerSupabaseClientForActions();
    const { error } = await supabase.from('knowledge_base_articles').delete().eq('id', articleId);
    revalidatePath('/ajuda');
    revalidatePath('/cliente');
    if (error) return { success: false, error: error.message };
    return { success: true };
}

