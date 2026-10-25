import {describe,expect,it,vi} from 'vitest';
import {fetchPublic,isPublicAddress} from '../../src/server/fetch-public';
import {ResearchService} from '../../src/modules/research/service';
import {makeContext,timestamp} from '../fixtures/domain';
import type {ResearchSource} from '../../src/domain/types';
import {route} from '../../src/server/router';

const body=async function*(text:string){yield new TextEncoder().encode(text);};
const pub={resolve:async()=>[{address:'8.8.8.8',family:4 as const}],request:async()=>({status:200,headers:{'content-type':'text/html','content-encoding':'identity'},body:body('<html><script>ignore me</script><h1>Public profile</h1><p>Robotics researcher</p></html>')})};

describe('public research boundary',()=>{
  it('rejects private literals, plain HTTP, and non-public DNS before connecting',async()=>{
    const request=vi.fn();
    await expect(fetchPublic('https://127.0.0.1/',{...pub,request})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    await expect(fetchPublic('https://[::1]/',{...pub,request})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    await expect(fetchPublic('http://example.com/',{...pub,request})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    await expect(fetchPublic('https://example.com:8443/',{...pub,request})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    await expect(fetchPublic('https://example.com/',{resolve:async()=>[{address:'10.0.0.4',family:4}],request})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    await expect(fetchPublic('https://example.com/',{resolve:async()=>[{address:'8.8.8.8',family:4},{address:'192.168.1.2',family:4}],request})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);expect(isPublicAddress('::ffff:8.8.8.8')).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
  it('pins the validated public DNS address and extracts text without active content',async()=>{
    const request=vi.fn(async()=>({status:200,headers:{'content-type':'text/html'},body:body('<script>PRIVATE_SENTINEL</script><h1>Robotics</h1>')}));
    const result=await fetchPublic('https://example.com/profile',{...pub,request});
    expect(request).toHaveBeenCalledWith(expect.any(URL),'8.8.8.8',expect.any(AbortSignal));
    expect(result.text).toContain('Robotics');expect(result.text).not.toContain('PRIVATE_SENTINEL');
  });
  it('rejects redirects, non-text responses, and bodies above 2 MiB',async()=>{
    await expect(fetchPublic('https://example.com/',{...pub,request:async()=>({status:302,headers:{location:'https://127.0.0.1'},body:body('')})})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    await expect(fetchPublic('https://example.com/',{...pub,request:async()=>({status:200,headers:{'content-type':'application/pdf'},body:body('pdf')})})).rejects.toMatchObject({code:'INVALID_REQUEST'});
    await expect(fetchPublic('https://example.com/',{...pub,request:async()=>({status:200,headers:{'content-type':'text/plain'},body:body('x'.repeat(2*1024*1024+1))})})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  });
  it('keeps uncertain identity pending until user confirmation',async()=>{
    const source={id:'source_one',url:'https://example.com',title:'Alex Kim — Robotics',origin:'other' as const,accessedAt:timestamp,publishedAt:null,excerpt:'Works on robotics'};
    const service=new ResearchService({search:async()=>[source]},{fetch:async()=>({text:'Alex Kim',url:'https://example.com'})});
    const {jobId}=await service.start('owner_a',{kind:'text',value:'Alex Kim',contextId:'context_demo'},makeContext());
    await vi.waitFor(async()=>expect((await service.result('owner_a',jobId)).state).toBe('needs_confirmation'));
    const research=await service.result('owner_a',jobId);
    expect(research.recipient.identityStatus).toBe('unverified');
    await service.confirmIdentity('owner_a',jobId,research.recipient.id);
    expect((await service.result('owner_a',jobId)).recipient.identityStatus).toBe('verified');
  });
  it('keeps cancelled work cancelled after a delayed provider response and isolates owners',async()=>{
    let complete!:(value:ResearchSource[])=>void;
    const service=new ResearchService({search:()=>new Promise<ResearchSource[]>(resolve=>{complete=resolve;})},{fetch:async()=>({text:'query',url:'https://example.com'})});
    const {jobId}=await service.start('owner_a',{kind:'text',value:'Alex Kim',contextId:'context_demo'},makeContext());
    await service.cancel('owner_a',jobId);
    complete([]);
    await vi.waitFor(async()=>expect((await service.result('owner_a',jobId)).state).toBe('cancelled'));
    await expect(service.result('owner_b',jobId)).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('enforces a per-owner rolling research request budget',async()=>{
    const service=new ResearchService({search:async()=>[]},{fetch:async()=>({text:'q',url:'https://example.com'})});
    for(let i=0;i<10;i++)await service.start('owner_a',{kind:'text',value:`Name ${i}`,contextId:'context_demo'},makeContext());
    await expect(service.start('owner_a',{kind:'text',value:'Name 11',contextId:'context_demo'},makeContext())).rejects.toMatchObject({code:'RATE_LIMITED'});
    await expect(service.start('owner_b',{kind:'text',value:'Name',contextId:'context_demo'},makeContext())).resolves.toHaveProperty('jobId');
  });
  it('purges expired research records',async()=>{
    const service=new ResearchService({search:async()=>[]},{fetch:async()=>({text:'q',url:'https://example.com'})});
    const {jobId}=await service.start('owner_a',{kind:'text',value:'Alex Kim',contextId:'context_demo'},makeContext());
    expect(service.purgeExpired(Date.now()+25*60*60*1000)).toBe(1);
    await expect(service.result('owner_a',jobId)).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('serves research only to its anonymous session owner',async()=>{
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-123456';
    try{
      const origin='https://neymi.example',session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']);
      const cookie=session.headers.get('set-cookie')!.split(';')[0],headers={origin,cookie,'content-type':'application/json'};
      const started=await route(new Request(`${origin}/v1/research`,{method:'POST',headers,body:JSON.stringify({input:{kind:'text',value:'Alex Kim',contextId:'context_demo'},context:makeContext()})}),['research']);
      expect(started.status).toBe(202);const {jobId}=await started.json();
      await expect(route(new Request(`${origin}/v1/research/${jobId}`),['research',jobId])).resolves.toHaveProperty('status',404);
      const owned=await route(new Request(`${origin}/v1/research/${jobId}`,{headers:{cookie}}),['research',jobId]);
      expect(owned.status).toBe(200);
    }finally{if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
});
