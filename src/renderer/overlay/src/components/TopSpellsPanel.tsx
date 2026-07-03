import { useTranslation } from 'react-i18next'
import { useMousePassthrough } from '../hooks/use-mouse-passthrough'
import { RescanPicksButton } from './RescanPicksButton'
import type { HeroTopAbilityDisplay } from '@shared/types'

interface TopSpellsPanelProps {
  spells: HeroTopAbilityDisplay[]
  visible: boolean
  onToggle: () => void
}

function formatWr(wr: number | null): string {
  if (wr === null) return '—'
  return `${(wr * 100).toFixed(1)}%`
}

export function TopSpellsPanel({
  spells,
  visible,
  onToggle,
}: TopSpellsPanelProps): React.ReactElement | null {
  const { t } = useTranslation()
  const { onMouseEnter, onMouseLeave } = useMousePassthrough()

  if (spells.length === 0) return null

  if (!visible) {
    return (
      <button
        className="overlay-btn overlay-interactive overlay-btn-green"
        onClick={onToggle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {t('topSpells.show')}
      </button>
    )
  }

  return (
    <div
      className="top-spells-panel overlay-interactive"
      role="region"
      aria-label={t('topSpells.title')}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="top-spells-panel-header">
        <span className="top-spells-panel-title">{t('topSpells.title')}</span>
        <div className="top-spells-panel-header-actions">
          <RescanPicksButton variant="green" />
          <button
            className="overlay-btn overlay-btn-green"
            onClick={onToggle}
            style={{ minHeight: 28, padding: '4px 10px', fontSize: 12 }}
          >
            {t('topSpells.hide')}
          </button>
        </div>
      </div>

      {spells.map((spell, index) => (
        <div
          key={`${spell.displayName}-${index}`}
          className={`top-spells-panel-item${spell.isPicked ? ' overlay-item-picked' : ''}`}
        >
          <span className="top-spells-panel-rank">{index + 1}.</span>
          <span className="top-spells-panel-name">{spell.displayName}</span>
          <span className="top-spells-panel-wr">{formatWr(spell.winrate)}</span>
        </div>
      ))}
    </div>
  )
}
