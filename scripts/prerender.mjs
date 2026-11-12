import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { pageHtml } from '../.server/entry.js'

let data = JSON.parse(await readFile('src/snapshot.json', 'utf8'))
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const response = await fetch(new URL('/rest/v1/rpc/advisory_snapshot', process.env.SUPABASE_URL), {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Supabase returned HTTP ' + response.status)
    const latest = await response.json()
    if (latest.verifiedAt && (!data.verifiedAt || +new Date(latest.verifiedAt) >= +new Date(data.verifiedAt))) data = latest
  } catch (error) {
    console.warn('Prerendering with the bundled RSS snapshot:', error.message)
  }
}
const template = await readFile('dist/index.html', 'utf8')
const deployment = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : undefined)
const origin = deployment ? new URL(deployment).origin : undefined
const paths = ['/', '/map', '/destinations', '/advisories', '/about', ...data.advisories.map(row => '/destinations/' + row.slug)]
const index = data.advisories.map(row => ({ ...row, summary: null, warnings: [], risks: [], safety: null, emergency: null }))
for (const path of paths) {
  const directory = 'dist' + path
  const active = path.split('/')[2]
  const advisories = index.map((row, i) => row.slug === active ? data.advisories[i] : row)
  await mkdir(directory, { recursive: true })
  await writeFile(directory + '/index.html', pageHtml(template, path, { ...data, advisories }, origin))
}
await writeFile('dist/404.html', pageHtml(template, '/404', { ...data, advisories: index }, origin))
await writeFile('dist/advisory-snapshot.json', JSON.stringify(data))
await writeFile('dist/robots.txt', 'User-agent: *\nAllow: /\nDisallow: /api/\n' + (origin ? 'Sitemap: ' + origin + '/sitemap.xml\n' : ''))
if (origin) {
  const xml = paths.filter(path => !path.startsWith('/destinations/') || data.advisories.find(row => '/destinations/' + row.slug === path)?.summary)
    .map(path => '<url><loc>' + origin + path + '</loc></url>').join('')
  await writeFile('dist/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + xml + '</urlset>')
}
console.log('Prerendered', paths.length, 'TripAware pages')

