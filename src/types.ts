export const sourceName = 'U.S. Department of State'
export const sourceUrl = 'https://travel.state.gov/en/international-travel/travel-advisories.html'
export type Level = 1 | 2 | 3 | 4
export const levels = [1, 2, 3, 4] as const
export const levelText = {
  1: 'Exercise Normal Precautions', 2: 'Exercise Increased Caution',
  3: 'Reconsider Travel', 4: 'Do Not Travel',
}
export interface Advisory {
  slug: string
  name: string
  iso2: string | null
  iso3: string | null
  numeric: string | null
  region: string | null
  level: Level
  title: string
  summary: string | null
  risks: string[]
  warnings: string[]
  safety: string | null
  emergency: string | null
  publishedAt: string
  verifiedAt: string
  url: string
}
export interface Change {
  slug: string
  previousLevel: Level
  newLevel: Level
  kind: 'level' | 'content'
  detectedAt: string
  publishedAt: string
  url: string
}
export interface Snapshot {
  advisories: Advisory[]
  changes: Change[]
  verifiedAt: string | null
  syncFailed?: boolean
}
export const empty: Snapshot = { advisories: [], changes: [], verifiedAt: null }
export function date(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}
export function observedDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'America/New_York' }).format(new Date(value))
}
export function observedTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York',
  }).format(new Date(value)) + ' ET'
}
export function flag(code: string | null) {
  return code ? [...code].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('') : ''
}

