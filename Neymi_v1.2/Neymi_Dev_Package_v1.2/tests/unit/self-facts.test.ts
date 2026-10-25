import {describe,expect,it} from 'vitest';
import {MemoryVaultStorage} from '../../src/modules/vault/storage';
import {createVault} from '../../src/modules/vault/vault';
import {detectSensitiveText,buildCloudContext,cloudContextText,confirmSelfFact,LocalFactsStore,proposeSelfFacts} from '../../src/modules/self/facts';
import type {ApprovedCloudContext,CandidateSelfFact} from '../../src/domain/types';
import {timestamp} from '../fixtures/domain';

const candidate:CandidateSelfFact={id:'fact_robotics',text:'Built a warehouse robotics demo',category:'project',origin:'ai_extracted'};
async function approved(text:string):Promise<ApprovedCloudContext>{
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),byte=>byte.toString(16).padStart(2,'0')).join('');
  return {approval:{id:'approval',contextId:'context_demo',contentDigest:digest,purpose:'Extract professional facts',approvedAt:timestamp},text,factIds:[],moduleMetadata:[]};
}

describe('self facts and cloud context',()=>{
  it('detects contact details and address-like text with character offsets',()=>{
    const text='Contact me: demo@example.org or +1 415 555 0199 at 123 Main Street';
    const matches=detectSensitiveText(text);
    expect(matches.map(item=>item.kind)).toEqual(['email','phone','address']);
    expect(matches.every(({start,end})=>text.slice(start,end).length>0)).toBe(true);
  });
  it('requires exact approved text and refuses detected contacts',async()=>{
    const context=await approved('I built a robotics demo.');
    await expect(buildCloudContext(context.text,[],context.approval)).resolves.toEqual(context);
    await expect(buildCloudContext('Changed text',[],context.approval)).rejects.toThrow();
    await expect(buildCloudContext('Call +1 415 555 0199',[],context.approval)).rejects.toThrow();
    const fact=confirmSelfFact(candidate,candidate.text,timestamp),withFact=await approved(cloudContextText(context.text,[fact]));
    await expect(buildCloudContext(context.text,[fact],withFact.approval)).resolves.toMatchObject({factIds:[fact.id]});
    await expect(buildCloudContext(context.text,[{...fact,text:'Changed fact'}],withFact.approval)).rejects.toThrow();
  });
  it('saves no AI suggestions until user confirms an edited candidate',async()=>{
    const vault=createVault(new MemoryVaultStorage()),store=new LocalFactsStore(vault);
    await expect(store.list()).resolves.toHaveLength(0);
    const confirmed=confirmSelfFact(candidate,'Built a warehouse robotics demo for a pilot.',timestamp);
    await store.add(confirmed);
    expect(await store.list()).toEqual([expect.objectContaining({text:'Built a warehouse robotics demo for a pilot.',revision:1})]);
    expect((await store.list())[0]).toHaveProperty('confirmedAt',timestamp);
  });
  it('validates provider suggestions and never adds them to local facts automatically',async()=>{
    const vault=createVault(new MemoryVaultStorage()),store=new LocalFactsStore(vault),context=await approved('I built a robotics demo.');
    const provider={proposeFacts:async()=>[candidate]};
    await expect(proposeSelfFacts(context,provider)).resolves.toEqual([candidate]);
    expect(await store.list()).toEqual([]);
    await expect(proposeSelfFacts(context,{proposeFacts:async()=>[{...candidate,phone:'PRIVATE_SENTINEL'}]})).rejects.toThrow();
  });
});
