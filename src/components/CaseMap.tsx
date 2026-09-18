import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Murder } from '../data/schema'
import type { ClueLevel } from '../game/engine'
import { boundsFor } from './mapBounds'
import { groupByCoordinates } from './markerGroups'
import { collapsedLabel, shouldCollapse } from './markerSummary'
import { formatDate } from './format'
import { useLang, useT } from '../i18n'

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function FitBounds({ murders }: { murders: Murder[] }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(boundsFor(murders), { paddingTopLeft: [40, 90], paddingBottomRight: [40, 40], maxZoom: 11 })
  }, [map, murders])
  return null
}

interface Props {
  murders: Murder[]
  level: ClueLevel
  /** Cifra total de víctimas del caso, si los asesinatos listados son solo una muestra. */
  toll?: number | null
}

export function CaseMap({ murders, level, toll = null }: Props) {
  const lang = useLang()
  const t = useT()
  const groups = groupByCoordinates(murders)
  return (
    <MapContainer className="case-map" center={[20, 0]} zoom={2} scrollWheelZoom={true}>
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <FitBounds murders={murders} />
      {groups.map((g, gi) => (
        <CircleMarker
          key={gi}
          center={[g.lat, g.lng]}
          radius={Math.min(9 + 2 * (g.indexes.length - 1), 15)}
          pathOptions={{ color: '#d9a441', fillColor: '#b3382c', fillOpacity: 0.85, weight: 2 }}
        >
          <Tooltip permanent={true} direction="top" offset={[0, -8]} className="marker-tip">
            {shouldCollapse(g.indexes.length) ? (
              <div>
                <strong>{collapsedLabel(g.indexes.length, toll, t)}</strong>
              </div>
            ) : (
              g.indexes.map((i) => (
                <div key={i}>
                  <strong>{i + 1}</strong>
                  {level >= 1 ? <span> · {formatDate(murders[i], lang)}</span> : null}
                  {level >= 2 ? <span> · {murders[i].victim}</span> : null}
                </div>
              ))
            )}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
