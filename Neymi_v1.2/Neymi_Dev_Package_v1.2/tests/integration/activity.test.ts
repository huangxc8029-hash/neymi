import {describe,expect,it} from 'vitest';
import {route} from '../../src/server/router';
import {buildCloudContext,createContextApproval} from '../../src/modules/self/facts';
import {makeContext,makeResearch,timestamp} from '../fixtures/domain';

describe('event source fetch boundary',()=>{
  it('accepts browser same-origin POSTs without Origin only when Sec-Fetch-Site and Referer agree',async()=>{
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-same-origin-123';
    try{
      const origin='https://neymi.example',headers={'host':'neymi.example','sec-fetch-site':'same-origin',referer:`${origin}/activity`};
      const accepted=await route(new Request(`${origin}/v1/session`,{method:'POST',headers}),['session']);
      expect(accepted.status).toBe(201);
      const forged=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{...headers,referer:'https://attacker.example/activity'}}),['session']);
      expect(forged.status).toBe(400);
      const crossSite=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{...headers,'sec-fetch-site':'cross-site'}}),['session']);
      expect(crossSite.status).toBe(400);
    }finally{if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
  it('requires same-origin requests and rejects private-network URLs',async()=>{
    const origin='https://neymi.example';
    const crossOrigin=await route(new Request(`${origin}/v1/activity/source`,{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:JSON.stringify({url:'https://example.org/agenda'})}),['activity','source']);
    expect(crossOrigin.status).toBe(400);
    const privateUrl=await route(new Request(`${origin}/v1/activity/source`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({url:'https://127.0.0.1/private'})}),['activity','source']);
    expect(privateUrl.status).toBe(400);
  });
  it('returns a clear unavailable response for event plans without a provider',async()=>{
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-456789';
    try{
      const origin='https://neymi.example',session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']);
      const cookie=session.headers.get('set-cookie')!.split(';')[0],headers={origin,cookie,'content-type':'application/json'};
      const context=makeContext({id:'event_context',eventId:'event_demo'}),approval=await createContextApproval('Discuss robotics.',context.id,'Prepare for this event',timestamp),approvedContext=await buildCloudContext('Discuss robotics.',[],approval);
      const researches=[makeResearch({recipient:{id:'recipient_demo',displayName:'Guest',identityStatus:'verified',eventId:'event_demo'},state:'ready'})];
      const response=await route(new Request(`${origin}/v1/activity/plans`,{method:'POST',headers,body:JSON.stringify({eventId:'event_demo',context,approvedContext,researches})}),['activity','plans']);
      expect(response.status).toBe(503);expect(await response.json()).toMatchObject({error:{code:'SERVICE_UNAVAILABLE',message:expect.stringContaining('continue with local preparation')}});
    }finally{if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
});
