import {beforeEach,describe,expect,it,vi} from 'vitest';
import {timestamp} from '../fixtures/domain';
import {serializeContentSourceSegments} from '../../src/modules/content/source-manifest';

const mocks=vi.hoisted(()=>({proposeModules:vi.fn()}));
vi.mock('../../src/server/providers/llm',async importOriginal=>{
  const actual=await importOriginal<typeof import('../../src/server/providers/llm')>();
  return {...actual,getLLMProvider:()=>({proposeFacts:async()=>[],proposeModules:mocks.proposeModules,plan:async()=>({})})};
});
import {route} from '../../src/server/router';

async function approved(text:string){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');}
describe('module proposal API boundary',()=>{
  beforeEach(()=>mocks.proposeModules.mockReset());
  it('requires exact-text approval and an approved source manifest before provider invocation',async()=>{
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-123456';
    try{
      const origin='https://neymi.test',session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']),cookie=session.headers.get('set-cookie')!.split(';')[0];
      const source={kind:'file' as const,sourceId:'file-1',paragraph:1,createdAt:timestamp},segments=[{sourceRef:source,text:'An exact project result.'}],text=`An exact project result.\n\nSelected source segments: ${serializeContentSourceSegments(segments)}`;
      mocks.proposeModules.mockResolvedValue([{id:'proposal_api',kind:'project_case',title:'Project result',items:[{id:'result',label:'Result',value:'An exact project result.'}],sourceRefs:[source],rationale:'Exact excerpt',missingEvidence:[]}]);
      const context={text,factIds:[],moduleMetadata:[],approval:{id:'approval_api',contextId:'context_api',contentDigest:await approved(text),purpose:'Create module proposals',approvedAt:timestamp}};
      const changedSegments=[{sourceRef:{...source,sourceId:'other-file'},text:segments[0].text}];
      const denied=await route(new Request(`${origin}/v1/modules/proposals`,{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({context,segments:changedSegments})}),['modules','proposals']);
      expect(denied.status).toBe(403);expect(mocks.proposeModules).not.toHaveBeenCalled();
      const allowed=await route(new Request(`${origin}/v1/modules/proposals`,{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({context,segments})}),['modules','proposals']);
      expect(allowed.status).toBe(200);expect((await allowed.json() as {proposals:Array<{status:string}>}).proposals[0]?.status).toBe('candidate');expect(mocks.proposeModules).toHaveBeenCalledTimes(1);
    }finally{if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
});
