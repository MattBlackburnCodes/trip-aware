import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { contentHash, downloadFeed } from '../server/feed'
import { database } from '../server/database'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json')
  if (!['GET', 'POST'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, POST')
    res.writeHead(405).end()
    return
  }
  const secret = process.env.CRON_SECRET
  const auth = Buffer.from(req.headers.authorization ?? '')
  const expected = Buffer.from('Bearer ' + secret)
  if (!secret || auth.length !== expected.length || !timingSafeEqual(auth, expected)) {
    res.writeHead(401).end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }
  const started = new Date().toISOString()
  try {
    const advisories = await downloadFeed()
    const updated = await database<number>('rpc/apply_advisories', {
      entries: advisories.map(advisory => ({ ...advisory, hash: contentHash(advisory) })), started,
    })
    res.end(JSON.stringify({ processed: advisories.length, updated }))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected sync error'
    console.error('Advisory synchronization failed', message)
    try {
      await database('sync_logs', { started_at: started, completed_at: new Date().toISOString(), status: 'failed', error_message: message })
    } catch (logError) {
      console.error('Could not store synchronization failure', logError)
    }
    res.writeHead(503).end(JSON.stringify({ error: 'Advisory synchronization failed' }))
  }
}

