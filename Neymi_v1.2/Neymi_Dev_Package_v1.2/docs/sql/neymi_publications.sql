-- Apply from the trusted Supabase SQL editor before choosing the Supabase
-- publication backend. Only explicitly published ShareProjection data is kept.
-- RLS allows NO access from anon/authenticated API keys.
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
  unique (owner_id, idempotency_key),
  constraint neymi_publication_expiry check (expires_at > created_at)
);
create index if not exists neymi_publications_expiry on public.neymi_publications (expires_at);
alter table public.neymi_publications enable row level security;
revoke all on table public.neymi_publications from anon, authenticated;
-- Server-side service-role access only. Never ship SUPABASE_SERVICE_ROLE_KEY
-- to the browser. Revoked/expired public records can remain for audit but
-- must never be rendered by the public page or preview generator.
