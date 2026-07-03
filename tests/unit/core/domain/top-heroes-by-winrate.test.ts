import { describe, it, expect } from 'vitest'
import { getTopHeroesByWinrate } from '@core/domain/top-heroes-by-winrate'
import type { IdentifiedHeroModel } from '@core/domain/types'

function makeModel(
  heroOrder: number,
  dbHeroId: number | null,
  displayName: string,
  winrate: number | null,
): IdentifiedHeroModel {
  return {
    heroOrder,
    heroName: displayName.toLowerCase(),
    heroDisplayName: displayName,
    dbHeroId,
    winrate,
    highSkillWinrate: null,
    pickRate: null,
    hsPickRate: null,
    identificationConfidence: 0.95,
  }
}

describe('getTopHeroesByWinrate', () => {
  it('returns heroes sorted by winrate descending', () => {
    const models = [
      makeModel(0, 1, 'Lina', 0.52),
      makeModel(1, 2, 'Anti-Mage', 0.48),
      makeModel(2, 3, 'Invoker', 0.55),
    ]

    const result = getTopHeroesByWinrate(models, new Set())

    expect(result.map((h) => h.displayName)).toEqual(['Invoker', 'Lina', 'Anti-Mage'])
    expect(result.map((h) => h.winrate)).toEqual([0.55, 0.52, 0.48])
  })

  it('limits results to 10 heroes', () => {
    const models = Array.from({ length: 15 }, (_, i) =>
      makeModel(i, i + 1, `Hero ${i}`, 0.5 + i * 0.01),
    )

    expect(getTopHeroesByWinrate(models, new Set()).length).toBe(10)
  })

  it('excludes unidentified heroes', () => {
    const models = [
      makeModel(0, 1, 'Lina', 0.52),
      makeModel(1, null, 'Unknown Hero', null),
    ]

    expect(getTopHeroesByWinrate(models, new Set())).toHaveLength(1)
  })

  it('marks drafted heroes', () => {
    const models = [
      makeModel(0, 1, 'Lina', 0.52),
      makeModel(1, 2, 'Anti-Mage', 0.48),
    ]

    const result = getTopHeroesByWinrate(models, new Set([1]))

    expect(result[0].isDrafted).toBe(true)
    expect(result[1].isDrafted).toBe(false)
  })

  it('places null winrates last', () => {
    const models = [
      makeModel(0, 1, 'Lina', null),
      makeModel(1, 2, 'Anti-Mage', 0.48),
    ]

    const result = getTopHeroesByWinrate(models, new Set())

    expect(result[0].displayName).toBe('Anti-Mage')
    expect(result[1].displayName).toBe('Lina')
  })
})
