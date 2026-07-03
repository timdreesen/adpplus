import { getHeroAttackType } from '@core/data/hero-attack-types'
import type { AbilityLookup } from './data-transformer'
import type { TransformedHeroAbilitySynergy, WindrunStaticHero } from './types'

export interface AbilityAttackTypeWinrates {
  meleeWinrate: number | null
  rangedWinrate: number | null
}

interface PickBucket {
  wins: number
  picks: number
}

interface AbilityBuckets {
  melee: PickBucket
  ranged: PickBucket
}

export interface HeroAbilityPickForAttackType {
  abilityName: string
  heroWindrunId: number
  abilityOwnerHeroId: number
  winrate: number
  numPicks: number
}

export function buildHeroNameToWindrunId(
  staticHeroes: Record<string, WindrunStaticHero>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const hero of Object.values(staticHeroes)) {
    map.set(hero.shortName, hero.id)
  }
  return map
}

export function buildAbilityNameToOwnerHeroId(abilityLookup: AbilityLookup): Map<string, number> {
  const map = new Map<string, number>()
  for (const ability of abilityLookup.values()) {
    map.set(ability.shortName, ability.ownerHeroId)
  }
  return map
}

export function heroPairsToAttackTypePicks(
  heroPairs: TransformedHeroAbilitySynergy[],
  heroNameToWindrunId: Map<string, number>,
  abilityNameToOwnerHeroId: Map<string, number>,
): HeroAbilityPickForAttackType[] {
  const picks: HeroAbilityPickForAttackType[] = []

  for (const pair of heroPairs) {
    const heroWindrunId = heroNameToWindrunId.get(pair.heroName)
    const abilityOwnerHeroId = abilityNameToOwnerHeroId.get(pair.abilityName)
    if (heroWindrunId === undefined || abilityOwnerHeroId === undefined) continue

    picks.push({
      abilityName: pair.abilityName,
      heroWindrunId,
      abilityOwnerHeroId,
      winrate: pair.synergyWinrate,
      numPicks: pair.numPicks,
    })
  }

  return picks
}

/** Pick-weighted melee/ranged win rates per drafted ability (excludes native kit picks). */
export function computeAbilityAttackTypeWinrates(
  picks: HeroAbilityPickForAttackType[],
  minPicks = 1,
): Map<string, AbilityAttackTypeWinrates> {
  const buckets = new Map<string, AbilityBuckets>()

  for (const pick of picks) {
    if (pick.abilityOwnerHeroId === pick.heroWindrunId) continue

    const attackType = getHeroAttackType(pick.heroWindrunId)
    if (!attackType) continue

    let abilityBuckets = buckets.get(pick.abilityName)
    if (!abilityBuckets) {
      abilityBuckets = {
        melee: { wins: 0, picks: 0 },
        ranged: { wins: 0, picks: 0 },
      }
      buckets.set(pick.abilityName, abilityBuckets)
    }

    const bucket = abilityBuckets[attackType]
    bucket.picks += pick.numPicks
    bucket.wins += pick.winrate * pick.numPicks
  }

  const result = new Map<string, AbilityAttackTypeWinrates>()
  for (const [abilityName, { melee, ranged }] of buckets) {
    result.set(abilityName, {
      meleeWinrate: melee.picks >= minPicks ? melee.wins / melee.picks : null,
      rangedWinrate: ranged.picks >= minPicks ? ranged.wins / ranged.picks : null,
    })
  }

  return result
}
