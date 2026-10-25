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
  it('authorizes one event batch, isolates recipients, and caps provider plans at 20 per hour',async()=>{
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-456789';
    try{
      const origin='https://neymi.example',session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']);
      const cookie=session.headers.get('set-cookie')!.split(';')[0],headers={origin,cookie,'content-type':'application/json'};
      const context=makeContext({id:'event_context',eventId:'event_demo'}),approval=await createContextApproval('I build robotics products.',context.id,'Prepare for this event',timestamp),approvedContext=await buildCloudContext('I build robotics products.',[],approval);
      const researches=Array.from({length:20},(_,index)=>{
        const id=`recipient_${index}`,sourceId=`source_${index}`;
        return makeResearch({recipient:{id,displayName:`Guest ${index}`,identityStatus:'verified',eventId:'event_demo'},state:'ready',sources:[{id:sourceId,title:'Speaker bio',origin:'user_provided',accessedAt:timestamp,publishedAt:null,excerpt:'Discusses robotics'}],claims:[{id:`claim_${index}`,recipientId:id,kind:'unknown',claim:'Discusses robotics',sourceIds:[sourceId],confidence:'unknown',checkedAt:timestamp}]});
      });
      const wrongDigest=await route(new Request(`${origin}/v1/activity/plans`,{method:'POST',headers,body:JSON.stringify({eventId:'event_demo',context,approvedContext:{...approvedContext,text:'not approved'},researches:researches.slice(0,1)})}),['activity','plans']);
      expect(wrongDigest.status).toBe(403);
      const request=()=>route(new Request(`${origin}/v1/activity/plans`,{method:'POST',headers,body:JSON.stringify({eventId:'event_demo',context,approvedContext,researches})}),['activity','plans']);
      const result=await request(),body=await result.json();
      expect(result.status).toBe(200);expect(body.results).toHaveLength(20);expect(body.results[0].recipe.eventId).toBe('event_demo');
      const exceeded=await route(new Request(`${origin}/v1/activity/plans`,{method:'POST',headers,body:JSON.stringify({eventId:'event_demo',context,approvedContext,researches:researches.slice(0,1)})}),['activity','plans']);
      expect(exceeded.status).toBe(429);
    }finally{if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
});
