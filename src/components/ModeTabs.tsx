import { useT } from '../i18n'
import type { Key } from '../i18n'

export type Mode = 'daily' | 'infinite' | 'duel'

const TABS: { mode: Mode; hash: string; key: Key }[] = [
  { mode: 'daily', hash: '#', key: 'tabs.daily' },
  { mode: 'infinite', hash: '#infinito', key: 'tabs.infinite' },
  { mode: 'duel', hash: '#mas-o-menos', key: 'tabs.duel' },
]

interface Props {
  active: Mode
  /** Con `tolls.json` vacío no hay partida posible: la pestaña se ve, pero no lleva a ningún sitio. */
  duelEnabled?: boolean
}

export function ModeTabs({ active, duelEnabled = true }: Props) {
  const t = useT()
  return (
    <nav className="mode-tabs" aria-label={t('tabs.label')}>
      {TABS.map(({ mode, hash, key }) => {
        const label = t(key)
        if (mode === active) {
          return <span key={mode} className="mode-tab mode-tab-active" aria-current="page">{label}</span>
        }
        if (mode === 'duel' && !duelEnabled) {
          return <span key={mode} className="mode-tab mode-tab-disabled" aria-disabled="true">{label}</span>
        }
        return <a key={mode} className="mode-tab" href={hash}>{label}</a>
      })}
    </nav>
  )
}
