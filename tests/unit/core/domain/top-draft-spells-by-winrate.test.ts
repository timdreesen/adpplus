import { describe, it, expect } from 'vitest'
import { getTopDraftSpellsByWinrate } from '@core/domain/top-draft-spells-by-winrate'
import type { AbilityDetail, ScanResult } from '@shared/types'

function makeSlot(name: string, isUltimate = false): ScanResult {
  return {
    name,
    confidence: 0.95,
    hero_order: 1,
    ability_order: 1,
    is_ultimate: isUltimate,
    coord: { x: 0, y: 0, width: 64, height: 64, hero_order: 1, ability_order: 1 },
  }
}

function makeDetail(name: string, displayName: string, winrate: number | null): AbilityDetail {
  return {
    abilityId: 1,
    name,
    displayName,
    heroId: 1,
    winrate,
    meleeWinrate: null,
    rangedWinrate: null,
    highSkillWinrate: null,
    pickRate: 10,
    hsPickRate: null,
    isUltimate: false,
    abilityOrder: 1,
  }
}

describe('getTopDraftSpellsByWinrate', () => {
  it('returns draft pool spells sorted by winrate descending', () => {
    const ultimates = [makeSlot('laguna_blade', true)]
    const standard = [
      makeSlot('fireball'),
      makeSlot('ice_blast'),
      makeSlot('firestorm'),
    ]
    const details = new Map<string, AbilityDetail>([
      ['laguna_blade', makeDetail('laguna_blade', 'Laguna Blade', 0.6)],
      ['fireball', makeDetail('fireball', 'Fireball', 0.55)],
      ['ice_blast', makeDetail('ice_blast', 'Ice Blast', 0.52)],
      ['firestorm', makeDetail('firestorm', 'Firestorm', 0.48)],
    ])

    const result = getTopDraftSpellsByWinrate(ultimates, standard, details, 3)

    expect(result).toEqual([
      { displayName: 'Laguna Blade', winrate: 0.6 },
      { displayName: 'Fireball', winrate: 0.55 },
      { displayName: 'Ice Blast', winrate: 0.52 },
    ])
  })

  it('deduplicates abilities that appear in both ultimates and standard', () => {
    const slot = makeSlot('fireball')
    const details = new Map([['fireball', makeDetail('fireball', 'Fireball', 0.55)]])

    const result = getTopDraftSpellsByWinrate([slot], [slot], details)

    expect(result).toHaveLength(1)
    expect(result[0].displayName).toBe('Fireball')
  })

  it('sorts spells without winrate data to the bottom', () => {
    const standard = [makeSlot('unknown'), makeSlot('fireball')]
    const details = new Map([['fireball', makeDetail('fireball', 'Fireball', 0.55)]])

    const result = getTopDraftSpellsByWinrate([], standard, details)

    expect(result[0].displayName).toBe('Fireball')
    expect(result[1].displayName).toBe('unknown')
    expect(result[1].winrate).toBeNull()
  })
})
