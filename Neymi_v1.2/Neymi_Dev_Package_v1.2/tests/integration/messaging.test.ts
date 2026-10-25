import {createHmac} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {route} from '../../src/server/router';
import {closeMessagingRuntime} from '../../src/server/messaging-runtime';
import {getConfiguredPublicationStore} from '../../src/modules/publication/store';
import {confirmShare} from '../../src/modules/sharing/confirmation';
import {makeProjection} from '../fixtures/domain';

const origin='https://neymi.example',webhookSecret='fixture-webhook-signing-secret-is-at-least-32-bytes';
let directory='',cookie='',publicationId='';
const previous:Record<string,string|undefined>={};
const envKeys=['NEYMI_SQLITE_PATH','NEYMI_SESSION_SECRET','NEYMI_PUBLICATION_SECRET','NEYMI_MESSAGING_ADAPTER','NEYMI_MESSAGING_WEBHOOK_SECRET'];

beforeAll(async()=>{
  directory=mkdtempSync(join(tmpdir(),'neymi-messaging-api-'));
  for(const key of envKeys)previous[key]=process.env[key];
  process.env.NEYMI_SQLITE_PATH=join(directory,'messaging.sqlite');process.env.NEYMI_SESSION_SECRET='messaging-api-session-secret-at-least-thirty-two-bytes';
  process.env.NEYMI_PUBLICATION_SECRET='messaging-api-publication-secret-at-least-thirty-two-bytes';
  process.env.NEYMI_MESSAGING_ADAPTER='fixture-hmac';process.env.NEYMI_MESSAGING_WEBHOOK_SECRET=webhookSecret;
  const session=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']);cookie=session.headers.get('set-cookie')!.split(';')[0];
  const projection=makeProjection(),confirmation=await confirmShare(projection,'publish');
  const created=await route(new Request(`${origin}/v1/publications`,{method:'POST',headers:{origin,cookie,'content-type':'application/json','idempotency-key':'m'.repeat(40)},body:JSON.stringify({projection,confirmation})}),['publications']);
  publicationId=(await created.json()).publication.publicId;
});
afterAll(()=>{closeMessagingRuntime();getConfiguredPublicationStore().close();for(const key of envKeys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}if(directory)rmSync(directory,{recursive:true,force:true});});

describe('messaging API boundary',()=>{
  it('accepts a valid signed fixture webhook once, with no body echoed or stored in response',async()=>{
    const raw=JSON.stringify({eventId:'fixture-event-api',type:'delivery.receipt'}),timestamp=String(Math.floor(Date.now()/1000));
    const signature=createHmac('sha256',webhookSecret).update(`${timestamp}.${raw}`).digest('hex'),headers={'x-neymi-timestamp':timestamp,'x-neymi-event-id':'fixture-event-api','x-neymi-signature':`sha256=${signature}`,'content-type':'application/json'};
    const post=()=>route(new Request(`${origin}/v1/messaging/webhook`,{method:'POST',headers,body:raw}),['messaging','webhook']);
    expect((await post()).status).toBe(202);const duplicate=await post();expect(duplicate.status).toBe(200);expect(await duplicate.json()).toEqual({accepted:true,duplicate:true});
    const tampered=await route(new Request(`${origin}/v1/messaging/webhook`,{method:'POST',headers,body:`${raw} `}),['messaging','webhook']);expect(tampered.status).toBe(403);
  });

  it('issues a fragment-only short-lived handoff for an active publication and consumes it once',async()=>{
    const headers={origin,cookie,'content-type':'application/json'},created=await route(new Request(`${origin}/v1/messaging/handoffs`,{method:'POST',headers,body:JSON.stringify({publicationId})}),['messaging','handoffs']);
    expect(created.status).toBe(201);const body=await created.json(),url=new URL(body.url);expect(url.pathname).toBe('/handoff');expect(url.search).toBe('');expect(url.hash).toMatch(/^#ticket=/);
    const ticket=new URLSearchParams(url.hash.slice(1)).get('ticket')!,consume=()=>route(new Request(`${origin}/v1/messaging/handoffs/consume`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({ticket})}),['messaging','handoffs','consume']);
    const consumed=await consume();expect(consumed.status).toBe(200);expect(await consumed.json()).toEqual({publicationId});expect((await consume()).status).toBe(404);
  });

  it('rejects cross-origin consume and leaves production webhook disabled until a provider is approved',async()=>{
    const cross=await route(new Request(`${origin}/v1/messaging/handoffs/consume`,{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:JSON.stringify({ticket:'a'.repeat(43)})}),['messaging','handoffs','consume']);expect(cross.status).toBe(400);
    process.env.NEYMI_MESSAGING_ADAPTER='';const disabled=await route(new Request(`${origin}/v1/messaging/webhook`,{method:'POST',body:'{}'}),['messaging','webhook']);expect(disabled.status).toBe(503);
  });
});
