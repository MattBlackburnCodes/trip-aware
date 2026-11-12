import { useMemo, useState, useRef } from 'react'
import { Link } from 'react-router'
import { Minus, Plus, RotateCcw, Search } from 'lucide-react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import atlas from 'world-atlas/countries-110m.json'
import { type Advisory, levelText, levels } from './types'

const topology = atlas as Parameters<typeof feature>[0] & { objects: { countries: string } }
const collection = feature(topology, topology.objects.countries) as unknown as {
  features: { id?: string; properties: { name: string }; geometry: Parameters<ReturnType<typeof geoPath>>[0] }[]
}
const projection = geoNaturalEarth1().scale(163).translate([480, 275])
const draw = geoPath(projection)
const shapes = collection.features.filter(country => country.id !== '010').map(country => ({
  id: country.id, name: country.properties.name, path: draw(country.geometry),
}))
export const colors = ['#b6c4ce', '#4cae89', '#e8c764', '#ec995b', '#d9676d']

export function WorldMap({ advisories, preview = false }: { advisories: Advisory[]; preview?: boolean }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [level, setLevel] = useState('')
  const [query, setQuery] = useState('')
  const [hover, setHover] = useState<{ name: string; label: string } | null>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const matches = useMemo(() => new Map(advisories.filter(row => row.numeric).map(row => [row.numeric, row])), [advisories])
  const visible = advisories.filter(row => (!level || String(row.level) === level) && row.name.toLowerCase().includes(query.trim().toLowerCase()))
  const ids = new Set(visible.map(row => row.numeric))
  const selected = Boolean(level || query.trim())
  const magnify = (amount: number) => {
    const next = Math.max(1, Math.min(5, zoom + amount))
    setZoom(next)
    if (next === 1) setPan({ x: 0, y: 0 })
  }
  return <div className={preview ? 'map-preview' : 'map-panel'}>
    {!preview && <div className="filters">
      <label><Search size={18}/><input type="search" placeholder="Find a country on the map" aria-label="Find a country on the map" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <select aria-label="Filter map by advisory level" value={level} onChange={e => setLevel(e.target.value)}>
        <option value="">All advisory levels</option>{levels.map(n => <option key={n} value={n}>Level {n} · {levelText[n]}</option>)}
      </select>
    </div>}
    <div className="map-stage">
      <svg viewBox="0 0 960 500" aria-hidden="true" style={{ touchAction: zoom > 1 ? 'none' : 'pan-y' }}
        onPointerDown={e => { if (!preview && zoom > 1) drag.current = { x: e.clientX, y: e.clientY, moved: false } }}
        onPointerMove={e => {
          if (!drag.current || e.buttons !== 1) return
          const dx = e.clientX - drag.current.x
          const dy = e.clientY - drag.current.y
          if (!drag.current.moved && Math.hypot(dx, dy) < 4) return
          const ratio = 960 / e.currentTarget.getBoundingClientRect().width
          drag.current = { x: e.clientX, y: e.clientY, moved: true }
          setPan(p => ({ x: Math.max(-960, Math.min(960, p.x + dx * ratio)), y: Math.max(-500, Math.min(500, p.y + dy * ratio)) }))
        }}
        onPointerLeave={() => { setHover(null); drag.current = null }}>
        <g transform={'translate(' + (480 + pan.x) + ' ' + (250 + pan.y) + ') scale(' + zoom + ') translate(-480 -250)'}>
          {shapes.map(shape => {
            const row = matches.get(shape.id ?? null)
            const active = !selected || ids.has(shape.id ?? null)
            const label = row ? 'Level ' + row.level + ' · ' + levelText[row.level] : 'Advisory unavailable'
            const path = <path d={shape.path ?? ''} fill={colors[active ? row?.level ?? 0 : 0]}
              opacity={active ? 1 : .45} vectorEffect="non-scaling-stroke"
              onPointerEnter={() => setHover({ name: row?.name ?? shape.name, label })}/>
            return row && active && !preview
              ? <Link key={shape.name} to={'/destinations/' + row.slug} tabIndex={-1} onClick={e => { if (drag.current?.moved) e.preventDefault(); drag.current = null }}>{path}</Link>
              : <g key={shape.name}>{path}</g>
          })}
        </g>
      </svg>
      {hover && <div className="map-tooltip"><strong>{hover.name}</strong><span>{hover.label}</span></div>}
      {!preview && <div className="map-controls">
        <button aria-label="Zoom in" onClick={() => magnify(.5)} disabled={zoom >= 5}><Plus size={18}/></button>
        <button aria-label="Zoom out" onClick={() => magnify(-.5)} disabled={zoom <= 1}><Minus size={18}/></button>
        <button aria-label="Reset map view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><RotateCcw size={17}/></button>
      </div>}
    </div>
    <div className="map-legend" aria-label="Map legend">
      {levels.map(n => <span key={n}><i style={{ background: colors[n] }}/><b>Level {n}</b> {levelText[n]}</span>)}
      <span><i style={{ background: colors[0] }}/>Unavailable</span>
    </div>
    {!preview && <details className="map-alternative" open={selected || undefined}><summary>Browse matching destinations ({visible.length})</summary>
      <ul>{visible.map(row => <li key={row.slug}><Link to={'/destinations/' + row.slug}>{row.name} · Level {row.level}</Link></li>)}</ul>
      {!visible.length && <p>No destinations match your search.</p>}
    </details>}
  </div>
}

