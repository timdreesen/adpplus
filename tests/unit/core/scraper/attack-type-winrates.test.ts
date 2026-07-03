import { describe, it, expect } from 'vitest'
import { buildAbilityLookup } from '@core/scraper/data-transformer'
import type { AbilityLookup } from '@core/scraper/data-transformer'
import { buildAttackTypeWinratesFromHeroAttributes } from '@core/scraper/attack-type-winrates'
import type { WindrunAbilityHeroAttributeStats } from '@core/scraper/types'

function stat(abilityId: number, winrate: number) {
  return {
    abilityId,
    numPicks: 1000,
    avgPickPosition: 5,
    wins: Math.round(winrate * 1000),
    winrate,
    pickRate: 1,
  }
}

const abilityLookup: AbilityLookup = buildAbilityLookup([
  {
    valveId: 656,
    englishName: 'Hammer of Purity',
    shortName: 'omniknight_hammer_of_purity',
    ownerHeroId: 57,
    hasScepter: false,
    hasShard: false,
  },
  {
    valveId: 5017,
    englishName: 'Thirst',
    shortName: 'brewmaster_thirst',
    ownerHeroId: 78,
    hasScepter: false,
    hasShard: false,
  },
  {
    valveId: 5359,
    englishName: 'Fury Swipes',
    shortName: 'ursa_fury_swipes',
    ownerHeroId: 70,
    hasScepter: false,
    hasShard: true,
  },
])

describe('buildAttackTypeWinratesFromHeroAttributes', () => {
  it('maps Windrun melee/ranged attribute stats to ability short names', () => {
    const stats: WindrunAbilityHeroAttributeStats = {
      melee: {
        '656': stat(656, 0.494),
        '5017': stat(5017, 0.553),
      },
      ranged: {
        '656': stat(656, 0.518),
        '5017': stat(5017, 0.538),
      },
    }

    const result = buildAttackTypeWinratesFromHeroAttributes(stats, abilityLookup)

    expect(result.get('omniknight_hammer_of_purity')).toEqual({
      meleeWinrate: 0.494,
      rangedWinrate: 0.518,
    })
    expect(result.get('brewmaster_thirst')).toEqual({
      meleeWinrate: 0.553,
      rangedWinrate: 0.538,
    })
  })

  it('returns null for a missing attack-type bucket', () => {
    const stats: WindrunAbilityHeroAttributeStats = {
      melee: {
        '5359': stat(5359, 0.6),
      },
      ranged: {},
    }

    const result = buildAttackTypeWinratesFromHeroAttributes(stats, abilityLookup)
    const fury = result.get('ursa_fury_swipes')

    expect(fury?.meleeWinrate).toBeCloseTo(0.6)
    expect(fury?.rangedWinrate).toBeNull()
  })

  it('skips ability ids that are not in the static lookup', () => {
    const stats: WindrunAbilityHeroAttributeStats = {
      melee: {
        '9999': stat(9999, 0.5),
      },
      ranged: {
        '9999': stat(9999, 0.5),
      },
    }

    const result = buildAttackTypeWinratesFromHeroAttributes(stats, abilityLookup)

    expect(result.size).toBe(0)
  })
})
