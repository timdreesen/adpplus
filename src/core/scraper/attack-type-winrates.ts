import type { AbilityLookup } from './data-transformer'
import type { WindrunAbilityHeroAttributeStats } from './types'

export interface AbilityAttackTypeWinrates {
  meleeWinrate: number | null
  rangedWinrate: number | null
}

/** Map Windrun ability-hero-attributes melee/ranged stats to internal ability names. */
export function buildAttackTypeWinratesFromHeroAttributes(
  stats: WindrunAbilityHeroAttributeStats,
  abilityLookup: AbilityLookup,
): Map<string, AbilityAttackTypeWinrates> {
  const result = new Map<string, AbilityAttackTypeWinrates>()
  const meleeStats = stats.melee ?? {}
  const rangedStats = stats.ranged ?? {}

  const abilityIds = new Set<number>([
    ...Object.keys(meleeStats).map(Number),
    ...Object.keys(rangedStats).map(Number),
  ])

  for (const abilityId of abilityIds) {
    const staticAbility = abilityLookup.get(abilityId)
    if (!staticAbility) continue

    const melee = meleeStats[abilityId] ?? meleeStats[String(abilityId)]
    const ranged = rangedStats[abilityId] ?? rangedStats[String(abilityId)]

    result.set(staticAbility.shortName, {
      meleeWinrate: melee?.winrate ?? null,
      rangedWinrate: ranged?.winrate ?? null,
    })
  }

  return result
}
