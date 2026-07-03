import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMousePassthrough } from '../hooks/use-mouse-passthrough'
import type { TopHeroByWinrateDisplay } from '@shared/types'

interface TopHeroesPanelProps {
  heroes: TopHeroByWinrateDisplay[]
  visible: boolean
  onToggle: () => void
}

function formatWr(wr: number | null): string {
  if (wr === null) return '—'
  return `${(wr * 100).toFixed(1)}%`
}

export function TopHeroesPanel({
  heroes,
  visible,
  onToggle,
}: TopHeroesPanelProps): React.ReactElement | null {
  const { t } = useTranslation()
  const { onMouseEnter, onMouseLeave } = useMousePassthrough()
  const [isRescanning, setIsRescanning] = useState(false)
  const [rescanError, setRescanError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = window.electronApi.on('draft:rescanPickedHeroes', (data) => {
      setIsRescanning(false)
      if (!data.success && data.error) {
        setRescanError(data.error)
      } else {
        setRescanError(null)
      }
    })
    return unsub
  }, [])

  const handleRescanPicks = (): void => {
    setIsRescanning(true)
    setRescanError(null)
    window.electronApi.send('draft:rescanPickedHeroes')
  }

  if (heroes.length === 0) return null

  if (!visible) {
    return (
      <button
        className="overlay-btn overlay-interactive overlay-btn-blue"
        onClick={onToggle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {t('topHeroes.show')}
      </button>
    )
  }

  return (
    <div
      className="top-heroes-panel overlay-interactive"
      role="region"
      aria-label={t('topHeroes.title')}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="top-heroes-panel-header">
        <span className="top-heroes-panel-title">{t('topHeroes.title')}</span>
        <div className="top-heroes-panel-header-actions">
          <button
            className="overlay-btn overlay-btn-blue"
            onClick={handleRescanPicks}
            disabled={isRescanning}
            style={{ minHeight: 28, padding: '4px 10px', fontSize: 12 }}
            title={t('topHeroes.rescanPicksTooltip')}
          >
            {isRescanning ? t('topHeroes.rescanning') : t('topHeroes.rescanPicks')}
          </button>
          <button
            className="overlay-btn overlay-btn-blue"
            onClick={onToggle}
            style={{ minHeight: 28, padding: '4px 10px', fontSize: 12 }}
          >
            {t('topHeroes.hide')}
          </button>
        </div>
      </div>

      {rescanError && (
        <div className="top-heroes-panel-error">{rescanError}</div>
      )}

      {heroes.map((hero) => (
        <button
          key={hero.heroId}
          type="button"
          className={`top-heroes-panel-item${hero.isDrafted ? ' top-heroes-panel-item-drafted' : ''}`}
          onClick={() => {
            window.electronApi.send('draft:toggleHeroDrafted', {
              dbHeroId: hero.heroId,
            })
          }}
          title={t('topHeroes.toggleDrafted')}
        >
          <span className="top-heroes-panel-name">{hero.displayName}</span>
          <span className="top-heroes-panel-wr">({formatWr(hero.winrate)})</span>
        </button>
      ))}
    </div>
  )
}
