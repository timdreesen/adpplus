import { useCallback } from 'react'
import type { HeroModelDisplay, SlotCoordinate } from '@shared/types'

interface HeroPortraitHotspotProps {
  model: HeroModelDisplay
  heroCoord: SlotCoordinate
  heroesParams: { width: number; height: number }
  scaleFactor: number
  tooltipVisible: boolean
  onHover: (model: HeroModelDisplay, rect: DOMRect) => void
  onLeave: () => void
}

export function HeroPortraitHotspot({
  model,
  heroCoord,
  heroesParams,
  scaleFactor,
  tooltipVisible,
  onHover,
  onLeave,
}: HeroPortraitHotspotProps): React.ReactElement {
  const style: React.CSSProperties = {
    left: heroCoord.x / scaleFactor,
    top: heroCoord.y / scaleFactor,
    width: heroesParams.width / scaleFactor,
    height: heroesParams.height / scaleFactor,
  }

  let className = 'hero-portrait-hotspot'
  if (tooltipVisible) {
    className += ' snapshot-hidden-border'
  }

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      onHover(model, e.currentTarget.getBoundingClientRect())
    },
    [model, onHover],
  )

  return (
    <div
      className={className}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
      data-hero-name={model.heroDisplayName}
      aria-label={model.heroDisplayName}
      id={`hero-portrait-hotspot-${model.heroOrder}`}
    />
  )
}
