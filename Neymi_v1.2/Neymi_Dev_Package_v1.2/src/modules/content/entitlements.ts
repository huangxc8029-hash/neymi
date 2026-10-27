export type EntitlementRequest={kind:'template';id:string}|{kind:'content_task';id:string}|{kind:'transcription_minutes';id:string}|{kind:'person_batch';id:string};
export type EntitlementResult={allowed:true;plan:'pro';expiresAt:string|null}|{allowed:false;reason:'sign_in_required'|'plan_expired'|'provider_unavailable'|'not_included'};
export interface EntitlementPort {check(request:EntitlementRequest):Promise<EntitlementResult>;}
export class FixtureEntitlementPort implements EntitlementPort{
  constructor(private readonly account:{status:'guest'|'free'|'pro'|'expired'|'unavailable';expiresAt?:string;includes?:(request:EntitlementRequest)=>boolean}){}
  async check(request:EntitlementRequest):Promise<EntitlementResult>{
    if(this.account.status==='unavailable')return{allowed:false,reason:'provider_unavailable'};
    if(this.account.status==='guest')return{allowed:false,reason:'sign_in_required'};
    if(this.account.status==='expired')return{allowed:false,reason:'plan_expired'};
    if(this.account.status==='pro'&&this.account.expiresAt&&Date.parse(this.account.expiresAt)<=Date.now())return{allowed:false,reason:'plan_expired'};
    if(this.account.status!=='pro'||this.account.includes?.(request)===false)return{allowed:false,reason:'not_included'};
    return{allowed:true,plan:'pro',expiresAt:this.account.expiresAt??null};
  }
}
export type UsageReservation={status:'reserved'|'settled'|'released'|'unavailable';jobId:string};
export class IdempotentUsageLedger{
  private readonly jobs=new Map<string,UsageReservation>();
  private settled=0;
  constructor(private readonly limit:number){if(!Number.isInteger(limit)||limit<0)throw new RangeError('Usage limit must be a non-negative integer.');}
  async reserve(jobId:string):Promise<UsageReservation>{
    if(!jobId)throw new Error('An idempotency key is required.');
    const existing=this.jobs.get(jobId);if(existing)return existing;
    const reserved=[...this.jobs.values()].filter(job=>job.status==='reserved').length;
    const value:UsageReservation={jobId,status:this.settled+reserved>=this.limit?'unavailable':'reserved'};this.jobs.set(jobId,value);return value;
  }
  async settle(jobId:string,result:{schemaValid:boolean;persisted:boolean}):Promise<UsageReservation>{
    const current=this.jobs.get(jobId);if(!current||current.status==='unavailable')return{jobId,status:'unavailable'};
    if(current.status!=='reserved')return current;
    if(!result.schemaValid||!result.persisted){current.status='released';return current;}
    current.status='settled';this.settled++;return current;
  }
  async cancel(jobId:string):Promise<UsageReservation>{return this.settle(jobId,{schemaValid:false,persisted:false});}
}
