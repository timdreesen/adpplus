import sharp from 'sharp'
import type { SlotCoordinate } from '@shared/types'
import type { SlotImageStats } from '@core/domain/model-pick-detector'

/**
 * Computes mean luminance and saturation for a cropped slot image.
 * Used to detect picked hero model slots (darkened/desaturated overlays).
 */
export async function computeSlotImageStats(
  screenshotBuffer: Buffer,
  slot: SlotCoordinate,
): Promise<SlotImageStats | null> {
  if (slot.width <= 0 || slot.height <= 0) return null

  try {
    const { data, info } = await sharp(screenshotBuffer)
      .extract({
        left: Math.round(slot.x),
        top: Math.round(slot.y),
        width: Math.round(slot.width),
        height: Math.round(slot.height),
      })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixelCount = info.width * info.height
    if (pixelCount === 0) return null

    let luminanceSum = 0
    let saturationSum = 0

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      luminanceSum += 0.299 * r + 0.587 * g + 0.114 * b
      saturationSum += rgbToSaturation(r, g, b)
    }

    return {
      meanLuminance: luminanceSum / pixelCount,
      meanSaturation: saturationSum / pixelCount,
    }
  } catch {
    return null
  }
}

export async function computeModelSlotStatsMap(
  screenshotBuffer: Buffer,
  modelCoords: SlotCoordinate[],
): Promise<Map<number, SlotImageStats>> {
  const stats = new Map<number, SlotImageStats>()

  await Promise.all(
    modelCoords.map(async (coord) => {
      const slotStats = await computeSlotImageStats(screenshotBuffer, coord)
      if (slotStats) {
        stats.set(coord.hero_order, slotStats)
      }
    }),
  )

  return stats
}

function rgbToSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max <= 0) return 0
  return (max - min) / max
}
