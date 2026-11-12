import type { IncomingMessage, ServerResponse } from 'node:http'
import { database } from '../server/database'
import type { Snapshot } from '../src/types'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.writeHead(405).end()
    return
  }
  try {
    const data = await database<Snapshot>('rpc/advisory_snapshot', {})
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
    res.end(JSON.stringify(data))
  } catch (error) {
    console.error(error)
    res.setHeader('Cache-Control', 'no-store')
    res.writeHead(503).end(JSON.stringify({ error: 'Advisory database unavailable' }))
  }
}

