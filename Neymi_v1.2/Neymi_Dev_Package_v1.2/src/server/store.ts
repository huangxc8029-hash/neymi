import {randomUUID} from 'node:crypto';
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

export interface JobStorePort{create(ownerId:string,input:unknown,now?:Date):Promise<string>;get(ownerId:string,jobId:string):Promise<unknown>;delete(ownerId:string,jobId:string):Promise<void>;purgeExpired(now:string):Promise<number>;has(jobId:string):Promise<boolean>;close?():void}
export const JOB_TTL_MS=TTL;
let configured:JobStorePort|undefined;
export async function getConfiguredJobStore():Promise<JobStorePort>{
  const path=process.env.NEYMI_SQLITE_PATH;
  if(!path)throw unavailable('Persistent storage is not configured');
  if(configured)return configured;
  const {SqliteJobStore}=await import('./sqlite-job-store');
  return configured=new SqliteJobStore(path);
}
