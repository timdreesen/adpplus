import { describe, it, expect } from 'vitest'
import {
  computeAbilityAttackTypeWinrates,
  heroPairsToAttackTypePicks,
  type HeroAbilityPickForAttackType,
} from '@core/scraper/attack-type-winrates'
import type { TransformedHeroAbilitySynergy } from '@core/scraper/types'

describe('computeAbilityAttackTypeWinrates', () => {
  it('computes pick-weighted melee and ranged win rates per ability', () => {
    const picks: HeroAbilityPickForAttackType[] = [
      // Fury Swipes (owner: Ursa/70) drafted on melee Pudge (14)
      { abilityName: 'ursa_fury_swipes', heroWindrunId: 14, abilityOwnerHeroId: 70, winrate: 0.6, numPicks: 100 },
      // Fury Swipes drafted on ranged Sniper (35)
      { abilityName: 'ursa_fury_swipes', heroWindrunId: 35, abilityOwnerHeroId: 70, winrate: 0.5, numPicks: 200 },
    ]

    const result = computeAbilityAttackTypeWinrates(picks)
    const fury = result.get('ursa_fury_swipes')

    expect(fury?.meleeWinrate).toBeCloseTo(0.6)
    expect(fury?.rangedWinrate).toBeCloseTo(0.5)
  })

  it('skips native kit picks (ability owner matches drafting hero)', () => {
    const picks: HeroAbilityPickForAttackType[] = [
      { abilityName: 'ursa_fury_swipes', heroWindrunId: 70, abilityOwnerHeroId: 70, winrate: 0.9, numPicks: 500 },
      { abilityName: 'ursa_fury_swipes', heroWindrunId: 35, abilityOwnerHeroId: 70, winrate: 0.5, numPicks: 100 },
    ]

    const result = computeAbilityAttackTypeWinrates(picks)
    const fury = result.get('ursa_fury_swipes')

    expect(fury?.meleeWinrate).toBeNull()
    expect(fury?.rangedWinrate).toBeCloseTo(0.5)
  })

  it('returns null for attack-type buckets with no picks', () => {
    const picks: HeroAbilityPickForAttackType[] = [
      { abilityName: 'ursa_fury_swipes', heroWindrunId: 14, abilityOwnerHeroId: 70, winrate: 0.6, numPicks: 50 },
    ]

    const result = computeAbilityAttackTypeWinrates(picks)
    const fury = result.get('ursa_fury_swipes')

    expect(fury?.meleeWinrate).toBeCloseTo(0.6)
    expect(fury?.rangedWinrate).toBeNull()
  })
})

describe('heroPairsToAttackTypePicks', () => {
  it('maps hero and ability names to windrun ids', () => {
    const heroPairs: TransformedHeroAbilitySynergy[] = [
      {
        heroName: 'sniper',
        abilityName: 'ursa_fury_swipes',
        synergyWinrate: 0.55,
        synergyIncrease: 0.05,
        numPicks: 300,
        isOp: false,
      },
    ]

    const heroNameToWindrunId = new Map([['sniper', 35]])
    const abilityNameToOwnerHeroId = new Map([['ursa_fury_swipes', 70]])

    const picks = heroPairsToAttackTypePicks(
      heroPairs,
      heroNameToWindrunId,
      abilityNameToOwnerHeroId,
    )

    expect(picks).toEqual([
      {
        abilityName: 'ursa_fury_swipes',
        heroWindrunId: 35,
        abilityOwnerHeroId: 70,
        winrate: 0.55,
        numPicks: 300,
      },
    ])
  })
})
