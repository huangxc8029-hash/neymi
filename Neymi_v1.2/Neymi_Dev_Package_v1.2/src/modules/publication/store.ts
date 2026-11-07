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
}

export class MemoryPublicationStore implements PublicationStore{
  private readonly records=new Map<string,StoredPublication>();
  async get(id:string){const value=this.records.get(id);return value?structuredClone(value):undefined;}
  async getByIdempotency(owner:string,key:string){const value=[...this.records.values()].find(item=>item.ownerId===owner&&item.idempotencyKey===key);return value?structuredClone(value):undefined;}
  async create(value:StoredPublication){if(this.records.has(value.publicId)||await this.getByIdempotency(value.ownerId,value.idempotencyKey))throw new Error('Publication uniqueness conflict');this.records.set(value.publicId,structuredClone(value));}
  async revoke(id:string,at:string){const value=this.records.get(id);if(value)value.revokedAt=at;}
  async expireBefore(now:string){let count=0;for(const value of this.records.values())if(value.projection&&Date.parse(value.expiresAt)<=Date.parse(now)){value.projection=null;count++;}return count;}
}

let configured:PublicationStore|undefined,configuredFor='';
export async function getConfiguredPublicationStore():Promise<PublicationStore>{
  const url=(process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim(),key=(process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  const sqlitePath=process.env.NEYMI_SQLITE_PATH?.trim(),configuration=url&&key?`supabase:${url}`:sqlitePath?`sqlite:${sqlitePath}`:'';
  if(!configuration)throw unavailable('Persistent storage is not configured');
  if(configured&&configuredFor===configuration)return configured;
  configuredFor=configuration;
  if(url&&key)return configured=new SupabasePublicationStore({url,key});
  const {SqlitePublicationStore}=await import('./sqlite-store');
  return configured=new SqlitePublicationStore(sqlitePath!);
}
