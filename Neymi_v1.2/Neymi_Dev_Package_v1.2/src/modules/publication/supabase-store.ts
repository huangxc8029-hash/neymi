import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {unavailable} from '../../server/errors';
import type {PublicationStore, StoredPublication} from './store';

type PublicationRow = {
  public_id: string;
  owner_id: string;
  projection_json: StoredPublication['projection'];
  digest: string;
  revoke_hash: string;
  idempotency_key: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
};

function asRecord(row: PublicationRow | null): StoredPublication | undefined {
  if (!row) return undefined;
  return {
    publicId: row.public_id, ownerId: row.owner_id, projection: row.projection_json,
    digest: row.digest, revokeHash: row.revoke_hash,
    idempotencyKey: row.idempotency_key, createdAt: row.created_at,
    expiresAt: row.expires_at, ...(row.revoked_at ? {revokedAt: row.revoked_at} : {}),
  };
}

export class SupabasePublicationStore implements PublicationStore {
  private readonly client: SupabaseClient;
  constructor(url: string, serviceRoleKey: string) {
    if (!url || !serviceRoleKey) throw unavailable('Supabase publication storage is not configured');
    this.client = createClient(url, serviceRoleKey, {
      auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
    });
  }

  private table() { return this.client.from('neymi_publications'); }

  async get(publicId: string): Promise<StoredPublication | undefined> {
    const {data, error} = await this.table().select('*').eq('public_id', publicId).maybeSingle();
    if (error) throw unavailable('Publication storage unavailable');
    return asRecord(data as PublicationRow | null);
  }

  async getByIdempotency(ownerId: string, key: string): Promise<StoredPublication | undefined> {
    const {data, error} = await this.table().select('*')
      .eq('owner_id', ownerId).eq('idempotency_key', key).maybeSingle();
    if (error) throw unavailable('Publication storage unavailable');
    return asRecord(data as PublicationRow | null);
  }

  async create(record: StoredPublication): Promise<void> {
    const row: PublicationRow = {
      public_id: record.publicId, owner_id: record.ownerId,
      projection_json: record.projection, digest: record.digest, revoke_hash: record.revokeHash,
      idempotency_key: record.idempotencyKey, created_at: record.createdAt,
      expires_at: record.expiresAt, revoked_at: record.revokedAt ?? null,
    };
    const {error} = await this.table().insert(row);
    if (error) throw unavailable('Could not save publication');
  }

  async revoke(publicId: string, at: string): Promise<void> {
    const {error} = await this.table().update({revoked_at: at}).eq('public_id', publicId)
      .is('revoked_at', null);
    if (error) throw unavailable('Could not revoke publication');
  }

  async expireBefore(now: string): Promise<number> {
    const {data, error} = await this.table().update({projection_json: null})
      .lte('expires_at', now).not('projection_json', 'is', null).select('public_id');
    if (error) throw unavailable('Could not expire publications');
    return data?.length ?? 0;
  }

  async update(publicId: string, projection: StoredPublication['projection'], digest: string, now: string): Promise<boolean> {
    const {data, error} = await this.table().update({projection_json: projection, digest})
      .eq('public_id', publicId).is('revoked_at', null).not('projection_json', 'is', null)
      .gt('expires_at', now).select('public_id').maybeSingle();
    if (error) throw unavailable('Could not update public card');
    return Boolean(data);
  }
}
