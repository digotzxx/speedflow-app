create extension if not exists pgcrypto;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null,
  provider_user_id text not null,
  display_name text,
  avatar_url text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  scopes text,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  raw_profile jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, provider, provider_user_id)
);

create index if not exists social_accounts_user_provider_idx
on public.social_accounts(user_id, provider);

create index if not exists social_accounts_status_idx
on public.social_accounts(status);
