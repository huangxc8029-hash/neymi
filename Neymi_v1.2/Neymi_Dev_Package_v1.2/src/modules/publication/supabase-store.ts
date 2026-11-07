import type {PublicationStore,StoredPublication} from './store';

type Row={public_id:string;owner_id:string;projection_json:StoredPublication['projection'];digest:string;revoke_hash:string;idempotency_key:string;created_at:string;expires_at:string;revoked_at:string|null};
type Fetcher=(input:string|URL|Request,init?:RequestInit)=>Promise<Response>;
const row=(value:StoredPublication):Row=>({public_id:value.publicId,owner_id:value.ownerId,projection_json:value.projection,digest:value.digest,revoke_hash:value.revokeHash,idempotency_key:value.idempotencyKey,created_at:value.createdAt,expires_at:value.expiresAt,revoked_at:value.revokedAt??null});
const record=(value:Row):StoredPublication=>({publicId:value.public_id,ownerId:value.owner_id,projection:value.projection_json,digest:value.digest,revokeHash:value.revoke_hash,idempotencyKey:value.idempotency_key,createdAt:value.created_at,expiresAt:value.expires_at,...(value.revoked_at?{revokedAt:value.revoked_at}:{})});

export class SupabasePublicationStore implements PublicationStore{
  private readonly base:string;private readonly headers:HeadersInit;private readonly fetcher:Fetcher;
  constructor({url,key,fetcher=fetch}:{url:string;key:string;fetcher?:Fetcher}){this.base=`${url.replace(/\/$/,'')}/rest/v1/neymi_publications`;this.headers={apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'};this.fetcher=fetcher;}
  private async request(query:string,init?:RequestInit){const response=await this.fetcher(`${this.base}${query}`,{...init,headers:{...this.headers,...init?.headers}});if(!response.ok)throw new Error(`Supabase publication store failed (${response.status})`);return response;}
  async get(publicId:string){const response=await this.request(`?select=*&public_id=eq.${encodeURIComponent(publicId)}&limit=1`),values=await response.json() as Row[];return values[0]?record(values[0]):undefined;}
  async getByIdempotency(ownerId:string,key:string){const response=await this.request(`?select=*&owner_id=eq.${encodeURIComponent(ownerId)}&idempotency_key=eq.${encodeURIComponent(key)}&limit=1`),values=await response.json() as Row[];return values[0]?record(values[0]):undefined;}
  async create(value:StoredPublication){await this.request('',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(row(value))});}
  async revoke(publicId:string,at:string){await this.request(`?public_id=eq.${encodeURIComponent(publicId)}&revoked_at=is.null`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({revoked_at:at})});}
  async expireBefore(now:string){const response=await this.request(`?expires_at=lte.${encodeURIComponent(new Date(Date.parse(now)).toISOString())}&projection_json=not.is.null`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({projection_json:null})}),values=await response.json() as Row[];return values.length;}
}
