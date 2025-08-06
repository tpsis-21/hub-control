import { createServerSupabaseClient } from './supabase-server';

export interface UserPermissions {
  canManageSystem: boolean;
  canSendNotifications: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  isAdmin: boolean;
}

/**
 * Obtém as permissões do usuário atual baseado no seu perfil
 */
export async function getUserPermissions(): Promise<UserPermissions> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Obter o usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // Usuário não autenticado - sem permissões
      return {
        canManageSystem: false,
        canSendNotifications: false,
        canViewReports: false,
        canManageUsers: false,
        isAdmin: false
      };
    }

    // Buscar o perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Perfil não encontrado - permissões básicas
      return {
        canManageSystem: false,
        canSendNotifications: true, // Usuários básicos podem enviar notificações
        canViewReports: false,
        canManageUsers: false,
        isAdmin: false
      };
    }

    const role = profile.role;
    const isAdmin = role === 'admin';

    return {
      canManageSystem: isAdmin,
      canSendNotifications: isAdmin, // Apenas admins podem enviar notificações
      canViewReports: isAdmin,
      canManageUsers: isAdmin,
      isAdmin
    };
  } catch (error) {
    console.error('Erro ao obter permissões do usuário:', error);
    
    // Em caso de erro, retornar permissões mínimas
    return {
      canManageSystem: false,
      canSendNotifications: false,
      canViewReports: false,
      canManageUsers: false,
      isAdmin: false
    };
  }
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
export async function hasPermission(permission: keyof UserPermissions): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions[permission];
}

/**
 * Middleware para verificar permissões em rotas da API
 */
export async function requirePermission(permission: keyof UserPermissions) {
  const hasAccess = await hasPermission(permission);
  
  if (!hasAccess) {
    throw new Error(`Acesso negado. Permissão '${permission}' necessária.`);
  }
  
  return true;
}