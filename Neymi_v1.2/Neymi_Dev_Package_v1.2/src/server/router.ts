import {readSession,createSession,sessionCookie} from './session';
import {getConfiguredJobStore} from './store';
import {ApiError,invalidRequest,notFound} from './errors';
import {authorizeContext} from '../modules/consent/cloud';
import {proposeSelfFacts} from '../modules/self/facts';
import {ZodError} from 'zod';
import {z} from 'zod';
const jobInputSchema=z.strictObject({kind:z.literal('context'),context:z.unknown()});
const factsInputSchema=z.strictObject({context:z.unknown()});

const json=(body:unknown,status=200,headers?:HeadersInit)=>Response.json(body,{status,headers});
async function readJson(request:Request):Promise<unknown>{
  const declared=Number(request.headers.get('content-length')??0);
  if(declared>128*1024)throw invalidRequest('Request body too large');
  if(!request.body)throw invalidRequest('Missing request body');
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  for(;;){
    const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>128*1024){await reader.cancel();throw invalidRequest('Request body too large');}
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
