import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { App, metadata } from '../src/App'
import type { Snapshot } from '../src/types'

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const json = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c')

export function pageHtml(template: string, path: string, data: Snapshot, origin?: string) {
  const meta = metadata(path, data)
  const canonical = origin ? new URL(path, origin).href : null
  const row = data.advisories.find(item => '/destinations/' + item.slug === path)
  const structured = row && canonical ? '<script type="application/ld+json">' + json({
    '@context': 'https://schema.org', '@type': 'WebPage', name: meta.title, url: canonical,
    description: meta.description, citation: row.url, about: { '@type': 'Country', name: row.name },
  }) + '</script>' : ''
  const seo = '<title>' + escape(meta.title) + '</title><meta name="description" content="' + escape(meta.description) +
    '"><meta property="og:type" content="website"><meta property="og:title" content="' + escape(meta.title) +
    '"><meta property="og:description" content="' + escape(meta.description) + '">' +
    (canonical ? '<link rel="canonical" href="' + escape(canonical) + '"><meta property="og:url" content="' + escape(canonical) + '">' : '') +
    (row && !row.summary || path === '/404' ? '<meta name="robots" content="noindex">' : '') + structured
  const app = renderToString(<StaticRouter location={path}><App initial={data} live={false}/></StaticRouter>)
  const html = template.replace('<!--seo-->', () => seo).replace('<!--app-->', () => app)
    .replace('<!--snapshot-->', () => '<script type="application/json" id="tripaware-data">' + json(data) + '</script>')
  return html
}

