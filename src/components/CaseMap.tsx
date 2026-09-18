import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Murder } from '../data/schema'
import type { ClueLevel } from '../game/engine'
import { boundsFor } from './mapBounds'
import { formatDate } from './ClueList'

const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function FitBounds({ murders }: { murders: Murder[] }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(boundsFor(murders), { padding: [40, 40], maxZoom: 11 })
  }, [map, murders])
  return null
}

interface Props {
  murders: Murder[]
  level: ClueLevel
}

export function CaseMap({ murders, level }: Props) {
  return (
    <MapContainer className="case-map" center={[20, 0]} zoom={2} scrollWheelZoom={true}>
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <FitBounds murders={murders} />
      {murders.map((m, i) => (
        <CircleMarker
          key={i}
          center={[m.lat, m.lng]}
          radius={9}
          pathOptions={{ color: '#d9a441', fillColor: '#b3382c', fillOpacity: 0.85, weight: 2 }}
        >
          <Tooltip permanent={true} direction="top" offset={[0, -8]} className="marker-tip">
            <strong>{i + 1}</strong>
            {level >= 1 ? <span> · {formatDate(m)}</span> : null}
            {level >= 2 ? <span> · {m.victim}</span> : null}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
