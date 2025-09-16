import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRenewalService } from '@/services/thebest-renewal.service';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/thebest/packages
 * Lista pacotes disponíveis para renovação
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';
    const classification = searchParams.get('classification');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    console.log('📦 Buscando pacotes:', { activeOnly, classification, limit });
    
    const renewalService = createRenewalService(supabase);
    let packages = await renewalService.getAvailablePackages();
    
    // Filtrar por classificação se especificado
    if (classification) {
      packages = packages.filter(pkg => 
        pkg.classificacao.toLowerCase().includes(classification.toLowerCase())
      );
    }
    
    // Filtrar apenas ativos se especificado
    if (activeOnly) {
      packages = packages.filter(pkg => pkg.is_active);
    }
    
    // Limitar resultados
    if (limit > 0) {
      packages = packages.slice(0, limit);
    }
    
    // Agrupar por classificação para melhor organização
    const groupedPackages = packages.reduce((acc, pkg) => {
      const classification = pkg.classificacao;
      if (!acc[classification]) {
        acc[classification] = [];
      }
      acc[classification].push(pkg);
      return acc;
    }, {} as Record<string, typeof packages>);
    
    // Estatísticas dos pacotes
    const stats = {
      total_packages: packages.length,
      active_packages: packages.filter(p => p.is_active).length,
      classifications: Object.keys(groupedPackages),
      duration_range: {
        min: Math.min(...packages.map(p => parseInt(p.duracao.split('_')[0]))),
        max: Math.max(...packages.map(p => parseInt(p.duracao.split('_')[0])))
      },
      screens_range: {
        min: Math.min(...packages.map(p => p.telas)),
        max: Math.max(...packages.map(p => p.telas))
      },
      credits_range: {
        min: Math.min(...packages.map(p => p.creditos)),
        max: Math.max(...packages.map(p => p.creditos))
      }
    };
    
    console.log('✅ Pacotes encontrados:', stats.total_packages);
    
    return NextResponse.json({
      success: true,
      packages,
      grouped_packages: groupedPackages,
      stats,
      count: packages.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar pacotes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/thebest/packages
 * Importa pacotes do CSV (para administradores)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, packages } = body;
    
    if (action === 'import' && packages) {
      console.log('📥 Importando pacotes via API:', packages.length);
      
      // Validar estrutura dos pacotes
      const validPackages = packages.filter((pkg: any) => {
        return pkg.package_id && pkg.name && pkg.classificacao && 
               pkg.duracao && pkg.telas && pkg.creditos;
      });
      
      if (validPackages.length === 0) {
        return NextResponse.json(
          { error: 'Nenhum pacote válido encontrado' },
          { status: 400 }
        );
      }
      
      // Inserir pacotes no banco
      const { data: insertedData, error: insertError } = await supabase
        .from('thebest_packages')
        .upsert(validPackages.map((pkg: any) => ({
          package_id: pkg.package_id,
          name: pkg.name,
          classificacao: pkg.classificacao,
          duracao: pkg.duracao,
          telas: pkg.telas,
          creditos: pkg.creditos,
          is_active: pkg.is_active ?? true,
          metadata: {
            ...pkg.metadata,
            api_import: true,
            import_date: new Date().toISOString()
          }
        })), {
          onConflict: 'package_id'
        })
        .select();
      
      if (insertError) {
        throw new Error(`Erro ao inserir pacotes: ${insertError.message}`);
      }
      
      return NextResponse.json({
        success: true,
        message: `${insertedData?.length || 0} pacotes importados com sucesso`,
        imported_count: insertedData?.length || 0
      });
    }
    
    return NextResponse.json(
      { error: 'Ação não suportada' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Erro ao importar pacotes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/thebest/packages
 * Atualiza status de pacotes
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { package_ids, is_active } = body;
    
    if (!Array.isArray(package_ids) || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }
    
    console.log('🔄 Atualizando status dos pacotes:', { package_ids, is_active });
    
    const { data: updatedData, error: updateError } = await supabase
      .from('thebest_packages')
      .update({ 
        is_active,
        updated_at: new Date().toISOString()
      })
      .in('package_id', package_ids)
      .select();
    
    if (updateError) {
      throw new Error(`Erro ao atualizar pacotes: ${updateError.message}`);
    }
    
    return NextResponse.json({
      success: true,
      message: `${updatedData?.length || 0} pacotes atualizados`,
      updated_count: updatedData?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar pacotes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}