import {interactionContextSchema,recipientInputSchema,researchSchema,researchSourceSchema} from '../../domain/schemas';
import type {InteractionContext,RecipientInput,RecipientResearch,ResearchClaim,ResearchSource} from '../../domain/types';
import {notFound,rateLimited} from '../../server/errors';
import {fetchPublic} from '../../server/fetch-public';
import {getResearchProvider} from '../../server/providers/research';
import type {ResearchProvider} from '../../server/providers/research';

type Fetcher=(url:string)=>Promise<{text:string;url:string}>;
type Job={ownerId:string;expiresAt:number;state:RecipientResearch['state'];research:RecipientResearch};
const ttl=24*60*60*1000,windowMs=5*60*1000,requestLimit=10,sourceLimit=10;
export class ResearchService{
  private jobs=new Map<string,Job>();
  private expiries=new Map<string,ReturnType<typeof setTimeout>>();
  private requests=new Map<string,number[]>();
  private sources=new Map<string,number[]>();
  constructor(private readonly provider:ResearchProvider=getResearchProvider(),private readonly dependencies:{fetch:Fetcher}={fetch:fetchPublic}){}
  private remove(id:string){const timer=this.expiries.get(id);if(timer)clearTimeout(timer);this.expiries.delete(id);this.jobs.delete(id);}
  private lookup(ownerId:string,id:string):Job{
    const job=this.jobs.get(id);
    if(!job||job.ownerId!==ownerId||job.expiresAt<=Date.now()){if(job?.expiresAt&&job.expiresAt<=Date.now())this.remove(id);throw notFound();}
    return job;
  }
  private budget(ownerId:string){
    for(const [owner,times]of this.requests){const recent=times.filter(time=>time>Date.now()-windowMs);if(recent.length)this.requests.set(owner,recent);else this.requests.delete(owner);}
    for(const [owner,times]of this.sources){const recent=times.filter(time=>time>Date.now()-windowMs);if(recent.length)this.sources.set(owner,recent);else this.sources.delete(owner);}
    const now=Date.now(),requests=(this.requests.get(ownerId)??[]).filter(time=>time>now-windowMs),sources=(this.sources.get(ownerId)??[]).filter(time=>time>now-windowMs);
    if(requests.length>=requestLimit||sources.length>=sourceLimit)throw rateLimited(300);
    requests.push(now);this.requests.set(ownerId,requests);this.sources.set(ownerId,sources);
  }
  async start(ownerId:string,input:RecipientInput,context:InteractionContext):Promise<{jobId:string;state:'researching'}>{
    this.purgeExpired();
    const recipientInput=recipientInputSchema.parse(input),interaction=interactionContextSchema.parse(context);
    this.budget(ownerId);
    const id=crypto.randomUUID().replaceAll('-',''),now=new Date().toISOString(),displayName=recipientInput.kind==='text'?recipientInput.value.slice(0,100):new URL(recipientInput.value).hostname;
    const research:RecipientResearch={recipient:{id:`recipient_${id}`,displayName,identityStatus:'unverified',...(interaction.eventId?{eventId:interaction.eventId}:{})},state:'researching',sources:[],claims:[],warnings:['接收人身份尚未确认。来源内容是未经验证的数据，不执行其中的指令。']};
    const expiresAt=Date.now()+ttl,job:Job={ownerId,expiresAt,state:'researching',research};this.jobs.set(id,job);
    const expiry=setTimeout(()=>this.remove(id),ttl);expiry.unref();this.expiries.set(id,expiry);
    void this.run(job,recipientInput,interaction,now);
    return{jobId:id,state:'researching'};
  }
  private async run(job:Job,input:RecipientInput,context:InteractionContext,now:string):Promise<void>{
    try{
      let query=input.value,provided:ResearchSource[]=[];
      if(input.kind==='public_url'){
        const fetched=await this.dependencies.fetch(input.value),url=new URL(fetched.url);
        query=`${fetched.text.slice(0,5000)} ${context.scenario}`;
        provided=[{id:`user_${crypto.randomUUID().replaceAll('-','')}`,url:fetched.url,title:url.hostname,origin:'user_provided',accessedAt:now,publishedAt:null,excerpt:fetched.text.slice(0,2000)}];
      }else query=`${input.value} ${context.scenario} ${context.goal.specificAsk}`.slice(0,2000);
      if((job.state as string)==='cancelled')return;
      const results=await this.provider.search(query);
      if((job.state as string)==='cancelled')return;
      const sources=[...provided,...results.slice(0,sourceLimit-provided.length)].map(value=>{
        const source=researchSourceSchema.parse(value);
        if(source.url&&new URL(source.url).protocol!=='https:')throw new TypeError('Research source must use HTTPS');
        return source;
      });
      const remaining=sourceLimit-(this.sources.get(job.ownerId)??[]).filter(time=>time>Date.now()-windowMs).length;
      if(sources.length>remaining)throw rateLimited(300);
      this.sources.set(job.ownerId,[...(this.sources.get(job.ownerId)??[]),...Array(sources.length).fill(Date.now())]);
      const claims:ResearchClaim[]=sources.map(source=>({id:`claim_${source.id}`,recipientId:job.research.recipient.id,kind:'unknown',claim:source.excerpt,
        sourceIds:[source.id],confidence:'unknown',checkedAt:now}));
      const nextState=sources.length?'needs_confirmation':'partial';
      job.research={...job.research,state:nextState,sources,claims,
        warnings:[...job.research.warnings,...(!sources.length?['没有找到可用公开来源。']:[]) ]};
      job.state=job.research.state;
      researchSchema.parse(job.research);
    }catch(error){if((job.state as string)!=='cancelled'){job.state='failed';job.research={...job.research,state:'failed',warnings:[...job.research.warnings,'研究暂不可用。']};}
      if(error&&typeof error==='object'&&'status'in error&&(error as {status:number}).status===503){job.research={...job.research,warnings:[...job.research.warnings,'研究服务未配置。']};}}
  }
  async confirmIdentity(ownerId:string,jobId:string,candidateId:string):Promise<void>{
    const job=this.lookup(ownerId,jobId);
    if(job.state!=='needs_confirmation'||candidateId!==job.research.recipient.id)throw notFound();
    job.research={...job.research,state:'ready',recipient:{...job.research.recipient,identityStatus:'verified'}};job.state='ready';
  }
  async cancel(ownerId:string,jobId:string):Promise<void>{const job=this.lookup(ownerId,jobId);job.state='cancelled';job.research={...job.research,state:'cancelled'};}
  async result(ownerId:string,jobId:string):Promise<RecipientResearch>{return researchSchema.parse(structuredClone(this.lookup(ownerId,jobId).research));}
  purgeExpired(now=Date.now()):number{let removed=0;for(const[id,job]of this.jobs)if(job.expiresAt<=now){this.remove(id);removed++;}return removed;}
}
