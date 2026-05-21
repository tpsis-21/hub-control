import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HubControlPlan,
  MappingStatistics,
  TheBestPackage,
  TheBestPlanMapping,
  UnmappedPackage,
} from '@/components/integrations/mapping/types';

export type TheBestMappingBundle = {
  config_id: string;
  mappings: TheBestPlanMapping[];
  packages: TheBestPackage[];
  plans: HubControlPlan[];
  statistics: MappingStatistics;
  unmapped_packages: UnmappedPackage[];
};

export async function resolveActiveTheBestConfigId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('thebest_configs')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.id ?? null;
}

function mapPackageRow(row: Record<string, unknown>): TheBestPackage {
  return {
    id: String(row.id),
    name: String(row.name ?? row.package_name ?? 'Pacote'),
    telas: Number(row.telas ?? 1),
    duracao: String(row.duracao ?? '1_MES'),
    price: Number(row.price ?? 0),
    active: Boolean(row.is_active ?? true),
  };
}

function mapPlanRow(row: Record<string, unknown>): HubControlPlan {
  return {
    id: String(row.id),
    name: String(row.name),
    screens: Number(row.screens ?? 0),
    validity: Number(row.validity ?? 0),
    price: Number(row.price ?? 0),
    active: Boolean(row.is_public ?? true),
  };
}

function mapMappingRow(row: Record<string, unknown>): TheBestPlanMapping {
  const pkg = row.thebest_package as Record<string, unknown> | null;
  const plan = row.hubcontrol_plan as Record<string, unknown> | null;

  return {
    id: String(row.id),
    thebest_package_id: String(row.thebest_package_id),
    hubcontrol_plan_id: String(row.hubcontrol_plan_id),
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    sync_price: Boolean(row.sync_price),
    sync_validity: Boolean(row.sync_validity),
    sync_screens: Boolean(row.sync_screens),
    override_price:
      row.override_price != null ? String(row.override_price) : undefined,
    override_validity:
      row.override_validity != null ? String(row.override_validity) : undefined,
    override_screens:
      row.override_screens != null ? String(row.override_screens) : undefined,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    thebest_package: pkg ? mapPackageRow(pkg) : undefined,
    hubcontrol_plan: plan ? mapPlanRow(plan) : undefined,
  };
}

function normalizeStatistics(
  statsJson: Record<string, unknown> | null,
  activeCount: number,
  inactiveCount: number
): MappingStatistics {
  const totalPackages = Number(statsJson?.total_packages ?? 0);
  const mappedPackages = Number(statsJson?.mapped_packages ?? 0);
  const unmappedPackages = Number(
    statsJson?.unmapped_packages ?? Math.max(0, totalPackages - mappedPackages)
  );
  const totalMappings = Number(statsJson?.total_mappings ?? activeCount + inactiveCount);

  return {
    total_mappings: totalMappings,
    active_mappings: activeCount,
    inactive_mappings: inactiveCount,
    total_packages: totalPackages,
    mapped_packages: mappedPackages,
    unmapped_packages: unmappedPackages,
    sync_issues: 0,
  };
}

function mapUnmappedRow(row: Record<string, unknown>): UnmappedPackage {
  const suggested = Array.isArray(row.suggested_plans)
    ? (row.suggested_plans as Record<string, unknown>[])
    : [];

  const telas = Number(row.telas ?? 1);

  return {
    package_id: String(row.package_id ?? row.id),
    package_name: String(row.package_name ?? row.name ?? 'Pacote'),
    telas,
    duracao: String(row.duracao ?? '1_MES'),
    price: Number(row.price ?? 0),
    suggested_plans: suggested.map((p) => ({
      plan_id: String(p.plan_id ?? p.id),
      plan_name: String(p.plan_name ?? p.name),
      compatibility_score: Number(p.compatibility_score ?? 0),
      screen_match: Boolean(p.screen_match ?? p.screens === telas),
      validity_match: Boolean(p.validity_match ?? false),
      price_match: Boolean(p.price_match ?? false),
    })),
  };
}

export async function loadTheBestMappingBundle(
  supabase: SupabaseClient,
  configId: string
): Promise<TheBestMappingBundle> {
  const [mappingsRes, packagesRes, plansRes, statsRpc, unmappedRpc, countsRes] =
    await Promise.all([
      supabase
        .from('thebest_plan_mappings')
        .select(
          `*,
          thebest_package:thebest_packages(id, name, telas, duracao, price, is_active),
          hubcontrol_plan:plans(id, name, screens, validity, price, is_public)`
        )
        .eq('config_id', configId)
        .order('created_at', { ascending: false }),
      supabase
        .from('thebest_packages')
        .select('id, name, telas, duracao, price, is_active')
        .eq('config_id', configId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('plans')
        .select('id, name, screens, validity, price, is_public')
        .eq('is_public', true)
        .order('name'),
      supabase.rpc('get_mapping_statistics', { p_config_id: configId }),
      supabase.rpc('get_unmapped_thebest_packages', { p_config_id: configId }),
      supabase
        .from('thebest_plan_mappings')
        .select('is_active')
        .eq('config_id', configId),
    ]);

  if (mappingsRes.error) throw mappingsRes.error;
  if (packagesRes.error) throw packagesRes.error;
  if (plansRes.error) throw plansRes.error;

  const mappings = (mappingsRes.data ?? []).map((row) =>
    mapMappingRow(row as Record<string, unknown>)
  );
  const packages = (packagesRes.data ?? []).map((row) =>
    mapPackageRow(row as Record<string, unknown>)
  );
  const plans = (plansRes.data ?? []).map((row) =>
    mapPlanRow(row as Record<string, unknown>)
  );

  const counts = countsRes.data ?? [];
  const activeCount = counts.filter((r) => r.is_active).length;
  const inactiveCount = counts.length - activeCount;

  const statsJson =
    statsRpc.error || statsRpc.data == null
      ? null
      : (statsRpc.data as Record<string, unknown>);
  const statistics = normalizeStatistics(statsJson, activeCount, inactiveCount);

  const unmapped_packages =
    unmappedRpc.error || !Array.isArray(unmappedRpc.data)
      ? []
      : (unmappedRpc.data as Record<string, unknown>[]).map(mapUnmappedRow);

  return {
    config_id: configId,
    mappings,
    packages,
    plans,
    statistics,
    unmapped_packages,
  };
}

export type MappingWriteInput = {
  thebest_package_id: string;
  hubcontrol_plan_id: string;
  is_active?: boolean;
  is_default?: boolean;
  sync_price?: boolean;
  sync_validity?: boolean;
  sync_screens?: boolean;
  override_price?: string | null;
  override_validity?: string | null;
  override_screens?: string | null;
};

function mappingFieldPayload(input: MappingWriteInput) {
  return {
    thebest_package_id: input.thebest_package_id,
    hubcontrol_plan_id: input.hubcontrol_plan_id,
    is_active: input.is_active ?? true,
    is_default: input.is_default ?? false,
    sync_price: input.sync_price ?? true,
    sync_validity: input.sync_validity ?? true,
    sync_screens: input.sync_screens ?? true,
    override_price:
      input.override_price != null && input.override_price !== ''
        ? Number(input.override_price)
        : null,
    override_validity:
      input.override_validity != null && input.override_validity !== ''
        ? Number(input.override_validity)
        : null,
    override_screens:
      input.override_screens != null && input.override_screens !== ''
        ? Number(input.override_screens)
        : null,
  };
}

export function toMappingInsertPayload(
  configId: string,
  userId: string,
  input: MappingWriteInput
) {
  return {
    ...mappingFieldPayload(input),
    config_id: configId,
    created_by: userId,
    updated_by: userId,
  };
}

export function toMappingUpdatePayload(userId: string, input: MappingWriteInput) {
  return {
    ...mappingFieldPayload(input),
    updated_by: userId,
  };
}
