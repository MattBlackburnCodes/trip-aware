import { readFile, writeFile } from 'node:fs/promises'
import { downloadFeed, parseFeed } from '../server/feed'

const [, , file, verifiedAt] = process.argv
if (file && (!verifiedAt || !Number.isFinite(+new Date(verifiedAt)))) {
  throw new Error('Provide the original retrieval timestamp when importing a local RSS file')
}
const advisories = file ? parseFeed(await readFile(file, 'utf8'), new Date(verifiedAt).toISOString()) : await downloadFeed()
await writeFile('src/snapshot.json', JSON.stringify({ advisories, changes: [], verifiedAt: advisories[0].verifiedAt }) + '\n')
console.log('Saved', advisories.length, 'official RSS advisories')

