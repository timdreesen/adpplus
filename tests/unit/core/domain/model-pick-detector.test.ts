import { describe, it, expect } from 'vitest'
import {
  detectPickedHeroOrders,
  isModelSlotPicked,
  mapPickedOrdersToHeroIds,
  type SlotImageStats,
} from '@core/domain/model-pick-detector'
import type { IdentifiedHeroModel } from '@core/domain/types'

function stats(luminance: number, saturation: number): SlotImageStats {
  return { meanLuminance: luminance, meanSaturation: saturation }
}

describe('isModelSlotPicked', () => {
  it('detects a significantly darker and less saturated slot', () => {
    const baseline = stats(120, 0.5)
    const current = stats(80, 0.25)
    expect(isModelSlotPicked(baseline, current)).toBe(true)
  })

  it('does not flag minor brightness changes', () => {
    const baseline = stats(120, 0.5)
    const current = stats(110, 0.48)
    expect(isModelSlotPicked(baseline, current)).toBe(false)
  })
})

describe('detectPickedHeroOrders', () => {
  it('returns hero orders that look picked', () => {
    const baselines = {
      0: stats(120, 0.5),
      1: stats(115, 0.45),
      2: stats(118, 0.48),
    }
    const current = new Map<number, SlotImageStats>([
      [0, stats(120, 0.5)],
      [1, stats(75, 0.2)],
      [2, stats(80, 0.22)],
    ])

    expect(detectPickedHeroOrders(baselines, current).sort()).toEqual([1, 2])
  })
})

describe('mapPickedOrdersToHeroIds', () => {
  const models: IdentifiedHeroModel[] = [
    {
      heroOrder: 1,
      heroName: 'lina',
      heroDisplayName: 'Lina',
      dbHeroId: 10,
      winrate: 0.52,
      highSkillWinrate: null,
      pickRate: null,
      hsPickRate: null,
      identificationConfidence: 0.95,
    },
    {
      heroOrder: 2,
      heroName: 'unknown_model_2',
      heroDisplayName: 'Unknown Hero',
      dbHeroId: null,
      winrate: null,
      highSkillWinrate: null,
      pickRate: null,
      hsPickRate: null,
      identificationConfidence: 0,
    },
  ]

  it('maps identified hero orders to db hero ids', () => {
    expect(mapPickedOrdersToHeroIds([1, 2], models)).toEqual([10])
  })
})
