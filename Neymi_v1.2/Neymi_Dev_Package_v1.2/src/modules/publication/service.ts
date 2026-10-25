import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {shareConfirmationSchema,shareProjectionSchema} from '../../domain/schemas';
import type {PublicationReceipt,ShareConfirmation,ShareProjection} from '../../domain/types';
import {assertConfirmation,digestProjection} from '../sharing/confirmation';
import {ApiError,invalidRequest,notFound,permissionDenied} from '../../server/errors';
import type {PublicationStore,StoredPublication} from './store';

const DEFAULT_TTL=30*24*60*60*1000;
const MAX_PROJECTION_BYTES=8*1024*1024;
function token(secret:string,ownerId:string,key:string,id:string){return createHmac('sha256',secret).update(`${ownerId}\0${key}\0${id}`).digest('base64url');}
function sha(value:string){return createHash('sha256').update(value).digest('hex');}
function equalHex(a:string,b:string){const left=Buffer.from(a,'hex'),right=Buffer.from(b,'hex');return left.length===right.length&&timingSafeEqual(left,right);}
export class PublicationService{
  private readonly secret:string;private readonly baseUrl:string;private readonly ttlMs:number;
  constructor(private readonly store:PublicationStore,options:{secret:string;baseUrl:string;ttlMs?:number}){
    if(Buffer.byteLength(options.secret)<32)throw new Error('Publication secret must contain at least 32 bytes');
    this.secret=options.secret;this.baseUrl=new URL(options.baseUrl).origin;this.ttlMs=options.ttlMs??DEFAULT_TTL;
    if(this.ttlMs<=0||this.ttlMs>DEFAULT_TTL)throw new Error('Publication TTL must be between 0 and 30 days');
  }
  private receipt(record:StoredPublication):PublicationReceipt{
    return{publication:{publicId:record.publicId,url:`${this.baseUrl}/p/${record.publicId}`,createdAt:record.createdAt,expiresAt:record.expiresAt,...(record.revokedAt?{revokedAt:record.revokedAt}:{})},revokeToken:token(this.secret,record.ownerId,record.idempotencyKey,record.publicId)};
  }
  async publishCard(ownerId:string,projection:ShareProjection,confirmation:ShareConfirmation,idempotencyKey:string,now=new Date().toISOString()):Promise<PublicationReceipt>{
    if(!ownerId||idempotencyKey.length<32||idempotencyKey.length>200||!/^[A-Za-z0-9_-]+$/.test(idempotencyKey))throw invalidRequest('Invalid publication request');
    const checked=shareProjectionSchema.parse(projection),proof=shareConfirmationSchema.parse(confirmation);
    if(new TextEncoder().encode(JSON.stringify(checked)).byteLength>MAX_PROJECTION_BYTES)throw invalidRequest('Publication content is too large');
    await assertConfirmation(checked,proof,'publish');
    const digest=await digestProjection(checked),existing=await this.store.getByIdempotency(ownerId,idempotencyKey);
    if(existing){if(existing.digest!==digest)throw invalidRequest('Idempotency key is already bound to different content');if(!existing.projection)throw new ApiError('EXPIRED','Publication has expired',410);return this.receipt(existing);}
    const createdAt=new Date(now),expiresAt=new Date(createdAt.getTime()+this.ttlMs),publicId=randomBytes(18).toString('base64url'),revokeToken=token(this.secret,ownerId,idempotencyKey,publicId);
    if(!Number.isFinite(createdAt.getTime()))throw invalidRequest('Invalid publication time');
    const record:StoredPublication={publicId,ownerId,projection:checked,digest,revokeHash:sha(revokeToken),idempotencyKey,createdAt:createdAt.toISOString(),expiresAt:expiresAt.toISOString()};
    try{await this.store.create(record);}catch(error){const raced=await this.store.getByIdempotency(ownerId,idempotencyKey);if(raced){if(raced.digest!==digest)throw invalidRequest('Idempotency key is already bound to different content');if(!raced.projection)throw new ApiError('EXPIRED','Publication has expired',410);return this.receipt(raced);}throw error;}
    return this.receipt(record);
  }
  async readPublication(publicId:string,now=new Date().toISOString()):Promise<ShareProjection>{
    const record=await this.store.get(publicId);if(!record)throw notFound();
    if(record.revokedAt)throw notFound();if(Date.parse(record.expiresAt)<=Date.parse(now)||!record.projection)throw new ApiError('EXPIRED','Publication has expired',410);
    return shareProjectionSchema.parse(record.projection);
  }
  async revokePublication(publicId:string,revokeToken:string,now=new Date().toISOString()):Promise<void>{
    const record=await this.store.get(publicId);if(!record)throw notFound();
    if(!equalHex(record.revokeHash,sha(revokeToken)))throw permissionDenied();
    if(Date.parse(record.expiresAt)<=Date.parse(now)||!record.projection)throw new ApiError('EXPIRED','Publication has expired',410);
    await this.store.revoke(publicId,new Date(now).toISOString());
  }
  async expirePublications(now=new Date().toISOString()):Promise<number>{if(!Number.isFinite(Date.parse(now)))throw invalidRequest('Invalid expiration time');return this.store.expireBefore(now);}
}
