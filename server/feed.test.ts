import { describe, expect, it } from 'vitest'
import { contentHash, parseFeed } from './feed'
import bundled from '../src/snapshot.json'
import type { Advisory } from '../src/types'

const item = (title: string, url: string, body = 'Official summary.') => `
  <item><title>${title}</title><link>https://travel.state.gov/${url}</link>
  <pubDate>Thu, 15 May 2025</pubDate><description><![CDATA[${body}]]></description></item>`
const feed = (...entries: string[]) => '<rss><channel>' + entries.join('') + '</channel></rss>'
const filler = Array.from({ length: 150 }, (_, index) => item(
  'Test destination ' + index + ' - Level 1: Exercise Normal Precautions',
  'travel-advisories/test-' + index + '.html',
))
const observed = '2026-11-12T03:00:00.000Z'
const japan = item('Japan - Level 1: Exercise Normal Precautions', 'travel-advisories/destination.jpn.html', '<p>Official summary.</p><script>alert(1)</script>')

describe('State Department RSS', () => {
  it('validates ISO codes and strips executable markup from official text', () => {
    const row = parseFeed(feed(...filler, japan), observed).find(entry => entry.slug === 'japan')
    expect(row).toMatchObject({ iso2: 'JP', iso3: 'JPN', numeric: '392', region: 'Asia', level: 1, summary: 'Official summary.' })
  })

  it('prefers a coded duplicate with the same level and date and rejects conflicting entries', () => {
    const legacy = item('Japan - Level 1: Exercise Normal Precautions', 'traveladvisories/japan.html')
    expect(parseFeed(feed(...filler, japan, legacy), observed).find(entry => entry.slug === 'japan')?.iso3).toBe('JPN')
    const conflict = item('Japan - Level 2: Exercise Increased Caution', 'traveladvisories/japan.html')
    expect(() => parseFeed(feed(...filler, japan, conflict), observed)).toThrow(/conflicting duplicate/i)
  })

  it('rejects an incomplete feed', () => {
    expect(() => parseFeed(feed(japan), observed)).toThrow(/incomplete/i)
  })

  it('ignores verification timestamps in history comparisons', () => {
    const row = bundled.advisories.find(entry => entry.slug === 'japan') as Advisory
    expect(contentHash({ ...row, verifiedAt: observed })).toBe(contentHash(row))
    expect(contentHash({ ...row, level: 4 })).not.toBe(contentHash(row))
  })
})

