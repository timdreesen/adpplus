import { NUM_TOP_SPELLS_BY_WINRATE } from '@shared/constants/thresholds'
import type { AbilityDetail, HeroTopAbilityDisplay, ScanResult } from '@shared/types'

/**
 * Returns the top spells in the current draft pool sorted by winrate (descending).
 * Deduplicates by internal ability name (a spell can appear in both ultimates and standard).
 */
export function getTopDraftSpellsByWinrate(
  ultimates: ScanResult[],
  standard: ScanResult[],
  abilityDetailsMap: Map<string, AbilityDetail>,
  limit = NUM_TOP_SPELLS_BY_WINRATE,
): HeroTopAbilityDisplay[] {
  const seen = new Set<string>()
  const spells: HeroTopAbilityDisplay[] = []

  for (const slot of [...ultimates, ...standard]) {
    if (!slot.name || seen.has(slot.name)) continue
    seen.add(slot.name)

    const details = abilityDetailsMap.get(slot.name)
    spells.push({
      displayName: details?.displayName ?? slot.name,
      winrate: details?.winrate ?? null,
    })
  }

  return spells
    .sort((a, b) => (b.winrate ?? -1) - (a.winrate ?? -1))
    .slice(0, limit)
}
