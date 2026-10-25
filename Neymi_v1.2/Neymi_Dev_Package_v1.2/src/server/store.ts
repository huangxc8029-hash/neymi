import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {notFound,unavailable} from './errors';
import {assertHourlyQuota} from './quota';

type Job={id:string;ownerId:string;input:unknown;createdAt:string;expiresAt:string};
const TTL=24*60*60*1000;
export class JobStore{
  private readonly jobs=new Map<string,Job>();
  async create(ownerId:string,input:unknown,now=new Date()):Promise<string>{
    const recent=[...this.jobs.values()].filter(job=>job.ownerId===ownerId&&Date.parse(job.createdAt)>now.getTime()-60*60*1000);
    assertHourlyQuota(recent.map(job=>job.createdAt),now);
    const id=randomUUID(),createdAt=now.toISOString();
    this.jobs.set(id,{id,ownerId,input,createdAt,expiresAt:new Date(now.getTime()+TTL).toISOString()});
    return id;
  }
  async get(ownerId:string,jobId:string):Promise<unknown>{
    const job=this.jobs.get(jobId);
    if(!job||job.ownerId!==ownerId)throw notFound();
    return structuredClone(job.input);
  }
  async delete(ownerId:string,jobId:string):Promise<void>{
    const job=this.jobs.get(jobId);if(!job||job.ownerId!==ownerId)throw notFound();this.jobs.delete(jobId);
  }
  async purgeExpired(now:string):Promise<number>{
    const time=Date.parse(now);if(!Number.isFinite(time))throw new Error('Invalid cleanup time');
    let count=0;for(const [id,job] of this.jobs)if(Date.parse(job.expiresAt)<=time){this.jobs.delete(id);count++;}
    return count;
  }
  async has(jobId:string){return this.jobs.has(jobId);}
}

export class SqliteJobStore{
  private readonly db:DatabaseSync;
  constructor(filename:string){
    if(!filename||filename===':memory:')throw new Error('A persistent SQLite path is required');
    const path=resolve(filename);mkdirSync(dirname(path),{recursive:true});
    this.db=new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, input_json TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS jobs_owner_created ON jobs(owner_id,created_at);');
  }
  async create(ownerId:string,input:unknown,now=new Date()):Promise<string>{
    const createdAt=now.toISOString();
    const recent=this.db.prepare('SELECT created_at FROM jobs WHERE owner_id=? AND created_at>?').all(ownerId,new Date(now.getTime()-3600000).toISOString()) as Array<{created_at:string}>;
    assertHourlyQuota(recent.map(row=>row.created_at),now);
    const id=randomUUID();
    this.db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?)').run(id,ownerId,JSON.stringify(input),createdAt,new Date(now.getTime()+TTL).toISOString());
    return id;
  }
  async get(ownerId:string,jobId:string):Promise<unknown>{
    const row=this.db.prepare('SELECT input_json FROM jobs WHERE id=? AND owner_id=?').get(jobId,ownerId) as {input_json:string}|undefined;
    if(!row)throw notFound();return JSON.parse(row.input_json);
  }
  async delete(ownerId:string,jobId:string):Promise<void>{
    const result=this.db.prepare('DELETE FROM jobs WHERE id=? AND owner_id=?').run(jobId,ownerId);
    if(result.changes===0)throw notFound();
  }
  async purgeExpired(now:string):Promise<number>{
    const time=Date.parse(now);if(!Number.isFinite(time))throw new Error('Invalid cleanup time');
    return Number(this.db.prepare('DELETE FROM jobs WHERE expires_at<=?').run(new Date(time).toISOString()).changes);
  }
  async has(jobId:string):Promise<boolean>{return Boolean(this.db.prepare('SELECT 1 FROM jobs WHERE id=?').get(jobId));}
  close(){this.db.close();}
}

let configured:SqliteJobStore|undefined;
export function getConfiguredJobStore():SqliteJobStore{
  const path=process.env.NEYMI_SQLITE_PATH;
  if(!path)throw unavailable('Persistent storage is not configured');
  return configured??=new SqliteJobStore(path);
}
