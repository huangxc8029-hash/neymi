import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import type {ShareProjection} from '../../domain/types';
import {unavailable} from '../../server/errors';
import {SupabasePublicationStore} from './supabase-store';

export type StoredPublication={publicId:string;ownerId:string;projection:ShareProjection|null;digest:string;revokeHash:string;idempotencyKey:string;createdAt:string;expiresAt:string;revokedAt?:string};
export interface PublicationStore{
  get(publicId:string):Promise<StoredPublication|undefined>;
  getByIdempotency(ownerId:string,key:string):Promise<StoredPublication|undefined>;
  create(record:StoredPublication):Promise<void>;
  revoke(publicId:string,at:string):Promise<void>;
  expireBefore(now:string):Promise<number>;
  update(publicId:string,projection:ShareProjection,digest:string,now:string):Promise<boolean>;
}

export class MemoryPublicationStore implements PublicationStore{
  private readonly records=new Map<string,StoredPublication>();
  async get(id:string){const value=this.records.get(id);return value?structuredClone(value):undefined;}
  async getByIdempotency(owner:string,key:string){const value=[...this.records.values()].find(item=>item.ownerId===owner&&item.idempotencyKey===key);return value?structuredClone(value):undefined;}
  async create(value:StoredPublication){if(this.records.has(value.publicId)||await this.getByIdempotency(value.ownerId,value.idempotencyKey))throw new Error('Publication uniqueness conflict');this.records.set(value.publicId,structuredClone(value));}
  async revoke(id:string,at:string){const value=this.records.get(id);if(value)value.revokedAt=at;}
  async expireBefore(now:string){let count=0;for(const value of this.records.values())if(value.projection&&Date.parse(value.expiresAt)<=Date.parse(now)){value.projection=null;count++;}return count;}
  async update(publicId:string,projection:ShareProjection,digest:string,now:string){const record=this.records.get(publicId);if(!record||record.revokedAt||!record.projection||Date.parse(record.expiresAt)<=Date.parse(now))return false;record.projection=structuredClone(projection);record.digest=digest;return true;}
}

export class SqlitePublicationStore implements PublicationStore{
  private readonly db:DatabaseSync;
  constructor(filename:string){if(!filename||filename===':memory:')throw new Error('A persistent SQLite path is required');const path=resolve(filename);mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS publications(public_id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,projection_json TEXT,digest TEXT NOT NULL,revoke_hash TEXT NOT NULL,idempotency_key TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT,UNIQUE(owner_id,idempotency_key)); CREATE INDEX IF NOT EXISTS publications_expiry ON publications(expires_at);');}
  private map(row:Record<string,unknown>|undefined):StoredPublication|undefined{if(!row)return undefined;return{publicId:String(row.public_id),ownerId:String(row.owner_id),projection:row.projection_json===null?null:JSON.parse(String(row.projection_json)),digest:String(row.digest),revokeHash:String(row.revoke_hash),idempotencyKey:String(row.idempotency_key),createdAt:String(row.created_at),expiresAt:String(row.expires_at),...(row.revoked_at?{revokedAt:String(row.revoked_at)}:{})};}
  async get(id:string){return this.map(this.db.prepare('SELECT * FROM publications WHERE public_id=?').get(id) as Record<string,unknown>|undefined);}
  async getByIdempotency(owner:string,key:string){return this.map(this.db.prepare('SELECT * FROM publications WHERE owner_id=? AND idempotency_key=?').get(owner,key) as Record<string,unknown>|undefined);}
  async create(value:StoredPublication){this.db.prepare('INSERT INTO publications VALUES(?,?,?,?,?,?,?,?,?)').run(value.publicId,value.ownerId,JSON.stringify(value.projection),value.digest,value.revokeHash,value.idempotencyKey,value.createdAt,value.expiresAt,value.revokedAt??null);}
  async revoke(id:string,at:string){this.db.prepare('UPDATE publications SET revoked_at=COALESCE(revoked_at,?) WHERE public_id=?').run(at,id);}
  async expireBefore(now:string){const result=this.db.prepare('UPDATE publications SET projection_json=NULL WHERE expires_at<=? AND projection_json IS NOT NULL').run(new Date(Date.parse(now)).toISOString());return Number(result.changes);}
  async update(publicId:string,projection:ShareProjection,digest:string,now:string){const result=this.db.prepare('UPDATE publications SET projection_json=?,digest=? WHERE public_id=? AND revoked_at IS NULL AND projection_json IS NOT NULL AND expires_at>?').run(JSON.stringify(projection),digest,publicId,new Date(now).toISOString());return Number(result.changes)===1;}
  close(){this.db.close();}
}

let configured:PublicationStore|undefined;
export function getConfiguredPublicationStore():PublicationStore{
  if(configured)return configured;
  if(process.env.NEYMI_PUBLICATION_STORAGE==='supabase'){
    // Lazy import is intentionally avoided here; this module is server-only.
    const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)throw unavailable('Supabase publication storage is not configured');
    return configured=new SupabasePublicationStore(url,key);
  }
  const path=process.env.NEYMI_SQLITE_PATH;
  if(!path)throw unavailable('Persistent publication storage is not configured');
  return configured=new SqlitePublicationStore(path);
}
