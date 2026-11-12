# TripAware

TripAware is a Blackburn Works LLC product for exploring U.S. Department of State travel advisories. It provides a world map, searchable destination directory, country pages, and a history of changes observed by TripAware.

## Local development

Use Node.js 22.19 or later in the Node 22 line.

```powershell
npm ci
npm run dev
```

Vite uses a bundled, dated snapshot of the official RSS feed. You can refresh it with `npm run snapshot` on a network that can reach Travel.State.Gov. To reproduce a snapshot from an original RSS file, run `npm run snapshot -- path/to/feed.xml <retrieved-at-ISO-timestamp>`. Supply the actual retrieval timestamp.

```powershell
npm test
npx playwright install chromium
npm run build
npm run test:e2e
```

Set `SITE_URL` before building to generate the sitemap, canonical links, Open Graph URLs, and country structured data. On Vercel the build can also use `VERCEL_PROJECT_PRODUCTION_URL`.

## Supabase and Vercel

1. Apply the migration in `supabase/migrations` to your Supabase project with the Supabase CLI or SQL Editor.
2. Import this repository into Vercel as a Vite project. Use Node.js 22 and the checked-in build settings. Set the server-side variables in `.env.example` in Vercel, including a strong random `CRON_SECRET`. Keep the service-role key server-side.
3. Deploy, then send an authenticated POST to `/api/sync` with the header `Authorization: Bearer <CRON_SECRET>` to bootstrap Supabase. The same endpoint accepts the authenticated GET that Vercel Cron sends. The daily schedule uses 10:00 UTC with timing subject to the Vercel plan. Vercel limits Hobby to personal or non-commercial use. See [Vercel Cron limits](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing) and [Vercel’s Hobby terms](https://vercel.com/legal/terms).
4. Check `/api/advisories` for the verification timestamp and confirm the last run in `sync_logs`. Redeploy after bootstrapping to generate static pages from the database. Redeploy when you want crawler-facing HTML or the sitemap to reflect newly added destinations. Open pages read the cached live API after load.

The sync fetches the official feed with a timeout and backoff. It validates item fields, rejects incomplete snapshots, applies changes atomically, and records the last successful verification. A transaction-level lock serializes concurrent runs, and an older run cannot overwrite a newer successful one. A substantial drop in coverage rejects the import. Smaller removals unpublish the affected records while retaining their history. The public endpoint is read-only and cacheable. Supabase writes and logs stay behind server-side credentials.

## Sources and coverage

- [U.S. Department of State RSS](https://travel.state.gov/_res/rss/TAsTWs.xml) supplies advisory titles, levels, dates, descriptions, and source URLs. The first bundled snapshot contains 217 destinations. The feed carried two Tonga entries at the same level and publication date. TripAware kept the one with a validated ISO code.
- [Official advisory index](https://travel.state.gov/en/international-travel/travel-advisories.html) is the reference for checking the agency’s latest guidance. During development it showed Macau at Level 2 while the RSS feed showed Level 3 for the same issue date. The application identifies levels as RSS-derived and links to the official index and each destination advisory. Direct index and country HTML requests returned HTTP 403 from the development environment.
- [Consular Affairs API](https://cadataapi.state.gov/) returned HTTP 403. The [Consular Affairs Data Catalog](https://ivvcadatacatalog.state.gov/Datasets) lists TravelAdvisory and CountryTravelInfo and documents geopolitical tags as FIPS codes. A usable API endpoint, schema, and access terms could not be verified. The implemented adapter uses RSS. An additional adapter should produce the same typed advisory records after its endpoint and schema have been verified.
- RSS does not supply reliable structured risk categories, separate country safety profiles, or emergency contacts. The country pages display the original description as plain text, show matching warning excerpts when available, and link to the official page for additional guidance. Missing fields remain empty. History starts at the first successful synchronization and records content or level changes observed after that baseline.
- Map shapes come from [World Atlas](https://github.com/topojson/world-atlas) (ISC), derived from public-domain Natural Earth data. D3 Geo projects those shapes. Validated ISO numeric codes join shapes to advisories. Smaller territories and destinations with non-ISO identifiers remain accessible in the list even when they have no matching polygon.

The app marks snapshots older than 36 hours, failed syncs, and API fallback states. Verification dates describe when TripAware checked the feed. Official issue dates come from the State Department.

