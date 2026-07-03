import type {
  OverlayDataPayload,
  SynergyPairDisplay,
  HeroSynergyDisplay,
  HeroTopAbilityDisplay,
  EnrichedScanSlot,
  HeroModelDisplay,
  AbilityDetail,
} from '@shared/types'

export function buildPickedDisplayNameSet(
  pickedAbilityNames: readonly string[],
  abilityDetailsMap: Map<string, AbilityDetail>,
): Set<string> {
  const displayNames = new Set<string>()

  for (const name of pickedAbilityNames) {
    const details = abilityDetailsMap.get(name)
    displayNames.add(details?.displayName ?? name)
  }

  return displayNames
}

export function applyPickedAbilityFlags(
  payload: OverlayDataPayload,
  pickedDisplayNames: ReadonlySet<string>,
): OverlayDataPayload {
  return {
    ...payload,
    pickedAbilityDisplayNames: [...pickedDisplayNames],
    topSpellsByWinrate: enrichTopSpells(
      payload.topSpellsByWinrate,
      pickedDisplayNames,
    ),
    opCombinations: enrichSynergyPairs(
      payload.opCombinations,
      pickedDisplayNames,
    ),
    trapCombinations: enrichSynergyPairs(
      payload.trapCombinations,
      pickedDisplayNames,
    ),
    heroSynergies: enrichHeroSynergies(
      payload.heroSynergies,
      pickedDisplayNames,
    ),
    heroTraps: enrichHeroSynergies(payload.heroTraps, pickedDisplayNames),
    heroModels: payload.heroModels.map((model) =>
      enrichHeroModel(model, pickedDisplayNames),
    ),
    scanData: payload.scanData
      ? {
          ultimates: enrichSlots(
            payload.scanData.ultimates,
            pickedDisplayNames,
          ),
          standard: enrichSlots(
            payload.scanData.standard,
            pickedDisplayNames,
          ),
          selectedAbilities: enrichSlots(
            payload.scanData.selectedAbilities,
            pickedDisplayNames,
          ),
        }
      : null,
  }
}

function enrichTopSpells(
  spells: HeroTopAbilityDisplay[],
  pickedDisplayNames: ReadonlySet<string>,
): HeroTopAbilityDisplay[] {
  return spells.map((spell) => ({
    ...spell,
    isPicked: pickedDisplayNames.has(spell.displayName),
  }))
}

function enrichSynergyPairs(
  pairs: SynergyPairDisplay[],
  pickedDisplayNames: ReadonlySet<string>,
): SynergyPairDisplay[] {
  return pairs.map((pair) => ({
    ...pair,
    ability1IsPicked: pickedDisplayNames.has(pair.ability1DisplayName),
    ability2IsPicked: pickedDisplayNames.has(pair.ability2DisplayName),
    suggestedThird: pair.suggestedThird
      ? {
          ...pair.suggestedThird,
          isPicked: pickedDisplayNames.has(pair.suggestedThird.displayName),
        }
      : undefined,
  }))
}

function enrichHeroSynergies(
  synergies: HeroSynergyDisplay[],
  pickedDisplayNames: ReadonlySet<string>,
): HeroSynergyDisplay[] {
  return synergies.map((synergy) => ({
    ...synergy,
    isAbilityPicked: pickedDisplayNames.has(synergy.abilityDisplayName),
  }))
}

function enrichHeroModel(
  model: HeroModelDisplay,
  pickedDisplayNames: ReadonlySet<string>,
): HeroModelDisplay {
  return {
    ...model,
    topAbilitiesByWinrate: enrichTopSpells(
      model.topAbilitiesByWinrate,
      pickedDisplayNames,
    ),
    strongAbilitySynergies: enrichHeroSynergies(
      model.strongAbilitySynergies,
      pickedDisplayNames,
    ),
    weakAbilitySynergies: enrichHeroSynergies(
      model.weakAbilitySynergies,
      pickedDisplayNames,
    ),
  }
}

function enrichSlots(
  slots: EnrichedScanSlot[],
  pickedDisplayNames: ReadonlySet<string>,
): EnrichedScanSlot[] {
  return slots.map((slot) => ({
    ...slot,
    isPicked: slot.name ? pickedDisplayNames.has(slot.displayName) : false,
    highWinrateCombinations: enrichSynergyPairs(
      slot.highWinrateCombinations,
      pickedDisplayNames,
    ),
    lowWinrateCombinations: enrichSynergyPairs(
      slot.lowWinrateCombinations,
      pickedDisplayNames,
    ),
    strongHeroSynergies: enrichHeroSynergies(
      slot.strongHeroSynergies,
      pickedDisplayNames,
    ),
    weakHeroSynergies: enrichHeroSynergies(
      slot.weakHeroSynergies,
      pickedDisplayNames,
    ),
  }))
}
