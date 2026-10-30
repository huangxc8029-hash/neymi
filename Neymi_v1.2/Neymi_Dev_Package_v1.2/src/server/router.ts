import {readSession,createSession,sessionCookie} from './session';
import {getConfiguredJobStore} from './store';
import {ApiError,invalidRequest,notFound,rateLimited,unavailable} from './errors';
import {authorizeContext} from '../modules/consent/cloud';
import {proposeSelfFacts} from '../modules/self/propose-facts.server';
import {coachSelfIntro,getLLMProvider,UnconfiguredLLMProvider} from './providers/llm';
import {designerProposalInputSchema,designerTurnInputSchema} from '../modules/assistant/designer/schemas';
import {retainConfirmedPrimaryHighlight} from '../modules/assistant/designer/workflow';
import {mergeSlotCandidates,nextDesignerQuestion,validateDesignerProposal,validateDesignerEvidenceSources,validateDesignerFactCandidates} from '../modules/assistant/designer/workflow';
import {FREE_CARD_TEMPLATES} from '../modules/card/templates';
import {designerPayloadContainsContact,serializeDesignerProposalPayload,serializeDesignerTurnPayload} from '../modules/assistant/designer/payload';
import {getResearchService} from './research-runtime';
import {planStrategy} from '../modules/strategy/plan';
import {getPublicationService} from './publication-runtime';
import {getFixtureMessagingAdapter,getMessagingService} from './messaging-runtime';
import {fetchPublic} from './fetch-public';
import {validateActivityText} from '../modules/activity/service';
import {planActivity} from '../modules/activity/planning';
import {proposeModules} from '../modules/content/propose-modules';
import {contentSourceRefSchema} from '../modules/content/schemas';
import {serializeContentSourceSegments} from '../modules/content/source-manifest';
import {contentProposalCloudContextSchema} from '../domain/schemas';
import {runScheduledCleanup} from './cleanup';
import {timingSafeEqual} from 'node:crypto';
import {ZodError} from 'zod';
import {z} from 'zod';
const jobInputSchema=z.strictObject({kind:z.literal('context'),context:z.unknown()});
const factsInputSchema=z.strictObject({context:z.unknown()});
const moduleProposalsInputSchema=z.strictObject({context:z.unknown(),segments:z.array(z.strictObject({sourceRef:contentSourceRefSchema,text:z.string().trim().min(1).max(20000)})).min(1).max(100)});
const researchInputSchema=z.strictObject({input:z.unknown(),context:z.unknown()});
const confirmIdentitySchema=z.strictObject({candidateId:z.string().min(1).max(128)});
const planInputSchema=z.strictObject({context:z.unknown(),research:z.unknown(),approvedContext:z.unknown()});
const publicationInputSchema=z.strictObject({projection:z.unknown(),confirmation:z.unknown(),lifetime:z.enum(['temporary','long']).optional()});
const activitySourceInputSchema=z.strictObject({url:z.string().url().max(2048)});
const activityPlanInputSchema=z.strictObject({eventId:z.string().min(1).max(128),context:z.unknown(),approvedContext:z.unknown(),researches:z.array(z.unknown()).min(1).max(20)});
const handoffInputSchema=z.strictObject({publicationId:z.string().regex(/^[A-Za-z0-9_-]{16,64}$/)});
const consumeHandoffInputSchema=z.strictObject({ticket:z.string().regex(/^[A-Za-z0-9_-]{40,60}$/)});
const activityPlanUsage=new Map<string,Array<{at:number;count:number}>>();
function consumeActivityPlanBudget(owner:string,count:number){
  const now=Date.now();for(const [key,entries]of activityPlanUsage){const current=entries.filter(entry=>entry.at>now-60*60*1000);if(current.length)activityPlanUsage.set(key,current);else activityPlanUsage.delete(key);}
  const recent=(activityPlanUsage.get(owner)??[]).filter(entry=>entry.at>now-60*60*1000);
  if(recent.reduce((sum,entry)=>sum+entry.count,0)+count>20){activityPlanUsage.set(owner,recent);throw rateLimited(Math.max(1,Math.ceil((recent[0].at+60*60*1000-now)/1000)));}
  recent.push({at:now,count});activityPlanUsage.set(owner,recent);
}

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
async function readRawBody(request:Request,maxBytes=64*1024):Promise<string>{
  const declared=Number(request.headers.get('content-length')??0);if(declared>maxBytes)throw invalidRequest('Request body too large');
  if(!request.body)throw invalidRequest('Missing request body');const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw invalidRequest('Request body too large');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw invalidRequest('Webhook body must be UTF-8');}
}
function originOk(request:Request):boolean{
  const url=new URL(request.url),host=request.headers.get('host')??request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  let target=url.origin;try{if(host){const protocol=request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()??url.protocol.slice(0,-1);target=new URL(`${protocol}://${host}`).origin;}}catch{return false;}
  const origin=request.headers.get('origin');
  if(origin)return origin===target;
  const referer=request.headers.get('referer'),site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin'||!referer)return false;
  try{return new URL(referer).origin===target;}catch{return false;}
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
    if(request.method==='GET'&&path==='session'){if(!readSession(request))throw notFound();return json({active:true});}
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
    if(path==='modules/proposals'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=moduleProposalsInputSchema.parse(await readJson(request,1024*1024));
      const context=contentProposalCloudContextSchema.parse(input.context);
      await authorizeContext(context,contentProposalCloudContextSchema);
      const sourceManifest=`Selected source segments: ${serializeContentSourceSegments(input.segments)}`;
      const sourceSuffix=`\n\n${sourceManifest}`;
      if(!context.text.endsWith(sourceSuffix))throw new ApiError('PERMISSION_DENIED','Source selection must be part of the approved text',403);
      const provider=getLLMProvider();if(!provider.proposeModules)throw unavailable('AI module proposal is not configured');
      const sources=input.segments.map(segment=>segment.sourceRef);
      const proposals=await proposeModules({text:context.text.slice(0,-sourceSuffix.length),approvedSourceIds:[...new Set(sources.map(source=>source.sourceId))],approvedSources:sources,approvedSourceSegments:input.segments},()=>provider.proposeModules!(context,sources,input.segments,request.signal));
      return json({proposals});
    }
    if(path==='coach'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=factsInputSchema.parse(await readJson(request));
      await authorizeContext(input.context as never);
      return json(await coachSelfIntro(input.context as never));
    }
    if(path==='designer/turn'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=designerTurnInputSchema.parse(await readJson(request,256*1024));
      validateDesignerEvidenceSources(input.message,input.recentMessages,input.evidence);
      await authorizeContext(input.approvedContext as never);
      const context=input.approvedContext as {text:string};
      const authorizedPayload=serializeDesignerTurnPayload(input);
      if(context.text!==authorizedPayload)throw new ApiError('PERMISSION_DENIED','Approved AI payload does not match the submitted designer turn',403);
      if(designerPayloadContainsContact(input))throw new ApiError('PERMISSION_DENIED','Approved AI payload contains contact details',403);
      const available=new Set<string>(FREE_CARD_TEMPLATES.map(template=>template.id));
      if(input.templateIds.some(id=>!available.has(id)))throw invalidRequest('Only currently available free templates may be sent to the designer');
      const provider=getLLMProvider();if(!provider.designerTurn)throw unavailable('Card designer AI is not configured');
      const result=await provider.designerTurn(input,request.signal) as {reply:string;slotCandidates:Array<{field:string;value:unknown;evidenceIds?:string[]}>;factCandidates:Array<{text:string;evidenceIds:string[]}>};
      const evidenceIds=new Set(input.evidence.filter(item=>item.status!=='rejected').map(item=>item.id));
      validateDesignerFactCandidates(result.factCandidates,input.evidence);
      if(result.slotCandidates.some(item=>item.evidenceIds?.some(id=>!evidenceIds.has(id))))throw unavailable('Card designer returned unsupported evidence');
      const identityFields=new Set(['displayName','role','organization']);
      if(result.slotCandidates.some(item=>identityFields.has(item.field)&&(typeof item.value!=='string'||!input.message.includes(item.value.trim()))))throw unavailable('Card designer returned identity text not present in the user message');
      const slots=mergeSlotCandidates(input.slots,result.slotCandidates);
      return json({reply:result.reply,slots,question:nextDesignerQuestion(slots),factCandidates:result.factCandidates,requestId:input.requestId,sessionRevision:input.sessionRevision,profileRevision:input.profileRevision});
    }
    if(path==='designer/proposal'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=designerProposalInputSchema.parse(await readJson(request,256*1024));
      validateDesignerEvidenceSources(input.message,input.recentMessages,input.evidence);
      await authorizeContext(input.approvedContext as never);
      const context=input.approvedContext as {text:string;moduleMetadata:Array<{id:string}>};
      if(context.text!==serializeDesignerProposalPayload(input)||designerPayloadContainsContact(input))throw new ApiError('PERMISSION_DENIED','Approved proposal payload does not match or contains contact details',403);
      const confirmedEvidenceIds=new Set(input.evidence.filter(item=>item.status==='confirmed').map(item=>item.id));
      if(input.confirmedEvidenceIds.some(id=>!confirmedEvidenceIds.has(id)))throw invalidRequest('Only explicitly confirmed source evidence may be used in a card proposal');
      const templates=new Set<string>(FREE_CARD_TEMPLATES.map(template=>template.id));if(input.templateIds.some(id=>!templates.has(id)))throw invalidRequest('Only currently available free templates may be proposed');
      const confirmed=new Set(input.evidence.filter(item=>item.status==='confirmed').map(item=>item.id));
      if(input.confirmedEvidenceIds.some(id=>!confirmed.has(id))||input.evidence.some(item=>item.status==='candidate'||item.status==='rejected'))throw new ApiError('PERMISSION_DENIED','Only user-confirmed evidence may be used',403);
      const allowedModules=new Set(context.moduleMetadata.map(item=>item.id));if(input.allowedFieldRefs.some(ref=>!allowedModules.has(ref.moduleId)))throw new ApiError('PERMISSION_DENIED','Proposal referenced an unapproved profile module',403);
      const provider=getLLMProvider();if(!provider.designerProposal)throw unavailable('Card designer AI is not configured');
      const raw=await provider.designerProposal(input,request.signal),proposal=retainConfirmedPrimaryHighlight(raw as never,input.slots.primaryHighlightRef,input.evidence),validated=validateDesignerProposal(proposal,{templateIds:input.templateIds,evidenceIds:input.confirmedEvidenceIds,fieldRefs:input.allowedFieldRefs},input.evidence);
      return json({proposal:validated,requestId:input.requestId,sessionRevision:input.sessionRevision,profileRevision:input.profileRevision});
    }
    if(path==='plan'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=planInputSchema.parse(await readJson(request));
      await authorizeContext(input.approvedContext as never);
      const provider=getLLMProvider(),plan=await planStrategy(input as never,provider,request.signal);
      return json({...plan,mode:provider instanceof UnconfiguredLLMProvider?'rule':'ai'});
    }
    if(path==='activity/source'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const input=activitySourceInputSchema.parse(await readJson(request));
      const source=await fetchPublic(input.url);
      let text:string;try{text=validateActivityText(source.text);}catch{throw invalidRequest('Activity source contains unsafe or unusable text');}
      return json({text,url:source.url,title:new URL(source.url).hostname,accessedAt:new Date().toISOString()});
    }
    if(path==='activity/plans'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const input=activityPlanInputSchema.parse(await readJson(request));
      await authorizeContext(input.approvedContext as never);
      if(getLLMProvider() instanceof UnconfiguredLLMProvider)throw unavailable('Activity planning service is not configured; continue with local preparation.');
      consumeActivityPlanBudget(owner,input.researches.length);
      let results;try{results=await planActivity(input as never,{signal:request.signal});}catch{throw invalidRequest('Activity plans require confirmed recipients in one event');}
      return json({results},200);
    }
    if(path==='messaging/webhook'&&request.method==='POST'){
      const adapter=getFixtureMessagingAdapter(),rawBody=await readRawBody(request),event=adapter.verify(rawBody,request.headers);
      const accepted=await getMessagingService().acceptEvent('fixture-hmac',event.eventId);
      return json({accepted:true,...(accepted==='duplicate'?{duplicate:true}:{})},accepted==='duplicate'?200:202);
    }
    if(path==='messaging/handoffs'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');const owner=readSession(request);if(!owner)throw notFound();
      const input=handoffInputSchema.parse(await readJson(request,4096)),origin=new URL(request.url).origin;
      await getPublicationService(origin).readPublication(input.publicationId);
      const handoff=await getMessagingService().issueHandoff(input.publicationId);
      return json({url:`${origin}/handoff#ticket=${encodeURIComponent(handoff.ticket)}`,expiresAt:handoff.expiresAt},201);
    }
    if(path==='messaging/handoffs/consume'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');const {ticket}=consumeHandoffInputSchema.parse(await readJson(request,4096));
      const publicationId=await getMessagingService().consumeHandoff(ticket);if(!publicationId)throw notFound();
      try{await getPublicationService(new URL(request.url).origin).readPublication(publicationId);}catch{throw notFound();}
      return json({publicationId});
    }
    if(path==='publications'&&request.method==='POST'){
      if(!originOk(request))throw invalidRequest('Invalid origin');
      const owner=readSession(request);if(!owner)throw notFound();
      const key=request.headers.get('idempotency-key')??'';
      const input=publicationInputSchema.parse(await readJson(request,8*1024*1024));
      const service=getPublicationService(new URL(request.url).origin);
      return json(await service.publishCard(owner,input.projection as never,input.confirmation as never,key,new Date().toISOString(),input.lifetime??'temporary'),201,{'Cache-Control':'no-store'});
    }
    if(path.startsWith('publications/')&&segments.length===2){
      const id=segments[1],service=getPublicationService(new URL(request.url).origin);
      if(request.method==='GET')return json({projection:await service.readPublication(id)},200,{'Cache-Control':'no-store, max-age=0'});
      if(request.method==='PATCH'){
        if(!originOk(request))throw invalidRequest('Invalid origin');
        const authorization=request.headers.get('authorization')??'';
        if(!authorization.startsWith('Bearer '))throw invalidRequest('Missing revocation token');
        const input=publicationInputSchema.parse(await readJson(request,8*1024*1024));
        await service.updatePublication(id,authorization.slice(7),input.projection as never,input.confirmation as never);
        return json({ok:true},200,{'Cache-Control':'no-store'});
      }
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
