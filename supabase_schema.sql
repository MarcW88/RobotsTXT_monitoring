create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  email text,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  base_url text not null,
  critical_patterns text[] not null default array['/'],
  known_sitemaps text[] not null default array[]::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, base_url)
);

create table if not exists checks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  checked_at timestamptz not null default now(),
  robots_url text not null,
  status_code integer,
  final_url text,
  content_hash text,
  content text,
  crawl_policy_status text,
  crawl_policy_summary text,
  created_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references checks(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  severity text not null,
  alert_type text not null,
  message text not null,
  url text,
  user_agent text,
  previous_status text,
  current_status text,
  created_at timestamptz not null default now()
);

create table if not exists sitemap_details (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references checks(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  url text not null,
  parent text,
  declared_in_robots boolean not null default false,
  depth integer not null default 0,
  status_code integer,
  type text,
  url_count integer not null default 0,
  child_count integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists important_urls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  site_id uuid references sites(id) on delete cascade,
  site text,
  url text not null,
  type text,
  priority text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists important_url_results (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references checks(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  important_url_id uuid references important_urls(id) on delete set null,
  url text not null,
  type text,
  priority text,
  is_homepage boolean,
  in_sitemap boolean,
  agent_results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sites_org on sites(organization_id);
create index if not exists idx_checks_site_checked_at on checks(site_id, checked_at desc);
create index if not exists idx_alerts_site_created_at on alerts(site_id, created_at desc);
create index if not exists idx_alerts_severity on alerts(severity);
create index if not exists idx_sitemap_details_check on sitemap_details(check_id);
create index if not exists idx_important_url_results_check on important_url_results(check_id);

alter table organizations enable row level security;
alter table user_profiles enable row level security;
alter table sites enable row level security;
alter table checks enable row level security;
alter table alerts enable row level security;
alter table sitemap_details enable row level security;
alter table important_urls enable row level security;
alter table important_url_results enable row level security;

create policy "Users can view their organization" on organizations
  for select using (
    id in (select organization_id from user_profiles where user_profiles.id = auth.uid())
  );

create policy "Users can view profiles in their organization" on user_profiles
  for select using (
    organization_id in (select organization_id from user_profiles where user_profiles.id = auth.uid())
  );

create policy "Users can view organization sites" on sites
  for select using (
    organization_id in (select organization_id from user_profiles where user_profiles.id = auth.uid())
  );

create policy "Users can view organization checks" on checks
  for select using (
    site_id in (
      select sites.id from sites
      where sites.organization_id in (
        select organization_id from user_profiles where user_profiles.id = auth.uid()
      )
    )
  );

create policy "Users can view organization alerts" on alerts
  for select using (
    site_id in (
      select sites.id from sites
      where sites.organization_id in (
        select organization_id from user_profiles where user_profiles.id = auth.uid()
      )
    )
  );

create policy "Users can view organization sitemap details" on sitemap_details
  for select using (
    site_id in (
      select sites.id from sites
      where sites.organization_id in (
        select organization_id from user_profiles where user_profiles.id = auth.uid()
      )
    )
  );

create policy "Users can view organization important urls" on important_urls
  for select using (
    organization_id in (select organization_id from user_profiles where user_profiles.id = auth.uid())
  );

create policy "Users can view organization important url results" on important_url_results
  for select using (
    site_id in (
      select sites.id from sites
      where sites.organization_id in (
        select organization_id from user_profiles where user_profiles.id = auth.uid()
      )
    )
  );
