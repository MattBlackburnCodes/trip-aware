export async function database<T>(path: string, body?: unknown): Promise<T> {
  const endpoint = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!endpoint || !key) throw new Error('Supabase is not configured')
  const response = await fetch(new URL('/rest/v1/' + path, endpoint), {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error('Supabase returned HTTP ' + response.status)
  const raw = await response.text()
  return (raw ? JSON.parse(raw) : null) as T
}

