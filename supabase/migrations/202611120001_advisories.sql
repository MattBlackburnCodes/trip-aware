create table public.countries (
  slug text primary key,
  name text not null,
  iso_alpha2 text check (iso_alpha2 ~ '^[A-Z]{2}$'),
  iso_alpha3 text check (iso_alpha3 ~ '^[A-Z]{3}$'),
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.travel_advisories (
  country_id text primary key references public.countries(slug),
  advisory_level int not null check (advisory_level between 1 and 4),
  official_published_at timestamptz not null,
  last_verified_at timestamptz not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  source_url text not null,
  payload jsonb not null,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.advisory_history (
  id bigint generated always as identity primary key,
  country_id text not null references public.countries(slug),
  previous_level int not null check (previous_level between 1 and 4),
  new_level int not null check (new_level between 1 and 4),
  change_type text not null check (change_type in ('level','content')),
  detected_at timestamptz not null,
  official_published_at timestamptz not null,
  source_url text not null
);
create table public.sync_logs (
  id bigint generated always as identity primary key,
  source_name text not null default 'U.S. Department of State RSS',
  started_at timestamptz not null,
  completed_at timestamptz not null,
  status text not null check (status in ('success','failed')),
  records_processed int not null default 0,
  records_updated int not null default 0,
  error_message text
);
create index advisory_history_destination on public.advisory_history(country_id, detected_at desc);
create index advisory_history_recent on public.advisory_history(detected_at desc);
create index sync_logs_recent on public.sync_logs(started_at desc);
create index countries_region on public.countries(region);
alter table public.countries enable row level security;
alter table public.travel_advisories enable row level security;
alter table public.advisory_history enable row level security;
alter table public.sync_logs enable row level security;
revoke all on public.countries, public.travel_advisories, public.advisory_history, public.sync_logs from anon, authenticated;

create function public.apply_advisories(entries jsonb, started timestamptz) returns int
language plpgsql set search_path = '' as $$
declare
  entry jsonb;
  old public.travel_advisories%rowtype;
  changed int := 0;
  verified timestamptz := (entries->0->>'verifiedAt')::timestamptz;
  destination_slug text;
  incoming int;
begin
  perform pg_advisory_xact_lock(91433001);
  if jsonb_array_length(entries) < 150 or verified is null then
    raise exception 'Incomplete advisory snapshot';
  end if;
  if exists (select 1 from public.sync_logs where status = 'success' and started_at >= started) then
    return 0;
  end if;
  if jsonb_array_length(entries) < (
    select count(*) * 0.9 from public.travel_advisories where is_published
  ) then
    raise exception 'Unexpected drop in feed coverage';
  end if;
  update public.travel_advisories a set is_published = false
    where a.is_published and not exists (
      select 1 from jsonb_array_elements(entries) e where e->>'slug' = a.country_id
    );
  for entry in select value from jsonb_array_elements(entries) loop
    destination_slug := entry->>'slug';
    incoming := (entry->>'level')::int;
    insert into public.countries as c (slug, name, iso_alpha2, iso_alpha3, region)
      values (destination_slug, entry->>'name', entry->>'iso2', entry->>'iso3', entry->>'region')
      on conflict (slug) do update set name = excluded.name, iso_alpha2 = excluded.iso_alpha2,
        iso_alpha3 = excluded.iso_alpha3, region = excluded.region, updated_at = now()
      where (c.name, c.iso_alpha2, c.iso_alpha3, c.region) is distinct from
        (excluded.name, excluded.iso_alpha2, excluded.iso_alpha3, excluded.region);
    select * into old from public.travel_advisories where country_id = destination_slug;
    if old.country_id is null or old.content_hash <> entry->>'hash'
        or old.official_published_at <> (entry->>'publishedAt')::timestamptz then
      changed := changed + 1;
    end if;
    if old.country_id is not null and old.content_hash <> entry->>'hash' then
      insert into public.advisory_history (country_id, previous_level, new_level, change_type, detected_at, official_published_at, source_url)
        values (destination_slug, old.advisory_level, incoming, case when old.advisory_level <> incoming then 'level' else 'content' end,
          verified, (entry->>'publishedAt')::timestamptz, entry->>'url');
    end if;
    insert into public.travel_advisories as a
      (country_id, advisory_level, official_published_at, last_verified_at, content_hash, source_url, payload)
      values (destination_slug, incoming, (entry->>'publishedAt')::timestamptz, verified, entry->>'hash', entry->>'url', entry - 'hash')
      on conflict (country_id) do update set advisory_level = excluded.advisory_level,
        official_published_at = excluded.official_published_at, last_verified_at = excluded.last_verified_at,
        content_hash = excluded.content_hash, source_url = excluded.source_url, payload = excluded.payload, is_published = true,
        updated_at = case when a.content_hash <> excluded.content_hash or a.official_published_at <> excluded.official_published_at
          then now() else a.updated_at end;
  end loop;
  insert into public.sync_logs (started_at, completed_at, status, records_processed, records_updated)
    values (started, verified, 'success', jsonb_array_length(entries), changed);
  return changed;
end;
$$;

create function public.advisory_snapshot() returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'advisories', coalesce((select jsonb_agg(a.payload order by c.name) from public.travel_advisories a
      join public.countries c on c.slug = a.country_id where a.is_published), '[]'::jsonb),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('slug', country_id, 'previousLevel', previous_level,
      'newLevel', new_level, 'kind', change_type, 'detectedAt', detected_at, 'publishedAt', official_published_at,
      'url', source_url) order by detected_at desc, id desc) from public.advisory_history), '[]'::jsonb),
    'verifiedAt', (select max(completed_at) from public.sync_logs where status = 'success'),
    'syncFailed', coalesce((select status = 'failed' from public.sync_logs order by started_at desc limit 1), false)
  );
$$;
revoke execute on function public.apply_advisories(jsonb, timestamptz), public.advisory_snapshot() from public, anon, authenticated;
grant execute on function public.apply_advisories(jsonb, timestamptz), public.advisory_snapshot() to service_role;
grant select, insert, update on public.countries, public.travel_advisories, public.advisory_history, public.sync_logs to service_role;
grant usage, select on all sequences in schema public to service_role;

