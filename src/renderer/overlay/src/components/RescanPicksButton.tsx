import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMousePassthrough } from '../hooks/use-mouse-passthrough'

interface RescanPicksButtonProps {
  variant?: 'blue' | 'green'
}

export function RescanPicksButton({
  variant = 'blue',
}: RescanPicksButtonProps): React.ReactElement {
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

  const colorClass =
    variant === 'green' ? 'overlay-btn-green' : 'overlay-btn-blue'

  return (
    <div className="rescan-picks-control">
      <button
        type="button"
        className={`overlay-btn ${colorClass}`}
        onClick={handleRescanPicks}
        disabled={isRescanning}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ minHeight: 28, padding: '4px 10px', fontSize: 12 }}
        title={t('topHeroes.rescanPicksTooltip')}
      >
        {isRescanning ? t('topHeroes.rescanning') : t('topHeroes.rescanPicks')}
      </button>
      {rescanError && (
        <div className="rescan-picks-error">{rescanError}</div>
      )}
    </div>
  )
}
