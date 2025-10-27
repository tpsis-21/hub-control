// Tipos e interfaces para o sistema de mapeamento TheBest-HubControl

export interface TheBestPackage {
  id: string;
  name: string;
  telas: number;
  duracao: string;
  price: number;
  active: boolean;
}

export interface HubControlPlan {
  id: string;
  name: string;
  screens: number;
  validity: number;
  price: number;
  active: boolean;
}

export interface TheBestPlanMapping {
  id: string;
  thebest_package_id: string;
  hubcontrol_plan_id: string;
  is_active: boolean;
  is_default: boolean;
  sync_price: boolean;
  sync_validity: boolean;
  sync_screens: boolean;
  override_price?: string;
  override_validity?: string;
  override_screens?: string;
  created_at: string;
  updated_at: string;
  thebest_package?: TheBestPackage;
  hubcontrol_plan?: HubControlPlan;
}

export interface MappingStatistics {
  total_mappings: number;
  active_mappings: number;
  inactive_mappings: number;
  total_packages: number;
  mapped_packages: number;
  unmapped_packages: number;
  sync_issues: number;
}

export interface UnmappedPackage {
  package_id: string;
  package_name: string;
  telas: number;
  duracao: string;
  price: number;
  suggested_plans: SuggestedPlan[];
}

export interface SuggestedPlan {
  plan_id: string;
  plan_name: string;
  compatibility_score: number;
  screen_match: boolean;
  validity_match: boolean;
  price_match: boolean;
}

export interface MappingFormData {
  thebest_package_id: string;
  hubcontrol_plan_id: string;
  is_active: boolean;
  is_default: boolean;
  sync_price: boolean;
  sync_validity: boolean;
  sync_screens: boolean;
  override_price?: string;
  override_validity?: string;
  override_screens?: string;
}

export interface MappingConfig {
  auto_sync_enabled: boolean;
  sync_interval: number;
  notification_enabled: boolean;
  backup_enabled: boolean;
}
