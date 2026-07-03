import { describe, it, expect } from 'vitest'
import {
  applyPickedAbilityFlags,
  buildPickedDisplayNameSet,
} from '@core/domain/picked-ability-enrichment'
import type { OverlayDataPayload } from '@shared/types'

function makePayload(): OverlayDataPayload {
  return {
    initialSetup: false,
    scanData: {
      ultimates: [],
      standard: [
        {
          name: 'fireball',
          confidence: 0.95,
          hero_order: 0,
          ability_order: 0,
          is_ultimate: false,
          coord: { x: 0, y: 0, width: 64, height: 64, hero_order: 0 },
          displayName: 'Fireball',
          winrate: 0.55,
          meleeWinrate: 0.54,
          rangedWinrate: 0.56,
          pickRate: 10,
          consolidatedScore: 0.5,
          isGeneralTopTier: false,
          isSynergySuggestionForMySpot: false,
          isUltimateFromDb: false,
          isPicked: false,
          highWinrateCombinations: [
            {
              ability1DisplayName: 'Fireball',
              ability2DisplayName: 'Ice Blast',
              synergyWinrate: 0.6,
            },
          ],
          lowWinrateCombinations: [],
          strongHeroSynergies: [],
          weakHeroSynergies: [],
        },
      ],
      selectedAbilities: [],
    },
    targetResolution: '1920x1080',
    scaleFactor: 1,
    opCombinations: [
      {
        ability1DisplayName: 'Fireball',
        ability2DisplayName: 'Ice Blast',
        synergyWinrate: 0.68,
      },
    ],
    trapCombinations: [],
    heroSynergies: [
      {
        heroDisplayName: 'Lina',
        abilityDisplayName: 'Ice Blast',
        synergyWinrate: 0.62,
      },
    ],
    heroTraps: [],
    heroModels: [
      {
        heroOrder: 0,
        heroName: 'lina',
        heroDisplayName: 'Lina',
        dbHeroId: 1,
        winrate: 0.52,
        pickRate: 15,
        consolidatedScore: 0.4,
        isGeneralTopTier: false,
        identificationConfidence: 0.95,
        topAbilitiesByWinrate: [
          { displayName: 'Laguna Blade', winrate: 0.6 },
        ],
        strongAbilitySynergies: [],
        weakAbilitySynergies: [],
      },
    ],
    heroesForMySpotUI: [],
    selectedHeroForDraftingDbId: null,
    selectedModelHeroOrder: null,
    heroesCoords: [],
    heroesParams: { width: 358, height: 170 },
    modelsCoords: [],
    topHeroesByWinrate: [],
    topSpellsByWinrate: [
      { displayName: 'Fireball', winrate: 0.55 },
      { displayName: 'Ice Blast', winrate: 0.52 },
    ],
    pickedAbilityDisplayNames: [],
  }
}

describe('picked-ability-enrichment', () => {
  it('builds display names from internal ability names', () => {
    const map = new Map([
      ['fireball', { displayName: 'Fireball' } as import('@shared/types').AbilityDetail],
      ['ice_blast', { displayName: 'Ice Blast' } as import('@shared/types').AbilityDetail],
    ])

    const result = buildPickedDisplayNameSet(['fireball', 'ice_blast'], map)
    expect([...result]).toEqual(['Fireball', 'Ice Blast'])
  })

  it('marks picked abilities across overlay lists and tooltips', () => {
    const picked = new Set(['Fireball', 'Ice Blast'])
    const enriched = applyPickedAbilityFlags(makePayload(), picked)

    expect(enriched.pickedAbilityDisplayNames).toEqual(['Fireball', 'Ice Blast'])
    expect(enriched.topSpellsByWinrate[0].isPicked).toBe(true)
    expect(enriched.topSpellsByWinrate[1].isPicked).toBe(true)
    expect(enriched.opCombinations[0].ability1IsPicked).toBe(true)
    expect(enriched.opCombinations[0].ability2IsPicked).toBe(true)
    expect(enriched.heroSynergies[0].isAbilityPicked).toBe(true)
    expect(enriched.scanData!.standard[0].highWinrateCombinations[0].ability2IsPicked).toBe(
      true,
    )
    expect(enriched.heroModels[0].topAbilitiesByWinrate[0].isPicked).toBe(false)
  })
})
