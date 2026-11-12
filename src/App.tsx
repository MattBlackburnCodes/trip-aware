import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useNavigationType, useParams, useSearchParams } from 'react-router'
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Clock3, Compass, Globe2, Map as MapIcon, MapPin, Menu, Moon, Search, ShieldCheck, Sun, TriangleAlert, X } from 'lucide-react'
import { WorldMap } from './WorldMap'
import { date, empty, flag, levels, levelText, observedDate, observedTime, sourceName, sourceUrl, type Advisory, type Change, type Level, type Snapshot } from './types'

const regions = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']
const labels = ['Normal precautions', 'Increased caution', 'Reconsider travel', 'Do not travel']

function Badge({ level }: { level: Level }) {
  return <span className={'badge level-' + level}><i/> Level {level}</span>
}

function Logo() {
  return <Link className="brand" to="/" aria-label="TripAware home"><img src="/compass.svg" alt="" width="40" height="40"/><span>Trip<span>Aware</span><small>A BLACKBURN WORKS PRODUCT</small></span></Link>
}

function Header() {
  const [menu, setMenu] = useState(false)
  const [theme, setTheme] = useState('')
  const { pathname } = useLocation()
  useEffect(() => { setTheme(document.documentElement.dataset.theme ?? 'light') }, [])
  useEffect(() => { setMenu(false) }, [pathname])
  return <header><div className="shell header-inner">
    <Logo/>
    <nav className={menu ? 'nav is-open' : 'nav'} aria-label="Primary">
      <NavLink to="/map">Explore Map</NavLink><NavLink to="/destinations">Destinations</NavLink>
      <NavLink to="/advisories">Travel Advisories</NavLink><NavLink to="/about">About</NavLink>
    </nav>
    <div className="header-actions">
      <button className="icon-button" aria-label="Toggle light and dark theme" onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark'
        document.documentElement.dataset.theme = next
        try { localStorage.setItem('tripaware-theme', next) } catch { /* Theme still applies for this session. */ }
        setTheme(next)
      }}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>
      <button className="icon-button menu-toggle" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    </div>
  </div></header>
}

function Footer() {
  return <footer><div className="shell footer-main">
    <div><Logo/><p>Official travel advisory information for U.S. travelers.</p></div>
    <div className="footer-links"><Link to="/map">World map</Link><Link to="/destinations">Destinations</Link><Link to="/advisories">Advisory changes</Link><Link to="/about">About TripAware</Link></div>
    <a href={sourceUrl}>Travel.State.Gov <ArrowUpRight size={16}/></a>
  </div><div className="shell footer-bottom">TripAware is an independent product of Blackburn Works LLC. Advisory data comes from the U.S. Department of State RSS feed.</div></footer>
}

function Freshness({ data, failed }: { data: Snapshot; failed: boolean }) {
  const [stale, setStale] = useState(() => Boolean(data.verifiedAt && Date.now() - +new Date(data.verifiedAt) > 36 * 60 * 60 * 1000))
  useEffect(() => { setStale(Boolean(data.verifiedAt && Date.now() - +new Date(data.verifiedAt) > 36 * 60 * 60 * 1000)) }, [data.verifiedAt])
  if (!data.verifiedAt) return <p className="notice"><TriangleAlert size={18}/> Advisory data is unavailable. <a href={sourceUrl}>Check official advisories <ArrowUpRight size={14}/></a></p>
  if (stale || failed || data.syncFailed) return <p className="notice"><TriangleAlert size={18}/> Showing the last available RSS snapshot from {observedTime(data.verifiedAt)}. <a href={sourceUrl}>Check official advisories <ArrowUpRight size={14}/></a></p>
  return <p className="notice"><ShieldCheck size={18}/> State Department RSS checked {observedTime(data.verifiedAt)}. <a href={sourceUrl}>Check the official advisory index for the latest guidance <ArrowUpRight size={14}/></a></p>
}

function SearchBox() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  function submit(event: FormEvent) {
    event.preventDefault()
    navigate('/destinations' + (query.trim() ? '?' + new URLSearchParams({ q: query.trim() }) : ''))
  }
  return <form className="hero-search" onSubmit={submit}><Search size={23}/><input type="search" aria-label="Search for a destination" placeholder="Search for a destination" value={query} onChange={e => setQuery(e.target.value)}/><button aria-label="Search destinations"><ArrowRight size={22}/></button></form>
}

function DestinationCard({ row }: { row: Advisory }) {
  return <Link className="destination-card" to={'/destinations/' + row.slug}>
    <span className="flag" aria-hidden="true">{flag(row.iso2) || <MapPin size={24}/>}</span>
    <span className="card-name"><strong>{row.name}</strong><small>{row.region ?? 'Region unavailable'}</small></span>
    <Badge level={row.level}/><small className="card-date"><CalendarDays size={14}/> {date(row.publishedAt)}</small>
    <ArrowUpRight className="card-arrow" size={18}/>
  </Link>
}

function Home({ data, failed }: { data: Snapshot; failed: boolean }) {
  const recent = [...data.advisories].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6)
  return <>
    <section className="hero"><div className="shell hero-inner">
      <div className="hero-copy">
        <div className="hero-source"><ShieldCheck size={16}/> U.S. STATE DEPARTMENT ADVISORIES</div>
        <h1>Know Before<br/>{' '}You Go<span>.</span></h1>
        <p>Explore official travel advisories, understand destination risks, and make informed decisions before your next adventure.</p>
        <SearchBox/>
        <Link className="button hero-map-button" to="/map"><Globe2 size={19}/> Explore World Map <ArrowRight size={17}/></Link>
      </div>
      <div className="hero-visual">
        <div className="hero-orbit" aria-hidden="true"/><Compass className="hero-compass" size={45} strokeWidth={1}/>
        <div className="hero-map"><WorldMap advisories={data.advisories} preview/></div>
        <div className="hero-map-caption"><span><Globe2 size={14}/> GLOBAL ADVISORY MAP</span><Link to="/map" aria-label="Open global advisory map"><ArrowUpRight size={17}/></Link></div>
      </div>
    </div></section>
    <section className="shell overview" aria-label="Advisory overview">
      <div className="stat"><Globe2 size={22}/><strong>{data.verifiedAt ? data.advisories.length : '—'}</strong><span>Destinations covered</span></div>
      {levels.map(n => <Link key={n} className={'stat stat-' + n} to={'/destinations?level=' + n}><span className="stat-label"><i/> Level {n}</span><strong>{data.verifiedAt ? data.advisories.filter(row => row.level === n).length : '—'}</strong><span>{labels[n - 1]}</span></Link>)}
      <div className="stat updated"><Clock3 size={19}/><strong>{data.verifiedAt ? observedDate(data.verifiedAt) : 'Unavailable'}</strong><span>Last RSS verification</span></div>
    </section>
    <div className="shell"><Freshness data={data} failed={failed}/></div>
    <section className="shell home-section">
      <div className="section-heading"><div><h2>Browse by region</h2><p>Explore advisories for the destinations on your itinerary.</p></div><Link className="text-link" to="/destinations">All destinations <ArrowRight size={17}/></Link></div>
      <div className="region-grid">{regions.map(region => <Link key={region} to={'/destinations?' + new URLSearchParams({ region })}><MapPin size={21}/><strong>{region}</strong><ArrowUpRight size={16}/></Link>)}</div>
    </section>
    <section className="shell home-section">
      <div className="section-heading"><div><h2>Recently issued advisories</h2><p>Latest publication dates in the official RSS feed.</p></div><Link className="text-link" to="/advisories">Advisory changes <ArrowRight size={17}/></Link></div>
      {recent.length ? <div className="destination-grid">{recent.map(row => <DestinationCard key={row.slug} row={row}/>)}</div> : <p className="empty">No advisories are available.</p>}
    </section>
    <section className="levels-section"><div className="shell home-section"><h2>Understand the advisory levels</h2><p>Advisories can vary within a country. Read the official guidance for your itinerary.</p><LevelGuide/></div></section>
    <section className="shell home-section"><div className="source-card"><ShieldCheck size={32}/><div><h2>How TripAware works</h2><p>TripAware checks the State Department’s official advisory feed and records changes after each successful synchronization.</p></div><Link className="button secondary" to="/about">See sources <ArrowRight size={16}/></Link></div></section>
  </>
}

function LevelGuide() {
  return <div className="level-guide">{levels.map(n => <div key={n}><Badge level={n}/><h3>{levelText[n]}</h3></div>)}</div>
}

function Directory({ data }: { data: Snapshot }) {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const region = params.get('region') ?? ''
  const level = params.get('level') ?? ''
  const sort = params.get('sort') ?? ''
  function update(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace, preventScrollReset: true })
  }
  const rows = data.advisories.filter(row => (!region || row.region === region) && (!level || String(row.level) === level) &&
    [row.name, row.iso2, row.iso3].some(text => text?.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => (sort === 'level' ? b.level - a.level : 0) || a.name.localeCompare(b.name, 'en'))
  return <section className="shell page">
    <div className="page-intro"><MapPin size={26}/><h1>Destinations</h1><p>Find State Department travel advisories by country or region.</p></div>
    <div className="filters">
      <label><Search size={18}/><input type="search" aria-label="Search destinations" placeholder="Search destinations" value={q} onChange={e => update('q', e.target.value, true)}/></label>
      <select aria-label="Advisory level" value={level} onChange={e => update('level', e.target.value)}><option value="">All levels</option>{levels.map(n => <option value={n} key={n}>Level {n}</option>)}</select>
      <select aria-label="Region" value={region} onChange={e => update('region', e.target.value)}><option value="">All regions</option>{regions.map(r => <option key={r}>{r}</option>)}</select>
      <select aria-label="Sort destinations" value={sort} onChange={e => update('sort', e.target.value)}><option value="">Name A–Z</option><option value="level">Highest level first</option></select>
    </div>
    <p className="results" aria-live="polite">{rows.length} {rows.length === 1 ? 'destination' : 'destinations'}</p>
    {rows.length ? <div className="destination-grid">{rows.map(row => <DestinationCard key={row.slug} row={row}/>)}</div>
      : <div className="empty"><p>{data.advisories.length ? 'No destinations match your filters.' : 'Advisory data is unavailable.'}</p>{data.advisories.length > 0 && <Link to="/destinations">Clear filters</Link>}</div>}
  </section>
}

function Changes({ changes, rows }: { changes: Change[]; rows: Advisory[] }) {
  const names = new Map(rows.map(row => [row.slug, row.name]))
  if (!changes.length) return <p className="empty">No advisory changes have been recorded yet.</p>
  return <ol className="changes">{changes.map((change, index) => <li key={change.slug + change.detectedAt + index}>
    <div><Link to={'/destinations/' + change.slug}>{names.get(change.slug) ?? change.slug}</Link><p>{change.kind === 'level' ? 'Advisory level changed' : 'Advisory text updated'}</p></div>
    <div className="change-level"><Badge level={change.previousLevel}/>{change.kind === 'level' && <><ArrowRight size={16}/><Badge level={change.newLevel}/></>}</div>
    <div><strong>Observed {observedDate(change.detectedAt)}</strong><p>Published {date(change.publishedAt)}</p></div>
    <a href={change.url} aria-label={'Official source for ' + (names.get(change.slug) ?? change.slug)}><ArrowUpRight size={20}/></a>
  </li>)}</ol>
}

function Country({ data, loading }: { data: Snapshot; loading: boolean }) {
  const { slug } = useParams()
  const row = data.advisories.find(item => item.slug === slug)
  if (!row) return loading ? <p className="shell page" role="status">Loading destination…</p> : <Missing/>
  const related = row.region ? data.advisories.filter(item => item.slug !== slug && item.region === row.region).slice(0, 3) : []
  return <article className="shell page country">
    <Link className="text-link" to="/destinations">← All destinations</Link>
    <div className="page-intro"><span className="country-flag" aria-hidden="true">{flag(row.iso2)}</span><h1>{row.name}</h1><p>{row.region && row.region + ' · '}U.S. travel advisory</p></div>
    <div className={'country-status level-' + row.level}><Badge level={row.level}/><h2>{levelText[row.level]}</h2><p>Official issue date {date(row.publishedAt)} · Feed verified {observedTime(row.verifiedAt)}</p><a href={row.url}>Read the official advisory <ArrowUpRight size={17}/></a></div>
    <p className="notice"><TriangleAlert size={18}/> Travel advisory levels are not guarantees of personal safety. Check the official advisory before travel.</p>
    <div className="country-body">
      {row.summary && <section><h2>Official advisory</h2>{row.summary.split('\n\n').map((line, i) => <p key={i}>{line}</p>)}</section>}
      <aside><h2>Safety and security</h2>
        {row.risks.length > 0 && <ul>{row.risks.map(risk => <li key={risk}>{risk}</li>)}</ul>}
        {row.safety && <p>{row.safety}</p>}
        <p>See the official destination page for full regional guidance, safety information, and emergency contacts.</p><a href={row.url}>{sourceName} <ArrowUpRight size={16}/></a>
        {row.emergency && <><h3>Emergency information</h3><p>{row.emergency}</p></>}
        {row.warnings.length > 0 && <><h3>Warnings in the official feed</h3><ul>{row.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></>}
      </aside>
    </div>
    <section className="home-section"><h2>Advisory history</h2><Changes changes={data.changes.filter(change => change.slug === slug)} rows={[row]}/></section>
    {related.length > 0 && <section><h2>Related destinations</h2><div className="destination-grid">{related.map(item => <DestinationCard key={item.slug} row={item}/>)}</div></section>}
  </article>
}

function Missing() {
  return <section className="shell page"><h1>Page unavailable</h1><p>We couldn’t find that destination or page.</p><Link className="button secondary" to="/destinations">Browse destinations <ArrowRight size={16}/></Link></section>
}

export function metadata(path: string, data: Snapshot) {
  const slug = path.match(/^\/destinations\/([^/]+)\/?$/)?.[1]
  const row = data.advisories.find(advisory => advisory.slug === slug)
  if (row) return { title: row.name + ' Travel Advisory | TripAware', description: row.name + ' is listed at Level ' + row.level + ' in the U.S. State Department RSS feed. Review the publication date and official guidance.' }
  const titles: Record<string, string> = { '/map': 'World Travel Advisory Map', '/destinations': 'Destination Directory', '/advisories': 'Travel Advisory Changes', '/about': 'About and Data Sources' }
  return { title: path === '/' ? 'TripAware | Know Before You Go' : (titles[path] ?? 'Page unavailable') + ' | TripAware',
    description: 'Explore U.S. State Department travel advisories by destination, region, and advisory level.' }
}

export function App({ initial = empty, live = true }: { initial?: Snapshot; live?: boolean }) {
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(live && !initial.verifiedAt)
  const [failed, setFailed] = useState(false)
  const { pathname } = useLocation()
  const navigation = useNavigationType()
  const previousPath = useRef(pathname)
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    if (navigation !== 'POP') {
      if (window.scrollY) window.scrollTo(0, 0)
      main.current?.focus({ preventScroll: true })
    }
  }, [navigation, pathname])
  useEffect(() => {
    if (!live) return
    const controller = new AbortController()
    const readSnapshot = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('Feed unavailable')
      const next = await response.json() as Snapshot
      if (!Array.isArray(next.advisories) || !Array.isArray(next.changes)) throw new Error('Invalid feed')
      return next
    }
    const isNewEnough = (next: Snapshot) => Boolean(next.verifiedAt &&
      (!initial.verifiedAt || +new Date(next.verifiedAt) >= +new Date(initial.verifiedAt)))
    if (import.meta.env.PROD) {
      void readSnapshot('/advisory-snapshot.json').then(next => {
        if (!controller.signal.aborted) setData(previous =>
          previous.verifiedAt && next.verifiedAt && +new Date(previous.verifiedAt) > +new Date(next.verifiedAt) ? previous : next)
      }).catch(() => {})
    }
    readSnapshot('/api/advisories').then(next => {
      if (isNewEnough(next)) setData(next)
      else if (import.meta.env.PROD) setFailed(true)
    }).catch(() => { if (!controller.signal.aborted && import.meta.env.PROD) setFailed(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [initial, live])
  useEffect(() => {
    const meta = metadata(pathname, data)
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', new URL(pathname, document.querySelector('link[rel="canonical"]')?.getAttribute('href') || location.origin).href)
  }, [pathname, data])
  return <><a className="skip-link" href="#main">Skip to content</a><Header/><main id="main" ref={main} tabIndex={-1}>
    {loading && <p className="shell results" role="status">Loading advisories…</p>}
    {pathname !== '/' && pathname !== '/about' && !loading && <div className="shell"><Freshness data={data} failed={failed}/></div>}
    <Routes>
      <Route index element={<Home data={data} failed={failed}/>}/>
      <Route path="/destinations" element={<Directory data={data}/>}/>
      <Route path="/destinations/:slug" element={<Country data={data} loading={loading}/>}/>
      <Route path="/map" element={<section className="shell page"><div className="page-intro"><MapIcon size={26}/><h1>World advisory map</h1><p>Select a country to open its advisory. Zoom in to pan the map.</p></div><WorldMap advisories={data.advisories}/></section>}/>
      <Route path="/advisories" element={<section className="shell page"><div className="page-intro"><ArrowDownRight size={26}/><h1>Advisory changes</h1><p>Changes TripAware observed in the official feed, with government publication dates shown separately.</p></div><Changes changes={data.changes} rows={data.advisories}/><LevelGuide/></section>}/>
      <Route path="/about" element={<section className="shell page"><div className="page-intro"><Compass size={26}/><h1>About TripAware</h1><p>Know Before You Go. A Blackburn Works Product.</p></div><div className="prose-card"><h2>Official sources</h2><p>TripAware is an independent public resource from Blackburn Works LLC. We track travel advisories from the U.S. Department of State’s RSS feed. The agency’s website may have newer levels, additional warnings, or more detailed guidance.</p><ul><li><a href={sourceUrl}>U.S. Department of State travel advisories</a></li><li><a href="https://travel.state.gov/_res/rss/TAsTWs.xml">Official advisory RSS feed</a></li><li><a href="https://ivvcadatacatalog.state.gov/Datasets">Consular Affairs Data Catalog</a></li></ul><h2>How updates work</h2><p>TripAware records when it retrieves a valid feed and tracks changes to levels or advisory text. Publication dates come from the agency. Verification dates show when TripAware checked the feed. During an outage, the most recent available snapshot remains visible with its verification date.</p><h2>Travel planning</h2><p>Travel advisory levels are not guarantees of personal safety. Always review the latest State Department guidance, including regional warnings, before you travel.</p></div></section>}/>
      <Route path="*" element={<Missing/>}/>
    </Routes>
  </main><Footer/></>
}

