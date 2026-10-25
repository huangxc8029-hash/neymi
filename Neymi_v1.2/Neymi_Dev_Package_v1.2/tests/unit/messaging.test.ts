import {createHmac} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {FixtureHmacAdapter,MessagingService} from '../../src/modules/messaging/protocol';
import {MemoryMessagingStore,SqliteMessagingStore} from '../../src/modules/messaging/store';

const secret='fixture-channel-signing-secret-at-least-thirty-two-bytes';
const timestamp=1_798_704_000_000;
function signed(rawBody:string,at=timestamp,eventId='event_1'){
  const seconds=String(Math.floor(at/1000)),signature=createHmac('sha256',secret).update(`${seconds}.${rawBody}`).digest('hex');
  return new Headers({'x-neymi-timestamp':seconds,'x-neymi-event-id':eventId,'x-neymi-signature':`sha256=${signature}`});
}

describe('messaging handoff protocol',()=>{
  it('verifies the exact raw webhook, rejects stale or modified content, and keeps only the event ID',async()=>{
    const raw=JSON.stringify({eventId:'event_1',type:'delivery.receipt'}),adapter=new FixtureHmacAdapter(secret),store=new MemoryMessagingStore(),service=new MessagingService(store);
    const event=adapter.verify(raw,signed(raw),timestamp);
    expect(await service.acceptEvent('fixture',event.eventId,timestamp)).toBe('accepted');
    expect(await service.acceptEvent('fixture',event.eventId,timestamp)).toBe('duplicate');
    expect(await store.snapshot()).toEqual({events:['event_1'],tickets:[]});
    expect(()=>adapter.verify(`${raw} `,signed(raw),timestamp)).toThrow();
    expect(()=>adapter.verify(raw,signed(raw,timestamp-301_000),timestamp)).toThrow();
    expect(()=>adapter.verify(JSON.stringify({eventId:'event_2',type:'message.received',text:'private body'}),signed(raw,timestamp,'event_2'),timestamp)).toThrow();
    const privateId='person@example.com',privateIdBody=JSON.stringify({eventId:privateId,type:'delivery.receipt'});
    expect(()=>adapter.verify(privateIdBody,signed(privateIdBody,timestamp,privateId),timestamp)).toThrow();
  });

  it('limits fixture webhook events per channel and stores no raw content',async()=>{
    const service=new MessagingService(new MemoryMessagingStore(),{webhookLimit:1});
    await service.acceptEvent('fixture','event_1',timestamp);
    await expect(service.acceptEvent('fixture','event_2',timestamp)).rejects.toMatchObject({code:'RATE_LIMITED'});
  });

  it('issues hash-only tickets for at most five minutes and consumes once',async()=>{
    const store=new MemoryMessagingStore(),service=new MessagingService(store),issued=await service.issueHandoff('publication_public123',timestamp);
    expect(Date.parse(issued.expiresAt)-timestamp).toBe(300_000);
    expect(await service.consumeHandoff(issued.ticket,timestamp+1)).toBe('publication_public123');
    expect(await service.consumeHandoff(issued.ticket,timestamp+2)).toBeNull();
    expect(await store.snapshot()).toEqual({events:[],tickets:[{publicationId:'publication_public123',consumed:true}]});
  });

  it('rejects expired tickets and retains durable event idempotency without bodies',async()=>{
    const directory=mkdtempSync(join(tmpdir(),'neymi-messaging-')),filename=join(directory,'store.sqlite');
    try{
      const first=new SqliteMessagingStore(filename),service=new MessagingService(first),issued=await service.issueHandoff('publication_public123',timestamp);
      await service.acceptEvent('fixture','event_persisted',timestamp);first.close();
      const second=new SqliteMessagingStore(filename),restarted=new MessagingService(second);
      expect(await restarted.consumeHandoff(issued.ticket,timestamp+300_001)).toBeNull();
      expect(await restarted.acceptEvent('fixture','event_persisted',timestamp+1)).toBe('duplicate');
      second.close();
    }finally{rmSync(directory,{recursive:true,force:true});}
  });
});
