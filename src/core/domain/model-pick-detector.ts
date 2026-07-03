import {
  MODEL_SLOT_MIN_LUMINANCE_DROP,
  MODEL_SLOT_PICKED_LUMINANCE_RATIO,
  MODEL_SLOT_PICKED_SATURATION_RATIO,
} from '@shared/constants/thresholds'
import type { IdentifiedHeroModel } from './types'

export interface SlotImageStats {
  meanLuminance: number
  meanSaturation: number
}

export type ModelSlotBaselines = Record<number, SlotImageStats>

/**
 * Returns hero_order values whose model slot looks picked compared to baseline.
 * Picked slots in Ability Draft are typically darker and less saturated (gray overlay).
 */
export function detectPickedHeroOrders(
  baselines: ModelSlotBaselines,
  current: ReadonlyMap<number, SlotImageStats>,
): number[] {
  const picked: number[] = []

  for (const [heroOrder, baseline] of Object.entries(baselines)) {
    const order = Number(heroOrder)
    const stats = current.get(order)
    if (!stats) continue
    if (isModelSlotPicked(baseline, stats)) {
      picked.push(order)
    }
  }

  return picked
}

export function isModelSlotPicked(
  baseline: SlotImageStats,
  current: SlotImageStats,
): boolean {
  if (baseline.meanLuminance <= 0) return false

  const luminanceRatio = current.meanLuminance / baseline.meanLuminance
  const luminanceDrop = baseline.meanLuminance - current.meanLuminance

  if (
    luminanceRatio < MODEL_SLOT_PICKED_LUMINANCE_RATIO &&
    luminanceDrop >= MODEL_SLOT_MIN_LUMINANCE_DROP
  ) {
    return true
  }

  if (baseline.meanSaturation <= 0) return false

  const saturationRatio = current.meanSaturation / baseline.meanSaturation
  return (
    saturationRatio < MODEL_SLOT_PICKED_SATURATION_RATIO &&
    luminanceRatio < MODEL_SLOT_PICKED_LUMINANCE_RATIO + 0.05
  )
}

export function mapPickedOrdersToHeroIds(
  pickedOrders: number[],
  heroModels: IdentifiedHeroModel[],
): number[] {
  const ids: number[] = []

  for (const heroOrder of pickedOrders) {
    const model = heroModels.find((m) => m.heroOrder === heroOrder)
    if (model?.dbHeroId !== null && model?.dbHeroId !== undefined) {
      ids.push(model.dbHeroId)
    }
  }

  return ids
}
