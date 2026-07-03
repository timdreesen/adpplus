import { NUM_TOP_TIER_SUGGESTIONS } from '@shared/constants/thresholds'
import type { TopHeroByWinrateDisplay } from '@shared/types'
import type { IdentifiedHeroModel } from './types'

/**
 * Returns the top heroes in the current draft sorted by winrate (descending).
 * Heroes in draftedHeroIds are marked as drafted for strikethrough display.
 */
export function getTopHeroesByWinrate(
  heroModels: IdentifiedHeroModel[],
  draftedHeroIds: ReadonlySet<number>,
  limit = NUM_TOP_TIER_SUGGESTIONS,
): TopHeroByWinrateDisplay[] {
  return heroModels
    .filter((model) => model.dbHeroId !== null)
    .sort((a, b) => {
      const aWr = a.winrate ?? -1
      const bWr = b.winrate ?? -1
      return bWr - aWr
    })
    .slice(0, limit)
    .map((model) => ({
      heroId: model.dbHeroId!,
      displayName: model.heroDisplayName,
      winrate: model.winrate,
      isDrafted: draftedHeroIds.has(model.dbHeroId!),
    }))
}
