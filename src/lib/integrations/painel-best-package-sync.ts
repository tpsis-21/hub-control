import type { PainelBestPackage } from '@/lib/integrations/thebest-panel-client'

export type TheBestPackageDbRow = {
  external_id: string
  name: string
  classificacao: 'COM_ADULTO' | 'SEM_ADULTO'
  duracao: '1_MES' | '3_MESES' | '6_MESES' | '12_MESES'
  telas: number
  creditos: number
  description?: string
}

export function mapPainelBestPackageToDb(
  pkg: PainelBestPackage
): TheBestPackageDbRow {
  const nameUpper = pkg.name.toUpperCase()
  const classificacao: TheBestPackageDbRow['classificacao'] =
    nameUpper.includes('SEM') && nameUpper.includes('ADULTO')
      ? 'SEM_ADULTO'
      : pkg.is_trial
        ? 'SEM_ADULTO'
        : 'COM_ADULTO'

  const durationValue =
    pkg.is_trial && !pkg.is_official
      ? pkg.trial_duration ?? 1
      : pkg.official_duration ?? 1
  const durationUnit =
    pkg.is_trial && !pkg.is_official
      ? pkg.trial_duration_in
      : pkg.official_duration_in

  const duracao = mapDurationToEnum(durationValue, durationUnit)

  return {
    external_id: String(pkg.id),
    name: pkg.name,
    classificacao,
    duracao,
    telas: 1,
    creditos: Math.round(
      pkg.is_trial && !pkg.is_official
        ? pkg.trial_credits
        : pkg.official_credits
    ),
    description: pkg.is_trial ? 'Pacote teste (Painel Best)' : undefined,
  }
}

function mapDurationToEnum(
  value: number,
  unit?: string
): TheBestPackageDbRow['duracao'] {
  const months =
    unit === 'months' ? value : unit === 'years' ? value * 12 : 1

  if (months >= 12) return '12_MESES'
  if (months >= 6) return '6_MESES'
  if (months >= 3) return '3_MESES'
  return '1_MES'
}

/** Formato exibido na UI de integrações. */
export function mapPainelBestPackageToUi(pkg: PainelBestPackage) {
  const db = mapPainelBestPackageToDb(pkg)
  return {
    id: String(pkg.id),
    external_id: db.external_id,
    name: db.name,
    classificacao: db.classificacao.replace('_', ' '),
    duracao: db.duracao.replace('_', ' '),
    telas: db.telas,
    creditos: db.creditos,
    is_trial: pkg.is_trial,
    is_official: pkg.is_official,
  }
}
