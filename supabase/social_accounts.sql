create extension if not exists pgcrypto;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  platform text not null,
  account_id text not null,
  provider_user_id text,
  username text,
  display_name text,
  avatar_url text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  scopes text[],
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  raw_profile jsonb,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint social_accounts_user_provider_account_key unique(user_id, provider, account_id)
);

create index if not exists social_accounts_user_provider_idx
on public.social_accounts(user_id, provider);

create index if not exists social_accounts_status_idx
on public.social_accounts(status);
