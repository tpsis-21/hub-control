// @/app/(app)/ajuda/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
// Removido: import { db } from "@/lib/firebase";
// Removido: import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import type { KnowledgeBaseArticle } from "@/lib/types";
import { articleSchema, editArticleSchema } from "@/lib/schemas";
import { createApiSupabaseClient } from "@/lib/supabase-api";

// --- definição de articlesCollection removida pois não é mais usada ---

// Substituir todas as operações Firestore por chamadas Supabase
export async function getArticles(): Promise<KnowledgeBaseArticle[]> {
    const supabase = await createApiSupabaseClient();
    const { data, error } = await supabase.from('knowledgeBaseArticles').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(article => ({
        ...article,
        serverIds: article.server_ids || [],
        visibleToAllServers: article.visible_to_all_servers ?? true
    }));
}

export async function addArticleAction(data: z.infer<typeof articleSchema>) {
    const supabase = await createApiSupabaseClient();
    
    const articleData = {
        title: data.title,
        content: data.content,
        category: data.category,
        isPublic: data.isPublic,
        server_ids: data.serverIds || [],
        visible_to_all_servers: data.visibleToAllServers ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    const { data: article, error } = await supabase
        .from('knowledgeBaseArticles')
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
        ...article,
        serverIds: article.server_ids || [],
        visibleToAllServers: article.visible_to_all_servers ?? true
    } as KnowledgeBaseArticle };
}

export async function editArticleAction(data: z.infer<typeof editArticleSchema>) {
    const { id, serverIds, visibleToAllServers, ...updateData } = data;
    const supabase = await createApiSupabaseClient();
    
    const dbUpdateData = {
        ...updateData,
        server_ids: serverIds || [],
        visible_to_all_servers: visibleToAllServers ?? true,
        updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase.from('knowledgeBaseArticles').update(dbUpdateData).eq('id', id);
    revalidatePath('/ajuda');
    revalidatePath('/cliente');
    if (error) return { success: false, error: error.message };
    return { success: true, article: data as KnowledgeBaseArticle };
}

export async function deleteArticleAction(articleId: string) {
    const supabase = await createApiSupabaseClient();
    const { error } = await supabase.from('knowledgeBaseArticles').delete().eq('id', articleId);
    revalidatePath('/ajuda');
    revalidatePath('/cliente');
    if (error) return { success: false, error: error.message };
    return { success: true };
}
