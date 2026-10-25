import {readSession,createSession,sessionCookie} from './session';
import {getConfiguredJobStore} from './store';
import {ApiError,invalidRequest,notFound} from './errors';
import {authorizeContext} from '../modules/consent/cloud';
import {proposeSelfFacts} from '../modules/self/facts';
import {getResearchService} from './research-runtime';
import {planStrategy} from '../modules/strategy/plan';
import {getPublicationService} from './publication-runtime';
import {runScheduledCleanup} from './cleanup';
import {timingSafeEqual} from 'node:crypto';
import {ZodError} from 'zod';
import {z} from 'zod';
const jobInputSchema=z.strictObject({kind:z.literal('context'),context:z.unknown()});
const factsInputSchema=z.strictObject({context:z.unknown()});
const researchInputSchema=z.strictObject({input:z.unknown(),context:z.unknown()});
const confirmIdentitySchema=z.strictObject({candidateId:z.string().min(1).max(128)});
const planInputSchema=z.strictObject({context:z.unknown(),research:z.unknown(),approvedContext:z.unknown()});
const publicationInputSchema=z.strictObject({projection:z.unknown(),confirmation:z.unknown()});

const json=(body:unknown,status=200,headers?:HeadersInit)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(headers as Record<string,string>|undefined)}});
async function readJson(request:Request,maxBytes=128*1024):Promise<unknown>{
  const declared=Number(request.headers.get('content-length')??0);
  if(declared>maxBytes)throw invalidRequest('Request body too large');
  if(!request.body)throw invalidRequest('Missing request body');
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  for(;;){
    const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw invalidRequest('Request body too large');}
    chunks.push(value);
  }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
function originOk(request:Request):boolean{
  const origin=request.headers.get('origin');return Boolean(origin)&&origin===new URL(request.url).origin;
}
function failure(error:unknown):Response{
  const issue=error instanceof ApiError?error:error instanceof SyntaxError||error instanceof ZodError?invalidRequest():null;
  return issue?json({error:{code:issue.code,message:issue.message}},issue.status,
    issue.retryAfter?{'Retry-After':String(issue.retryAfter)}:undefined):json({error:{code:'INTERNAL_ERROR',message:'Request failed'}},500);
}
export async function route(request:Request,segments:string[]):Promise<Response>{
  try{
    const path=segments.join('/');
    if(request.method==='POST'&&path==='session'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const session=await createSession();
      return json({expiresAt:session.expiresAt},201,{'Set-Cookie':sessionCookie(session,new URL(request.url).protocol==='https:')});
    }
    if(request.method==='DELETE'&&path==='session'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      return json({ok:true},200,{'Set-Cookie':'neymi_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});
    }
    if(path==='facts'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=factsInputSchema.parse(await readJson(request));
      await authorizeContext(input.context as never);
      return json({facts:await proposeSelfFacts(input.context as never)});
    }
    if(path==='plan'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=planInputSchema.parse(await readJson(request));
      await authorizeContext(input.approvedContext as never);
      return json(await planStrategy(input as never));
    }
    if(path==='publications'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const key=request.headers.get('idempotency-key')??'';
      const input=publicationInputSchema.parse(await readJson(request,8*1024*1024));
      const service=getPublicationService(new URL(request.url).origin);
      return json(await service.publishCard(owner,input.projection as never,input.confirmation as never,key),201,{'Cache-Control':'no-store'});
    }
    if(path.startsWith('publications/')&&segments.length===2){
      const id=segments[1],service=getPublicationService(new URL(request.url).origin);
      if(request.method==='GET')return json({projection:await service.readPublication(id)},200,{'Cache-Control':'no-store, max-age=0'});
      if(request.method==='DELETE'){
        if(!originOk(request))throw invalidRequest('Invalid origin');
        const authorization=request.headers.get('authorization')??'';
        if(!authorization.startsWith('Bearer '))throw invalidRequest('Missing revocation token');
        await service.revokePublication(id,authorization.slice(7));return json({ok:true},200,{'Cache-Control':'no-store'});
      }
    }
    if(path==='maintenance/cleanup'&&request.method==='POST'){
      const secret=process.env.NEYMI_CLEANUP_SECRET;if(!secret||Buffer.byteLength(secret)<32)throw new ApiError('SERVICE_UNAVAILABLE','Cleanup is not configured',503);
      const header=request.headers.get('authorization')??'',provided=Buffer.from(header.startsWith('Bearer ')?header.slice(7):''),expected=Buffer.from(secret);
      if(provided.length!==expected.length||!timingSafeEqual(provided,expected))throw new ApiError('PERMISSION_DENIED','Permission denied',403);
      return json(await runScheduledCleanup());
    }
    if(path==='research'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=researchInputSchema.parse(await readJson(request));
      return json(await getResearchService().start(owner,input.input as never,input.context as never),202);
    }
    if(path.startsWith('research/')){
      const owner=readSession(request);if(!owner)throw notFound();
      const id=segments[1],service=getResearchService();
      if(request.method==='GET'&&segments.length===2)return json({research:await service.result(owner,id)});
      if(request.method==='DELETE'&&segments.length===2){if(!originOk(request))throw invalidRequest('Invalid origin');await service.cancel(owner,id);return json({ok:true});}
      if(request.method==='POST'&&segments.length===3&&segments[2]==='confirm'){
        if(!originOk(request))throw invalidRequest('Invalid origin');
        const input=confirmIdentitySchema.parse(await readJson(request));await service.confirmIdentity(owner,id,input.candidateId);return json({ok:true});
      }
    }
    if(!path.startsWith('jobs'))throw notFound();
    if(!originOk(request)&&request.method!=='GET')throw invalidRequest('Invalid origin');
    const owner=readSession(request);if(!owner)throw notFound();
    const store=getConfiguredJobStore();
    if(request.method==='POST'&&path==='jobs'){
      const input=jobInputSchema.parse(await readJson(request));
      await authorizeContext(input.context as never);
      const id=await store.create(owner,input);
      return json({jobId:id,expiresAt:new Date(Date.now()+24*60*60*1000).toISOString()},202);
    }
    if(request.method==='GET'&&segments.length===2)return json({job:await store.get(owner,segments[1])});
    if(request.method==='DELETE'&&segments.length===2){await store.delete(owner,segments[1]);return json({ok:true},200);}
    throw notFound();
  }catch(error){return failure(error);}
}
