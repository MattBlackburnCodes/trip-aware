import { createHash } from 'node:crypto'
import { load } from 'cheerio'
import countries from 'i18n-iso-countries'
import world from 'world-countries'
import { type Advisory, type Level, sourceUrl } from '../src/types'

export const feedUrl = 'https://travel.state.gov/_res/rss/TAsTWs.xml'
const clean = (text: string) => text.replace(/\s+/g, ' ').trim()
const slugify = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const geography = new Map(world.map(country => [country.cca3, country.region === 'Americas'
  ? country.subregion === 'South America' ? 'South America' : 'North America'
  : country.region]))

export function parseFeed(xml: string, verifiedAt: string) {
  const $ = load(xml, { xml: true })
  const records = new Map<string, Advisory>()
  $('rss > channel > item').each((_, item) => {
    const fields = $(item)
    const title = clean(fields.children('title').text())
    const match = title.match(/^(.+?)\s+[-–—]\s+Level\s+([1-4])\b/i)
    const published = new Date(fields.children('pubDate').text().trim())
    if (!match || !Number.isFinite(+published)) throw new Error('Invalid State Department advisory title or date')
    const url = new URL(fields.children('link').text().trim())
    if (url.origin !== new URL(sourceUrl).origin || !url.pathname.includes('/travel-advisories') && !url.pathname.includes('/traveladvisories')) {
      throw new Error('Invalid advisory source URL')
    }
    const threat = fields.children('category[domain="Threat-Level"]').text().match(/Level\s+([1-4])\b/i)
    if (threat && threat[1] !== match[2]) throw new Error('Conflicting advisory levels in RSS item')
    const name = match[1].replace(/\s+Travel Advisory$/i, '')
    const code = url.pathname.match(/destination\.([a-z]{3})\.html$/i)?.[1]?.toUpperCase()
    const iso2 = code ? countries.alpha3ToAlpha2(code) ?? null : null
    const iso3 = iso2 && code ? code : null
    const slug = slugify(name)
    const description = load(fields.children('description').text(), {}, false)
    description('script, style, iframe').remove()
    description('p,li,div,h1,h2,h3,h4,h5,h6,br').before('\n').after('\n')
    const lines = description.root().text().split('\n').map(clean).filter(Boolean)
    const warnings = lines.filter(line => /^(do not travel|reconsider travel|exercise increased caution)\b.{4,}\b(due to|because of)\b/i.test(line))
    const advisory: Advisory = {
      slug, name, iso2, iso3, numeric: iso2 ? countries.alpha2ToNumeric(iso2) ?? null : null,
      region: code ? geography.get(code) ?? null : null,
      level: Number(match[2]) as Level, title, publishedAt: published.toISOString(), verifiedAt,
      summary: lines.join('\n\n') || null, url: url.href,
      risks: [], warnings, safety: null, emergency: null,
    }
    const duplicate = records.get(slug)
    if (duplicate) {
      if (duplicate.level !== advisory.level || duplicate.publishedAt !== advisory.publishedAt || duplicate.iso3 && advisory.iso3) {
        throw new Error('Conflicting duplicate destination in RSS: ' + name)
      }
      if (duplicate.iso3 || !advisory.iso3) return
    }
    records.set(slug, advisory)
  })
  if (records.size < 150) throw new Error('State Department RSS feed is unexpectedly incomplete')
  return [...records.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

export async function downloadFeed() {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(feedUrl, { signal: AbortSignal.timeout(7500), redirect: 'error' })
      if (!response.ok) throw new Error('State Department RSS returned HTTP ' + response.status)
      return parseFeed(await response.text(), new Date().toISOString())
    } catch (error) {
      lastError = error
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt))
    }
  }
  throw lastError
}

export function contentHash(advisory: Advisory) {
  const { level, title, summary, risks, warnings, safety, emergency } = advisory
  return createHash('sha256').update(JSON.stringify({ level, title, summary, risks, warnings, safety, emergency })).digest('hex')
}

