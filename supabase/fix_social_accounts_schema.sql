create extension if not exists pgcrypto;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid()
);

alter table public.social_accounts
add column if not exists user_id uuid;

alter table public.social_accounts
add column if not exists provider text;

alter table public.social_accounts
add column if not exists platform text;

alter table public.social_accounts
add column if not exists account_id text;

alter table public.social_accounts
add column if not exists provider_user_id text;

alter table public.social_accounts
add column if not exists username text;

alter table public.social_accounts
add column if not exists display_name text;

alter table public.social_accounts
add column if not exists avatar_url text;

alter table public.social_accounts
add column if not exists access_token text;

alter table public.social_accounts
add column if not exists refresh_token text;

alter table public.social_accounts
add column if not exists expires_at timestamptz;

alter table public.social_accounts
add column if not exists refresh_expires_at timestamptz;

alter table public.social_accounts
add column if not exists scopes text[];

alter table public.social_accounts
add column if not exists status text default 'connected';

alter table public.social_accounts
add column if not exists connected_at timestamptz default now();

alter table public.social_accounts
add column if not exists raw_profile jsonb;

alter table public.social_accounts
add column if not exists raw_data jsonb;

alter table public.social_accounts
add column if not exists disconnected_at timestamptz;

alter table public.social_accounts
add column if not exists created_at timestamptz default now();

alter table public.social_accounts
add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'social_accounts'
      and column_name = 'user_id'
      and data_type <> 'uuid'
  ) then
    alter table public.social_accounts
    alter column user_id type uuid using nullif(user_id::text, '')::uuid;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'social_accounts'
      and column_name = 'scopes'
      and data_type <> 'ARRAY'
  ) then
    alter table public.social_accounts
    alter column scopes type text[] using
      case
        when scopes is null or scopes::text = '' then array[]::text[]
        else regexp_split_to_array(scopes::text, '[,\s]+')
      end;
  end if;
end $$;

update public.social_accounts
set provider = platform
where provider is null and platform is not null;

update public.social_accounts
set platform = provider
where platform is null and provider is not null;

update public.social_accounts
set account_id = provider_user_id
where account_id is null and provider_user_id is not null;

update public.social_accounts
set provider_user_id = account_id
where provider_user_id is null and account_id is not null;

update public.social_accounts
set username = display_name
where username is null and display_name is not null;

update public.social_accounts
set status = 'connected'
where status is null;

update public.social_accounts
set connected_at = coalesce(connected_at, created_at, now()),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table public.social_accounts
drop constraint if exists social_accounts_user_provider_account_key;

alter table public.social_accounts
drop constraint if exists social_accounts_user_id_provider_provider_user_id_key;

alter table public.social_accounts
drop constraint if exists social_accounts_user_provider_provider_user_key;

alter table public.social_accounts
add constraint social_accounts_user_provider_account_key
unique (user_id, provider, account_id);

create index if not exists social_accounts_user_provider_idx
on public.social_accounts(user_id, provider);

create index if not exists social_accounts_status_idx
on public.social_accounts(status);

alter table public.social_accounts enable row level security;

drop policy if exists "Users can read their own social accounts" on public.social_accounts;
create policy "Users can read their own social accounts"
on public.social_accounts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can update their own social accounts" on public.social_accounts;
create policy "Users can update their own social accounts"
on public.social_accounts
for update
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own social accounts" on public.social_accounts;
create policy "Users can insert their own social accounts"
on public.social_accounts
for insert
with check (auth.uid() = user_id);
