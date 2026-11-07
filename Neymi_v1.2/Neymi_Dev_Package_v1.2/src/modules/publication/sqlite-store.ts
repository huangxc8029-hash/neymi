import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import type {PublicationStore,StoredPublication} from './store';

export class SqlitePublicationStore implements PublicationStore{
  private readonly db:DatabaseSync;
  constructor(filename:string){if(!filename||filename===':memory:')throw new Error('A persistent SQLite path is required');const path=resolve(filename);mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS publications(public_id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,projection_json TEXT,digest TEXT NOT NULL,revoke_hash TEXT NOT NULL,idempotency_key TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT,UNIQUE(owner_id,idempotency_key)); CREATE INDEX IF NOT EXISTS publications_expiry ON publications(expires_at);');}
  private map(row:Record<string,unknown>|undefined):StoredPublication|undefined{if(!row)return undefined;return{publicId:String(row.public_id),ownerId:String(row.owner_id),projection:row.projection_json===null?null:JSON.parse(String(row.projection_json)),digest:String(row.digest),revokeHash:String(row.revoke_hash),idempotencyKey:String(row.idempotency_key),createdAt:String(row.created_at),expiresAt:String(row.expires_at),...(row.revoked_at?{revokedAt:String(row.revoked_at)}:{})};}
  async get(id:string){return this.map(this.db.prepare('SELECT * FROM publications WHERE public_id=?').get(id) as Record<string,unknown>|undefined);}
  async getByIdempotency(owner:string,key:string){return this.map(this.db.prepare('SELECT * FROM publications WHERE owner_id=? AND idempotency_key=?').get(owner,key) as Record<string,unknown>|undefined);}
  async create(value:StoredPublication){this.db.prepare('INSERT INTO publications VALUES(?,?,?,?,?,?,?,?,?)').run(value.publicId,value.ownerId,JSON.stringify(value.projection),value.digest,value.revokeHash,value.idempotencyKey,value.createdAt,value.expiresAt,value.revokedAt??null);}
  async revoke(id:string,at:string){this.db.prepare('UPDATE publications SET revoked_at=COALESCE(revoked_at,?) WHERE public_id=?').run(at,id);}
  async expireBefore(now:string){const result=this.db.prepare('UPDATE publications SET projection_json=NULL WHERE expires_at<=? AND projection_json IS NOT NULL').run(new Date(Date.parse(now)).toISOString());return Number(result.changes);}
  close(){this.db.close();}
}
