create table if not exists public.neymi_publications (
  public_id text primary key,
  owner_id text not null,
  projection_json jsonb,
  digest text not null,
  revoke_hash text not null,
  idempotency_key text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  unique (owner_id, idempotency_key)
);

create index if not exists neymi_publications_expiry on public.neymi_publications (expires_at);
alter table public.neymi_publications enable row level security;
