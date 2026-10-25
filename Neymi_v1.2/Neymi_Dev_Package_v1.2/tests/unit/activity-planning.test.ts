import {describe,expect,it,vi} from 'vitest';
import {ApiError} from '../../src/server/errors';
import {planActivity} from '../../src/modules/activity/planning';
import type {ActivityPlanInput} from '../../src/modules/activity/planning';
import type {LLMProvider} from '../../src/server/providers/llm';
import {makeContext,makeResearch,timestamp} from '../fixtures/domain';

function input(ids=['recipient_a','recipient_b']):ActivityPlanInput{
  const context=makeContext({id:'context_event',eventId:'event_demo'});
  return{eventId:'event_demo',context,approvedContext:{approval:{id:'approval_event',contextId:context.id,contentDigest:'a'.repeat(64),purpose:'Prepare for this event',approvedAt:timestamp},text:'I build robotics products.',factIds:[],moduleMetadata:[]},researches:ids.map(id=>{
    const sourceId=`source_${id}`;return makeResearch({recipient:{id,displayName:id,identityStatus:'verified',eventId:'event_demo'},state:'ready',sources:[{id:sourceId,title:'User-provided speaker bio',origin:'user_provided',accessedAt:timestamp,publishedAt:null,excerpt:'Discusses robotics'}],claims:[{id:`claim_${id}`,recipientId:id,kind:'unknown',claim:'Discusses robotics',sourceIds:[sourceId],confidence:'unknown',checkedAt:timestamp}]});
  })};
}
const provider=(plan:LLMProvider['plan']):LLMProvider=>({plan,proposeFacts:async()=>[]});

describe('event multi-recipient strategy preparation',()=>{
  it('makes a separate cautious strategy and event-scoped recipe per confirmed recipient',async()=>{
    const results=await planActivity(input());
    expect(results.map(item=>item.state)).toEqual(['ready','ready']);
    expect(results.map(item=>item.strategy?.recipientId)).toEqual(['recipient_a','recipient_b']);
    expect(results.map(item=>item.recipe?.eventId)).toEqual(['event_demo','event_demo']);
    expect(results.every(item=>item.strategy?.recommendation==='verify_first')).toBe(true);
  });
  it('isolates provider failures without presenting a failed live request as a rule success',async()=>{
    const model=provider(async value=>{if(value.research.recipient.id==='recipient_a')throw new Error('PRIVATE_SENTINEL');throw new ApiError('SERVICE_UNAVAILABLE','offline',503);});
    const results=await planActivity(input(),{provider:model});
    expect(results.map(item=>item.state)).toEqual(['failed','failed']);
    expect(results[0].error).toBe('此人方案生成失败，可单独重试。');
    expect(JSON.stringify(results)).not.toContain('PRIVATE_SENTINEL');
  });
  it('requires unique confirmed people in the same activity and caps batches at 20',async()=>{
    const unconfirmed=input();unconfirmed.researches[0].recipient.identityStatus='unverified';
    await expect(planActivity(unconfirmed)).rejects.toThrow();
    const wrongEvent=input();wrongEvent.researches[0].recipient.eventId='other_event';
    await expect(planActivity(wrongEvent)).rejects.toThrow();
    await expect(planActivity(input(Array.from({length:21},(_,index)=>`recipient_${index}`)))).rejects.toThrow();
  });
  it('reuses a matching approved result and cancels remaining people',async()=>{
    const source=input(),cache=new Map<string,{strategy:NonNullable<Awaited<ReturnType<typeof planActivity>>[number]['strategy']>;recipe:NonNullable<Awaited<ReturnType<typeof planActivity>>[number]['recipe']>}>();
    const first=await planActivity(source,{cache}),second=await planActivity(source,{cache});
    expect(first.map(item=>item.state)).toEqual(['ready','ready']);expect(second.map(item=>item.state)).toEqual(['reused','reused']);
    const controller=new AbortController(),call=vi.fn(async()=>{controller.abort();throw new ApiError('SERVICE_UNAVAILABLE','offline',503);});
    const cancelled=await planActivity(source,{provider:provider(call),signal:controller.signal});
    expect(call).toHaveBeenCalledTimes(1);expect(cancelled.map(item=>item.state)).toEqual(['cancelled','cancelled']);
  });
});
