import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {notFound} from './errors';
import {assertHourlyQuota} from './quota';
import {JOB_TTL_MS,type JobStorePort} from './store';

export class SqliteJobStore implements JobStorePort{
  private readonly db:DatabaseSync;
  constructor(filename:string){if(!filename||filename===':memory:')throw new Error('A persistent SQLite path is required');const path=resolve(filename);mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, input_json TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS jobs_owner_created ON jobs(owner_id,created_at);');}
  async create(ownerId:string,input:unknown,now=new Date()){const createdAt=now.toISOString(),recent=this.db.prepare('SELECT created_at FROM jobs WHERE owner_id=? AND created_at>?').all(ownerId,new Date(now.getTime()-3600000).toISOString()) as Array<{created_at:string}>;assertHourlyQuota(recent.map(row=>row.created_at),now);const id=randomUUID();this.db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?)').run(id,ownerId,JSON.stringify(input),createdAt,new Date(now.getTime()+JOB_TTL_MS).toISOString());return id;}
  async get(ownerId:string,jobId:string){const row=this.db.prepare('SELECT input_json FROM jobs WHERE id=? AND owner_id=?').get(jobId,ownerId) as {input_json:string}|undefined;if(!row)throw notFound();return JSON.parse(row.input_json);}
  async delete(ownerId:string,jobId:string){const result=this.db.prepare('DELETE FROM jobs WHERE id=? AND owner_id=?').run(jobId,ownerId);if(result.changes===0)throw notFound();}
  async purgeExpired(now:string){const time=Date.parse(now);if(!Number.isFinite(time))throw new Error('Invalid cleanup time');return Number(this.db.prepare('DELETE FROM jobs WHERE expires_at<=?').run(new Date(time).toISOString()).changes);}
  async has(jobId:string){return Boolean(this.db.prepare('SELECT 1 FROM jobs WHERE id=?').get(jobId));}
  close(){this.db.close();}
}
