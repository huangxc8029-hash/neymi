import {describe,expect,it,vi} from 'vitest';
import {route} from '../../src/server/router';
import {makeContext,makeResearch,timestamp} from '../fixtures/domain';
import {UnconfiguredLLMProvider} from '../../src/server/providers/llm';

describe('strategy API consent boundary',()=>{
  it('returns a labeled rule-based draft only for the exact approved context',async()=>{
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-123456';
    try{
      const origin='https://neymi.example',session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']);
      const cookie=session.headers.get('set-cookie')!.split(';')[0],headers={origin,cookie,'content-type':'application/json'};
      const text='I built a warehouse robotics demo.',digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
      const contentDigest=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
      const input={context:makeContext(),research:makeResearch(),approvedContext:{approval:{id:'approval',contextId:'context_demo',contentDigest,purpose:'Prepare a card',approvedAt:timestamp},text,factIds:[],moduleMetadata:[]}};
      const response=await route(new Request(`${origin}/v1/plan`,{method:'POST',headers,body:JSON.stringify(input)}),['plan']);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({strategy:{recommendation:'verify_first',confidence:'low',uncertainties:expect.arrayContaining(['AI 服务未配置；当前是规则草案。'])},recipe:{status:'proposed'}});
      const changed=await route(new Request(`${origin}/v1/plan`,{method:'POST',headers,body:JSON.stringify({...input,approvedContext:{...input.approvedContext,text:'Changed'}})}),['plan']);
      expect(changed.status).toBe(403);
    }finally{if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
  it('returns an explicit unavailable response for unconfigured activity planning without waiting for provider timeout',async()=>{
    vi.doMock('../../src/server/providers/llm',async importOriginal=>{
      const actual=await importOriginal<typeof import('../../src/server/providers/llm')>();
      return{...actual,getLLMProvider:()=>new actual.UnconfiguredLLMProvider()};
    });
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-123456';
    try{
      const {getLLMProvider}=await import('../../src/server/providers/llm');expect(getLLMProvider()).toBeInstanceOf(UnconfiguredLLMProvider);
      const origin='https://neymi.example',session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']);
      const cookie=session.headers.get('set-cookie')!.split(';')[0],context=makeContext({id:'event_context',eventId:'event_demo'}),text='Professional event preparation';
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)),contentDigest=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
      const input={eventId:'event_demo',context,approvedContext:{approval:{id:'event_approval',contextId:context.id,contentDigest,purpose:'Prepare for event',approvedAt:timestamp},text,factIds:[],moduleMetadata:[]},researches:[makeResearch({recipient:{id:'recipient_event',displayName:'Event guest',identityStatus:'verified',eventId:'event_demo'},state:'ready'})]};
      const response=await route(new Request(`${origin}/v1/activity/plans`,{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify(input)}),['activity','plans']);
      expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:{code:'SERVICE_UNAVAILABLE',message:expect.stringContaining('continue with local preparation')}});
    }finally{vi.doUnmock('../../src/server/providers/llm');vi.resetModules();if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
});
