import {afterEach,describe,expect,it,vi} from 'vitest';
import {route} from '../../src/server/router';
import {serializeDesignerTurnPayload,serializeDesignerProposalPayload} from '../../src/modules/assistant/designer/payload';
import {designerProposalInputSchema} from '../../src/modules/assistant/designer/schemas';

describe('card designer API',()=>{
  const previousSecret=process.env.NEYMI_SESSION_SECRET;
  afterEach(()=>{if(previousSecret===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previousSecret;vi.doUnmock('../../src/server/providers/llm');vi.resetModules();});
  it('requires an owner session and rejects a payload that differs from its approved text',async()=>{
    process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-123456';
    const origin='https://neymi.example';
    const unauth=await route(new Request(`${origin}/v1/designer/turn`,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'}),['designer','turn']);
    expect(unauth.status).toBe(404);
    const session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']);
    const cookie=session.headers.get('set-cookie')!.split(';')[0];
    const text='我是林予安，想做合作名片。',base={message:text,slots:{highlightRefs:[],tone:'clear' as const,density:'normal' as const,language:'zh' as const},evidence:[],recentMessages:[],templateIds:['soft-signal']},approvedText=serializeDesignerTurnPayload(base),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(approvedText));
    const contentDigest=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    const approvedContext={approval:{id:'approval_1',contextId:'designer_1',contentDigest,purpose:'设计名片',approvedAt:'2026-10-27T00:00:00.000Z'},text:approvedText,factIds:[],moduleMetadata:[]};
    const payload={...base,approvedContext,requestId:'req_1',sessionRevision:0,profileRevision:1};
    const response=await route(new Request(`${origin}/v1/designer/turn`,{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({...payload,approvedContext:{...approvedContext,text:'另一个未经批准的内容'}})}),['designer','turn']);
    expect(response.status).toBe(403);
  });
  it('returns a real unavailable response when the model provider is not configured',async()=>{
    vi.doMock('../../src/server/providers/llm',async importOriginal=>{const actual=await importOriginal<typeof import('../../src/server/providers/llm')>();return{...actual,getLLMProvider:()=>new actual.UnconfiguredLLMProvider()};});
    process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-123456';
    const origin='https://neymi.example',session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']),cookie=session.headers.get('set-cookie')!.split(';')[0];
    const text='我是林予安，想做合作名片。',base={message:text,slots:{highlightRefs:[],tone:'clear' as const,density:'normal' as const,language:'zh' as const},evidence:[],recentMessages:[],templateIds:['soft-signal']},approvedText=serializeDesignerTurnPayload(base),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(approvedText)),contentDigest=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    const input={...base,approvedContext:{approval:{id:'approval_1',contextId:'designer_1',contentDigest,purpose:'设计名片',approvedAt:'2026-10-27T00:00:00.000Z'},text:approvedText,factIds:[],moduleMetadata:[]},requestId:'req_2',sessionRevision:0,profileRevision:1};
    const response=await route(new Request(`${origin}/v1/designer/turn`,{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify(input)}),['designer','turn']);
    expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:{code:'SERVICE_UNAVAILABLE'}});
  });
  it('keeps the exact approved designer proposal payload after server schema parsing',()=>{
    const base={message:'Make a simple card.',slots:{displayName:'Sample Designer',primaryHighlightRef:'__basic__',highlightRefs:[],tone:'clear' as const,density:'normal' as const,language:'zh' as const},evidence:[],recentMessages:[{role:'user' as const,text:'I design products.'}],templateIds:['soft-signal'],confirmedEvidenceIds:[],allowedFieldRefs:[]},approvedText=serializeDesignerProposalPayload(base),input=designerProposalInputSchema.parse({...base,approvedContext:{approval:{id:'approval_1',contextId:'designer_1',contentDigest:'a'.repeat(64),purpose:'Design card',approvedAt:'2026-10-27T00:00:00.000Z'},text:approvedText,factIds:[],moduleMetadata:[]},requestId:'req_1',sessionRevision:1,profileRevision:1});
    expect(serializeDesignerProposalPayload(input)).toBe(approvedText);
  });
});
