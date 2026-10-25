import {describe,expect,it} from 'vitest';
import {createSession,readSession,sessionCookie} from '../../src/server/session';
import {JobStore} from '../../src/server/store';
import {authorizeContext} from '../../src/modules/consent/cloud';
import {timestamp} from '../fixtures/domain';
import {SqliteJobStore} from '../../src/server/store';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {route} from '../../src/server/router';

describe('anonymous cloud boundary',()=>{
  it('creates unique opaque sessions',async()=>{
    const a=await createSession(),b=await createSession();
    expect(a.id).not.toBe(b.id);expect(a.id.length).toBeGreaterThan(32);
    expect(Date.parse(a.expiresAt)).toBeGreaterThan(Date.now());
  });
  it('sets an HttpOnly same-site cookie for same-origin session creation',async()=>{
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-123456';
    const request=new Request('https://neymi.example/v1/session',{method:'POST',headers:{origin:'https://neymi.example'}});
    const response=await route(request,['session']);
    try{
      expect(response.status).toBe(201);
      expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/);
      expect(response.headers.get('set-cookie')).toMatch(/SameSite=Lax/);
      const cookie=response.headers.get('set-cookie')!.split(';')[0];
      expect(readSession(new Request('https://neymi.example/',{headers:{cookie}}))).toBeTruthy();
      expect(readSession(new Request('https://neymi.example/',{headers:{cookie:cookie.replace(/.$/,'x')}}))).toBeNull();
    }finally{if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
  it('expires signed session cookies after 24 hours',async()=>{
    const previous=process.env.NEYMI_SESSION_SECRET;process.env.NEYMI_SESSION_SECRET='test-signing-secret-long-enough-123456';
    try{
      const now=new Date('2026-10-25T00:00:00.000Z'),session=await createSession(now);
      const cookie=sessionCookie(session).split(';')[0];
      expect(readSession(new Request('https://neymi.example/',{headers:{cookie}}),now.getTime()+24*60*60*1000)).toBeNull();
    }finally{if(previous===undefined)delete process.env.NEYMI_SESSION_SECRET;else process.env.NEYMI_SESSION_SECRET=previous;}
  });
  it('rejects cross-origin writes',async()=>{
    const request=new Request('https://neymi.example/v1/session',{method:'POST',headers:{origin:'https://attacker.example'}});
    expect((await route(request,['session'])).status).toBe(400);
  });
  it('returns a not-found response without an owner session',async()=>{
    const request=new Request('https://neymi.example/v1/jobs/id',{method:'GET'});
    expect((await route(request,['jobs','id'])).status).toBe(404);
  });
  it('does not reveal another session’s job',async()=>{
    const store=new JobStore(),id=await store.create('owner_a',{kind:'research',value:'public'});
    await expect(store.get('owner_b',id)).rejects.toMatchObject({code:'NOT_FOUND'});
    expect(await store.get('owner_a',id)).toMatchObject({kind:'research'});
  });
  it('requires an approval digest matching the actual selected text',async()=>{
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('Approved excerpt'));
    const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const context={approval:{id:'approval',contextId:'context',contentDigest:hex,purpose:'Plan a card',approvedAt:timestamp},text:'Approved excerpt',factIds:[],moduleMetadata:[]};
    await expect(authorizeContext(context)).resolves.toBeUndefined();
    await expect(authorizeContext({...context,text:'Changed'})).rejects.toMatchObject({code:'PERMISSION_DENIED'});
    await expect(authorizeContext({...context,profile:{private:'PRIVATE_SENTINEL'}} as never)).rejects.toThrow();
  });
  it('expires and deletes work without exposing content to other owners',async()=>{
    const store=new JobStore(),id=await store.create('owner_a',{kind:'research',value:'public'});
    await store.purgeExpired(new Date(Date.now()+25*60*60*1000).toISOString());
    expect(await store.has(id)).toBe(false);
    await expect(store.get('owner_a',id)).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('does not resurrect a deleted task',async()=>{
    const store=new JobStore(),id=await store.create('owner_a',{kind:'research'});
    await store.delete('owner_a',id);
    await expect(store.get('owner_a',id)).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('enforces a ten task hourly quota',async()=>{
    const store=new JobStore();
    for(let i=0;i<10;i++)await store.create('owner',{index:i});
    await expect(store.create('owner',{})).rejects.toMatchObject({code:'RATE_LIMITED',status:429});
  });
  it('persists jobs in SQLite and keeps owner checks after reopening',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'neymi-store-')),file=join(dir,'jobs.sqlite');
    let first:SqliteJobStore|undefined,second:SqliteJobStore|undefined;
    try{
      first=new SqliteJobStore(file);const id=await first.create('owner_a',{secret:'PRIVATE_SENTINEL'});first.close();first=undefined;
      second=new SqliteJobStore(file);
      expect(await second.get('owner_a',id)).toEqual({secret:'PRIVATE_SENTINEL'});
      await expect(second.get('owner_b',id)).rejects.toMatchObject({code:'NOT_FOUND'});
      await second.delete('owner_a',id);await expect(second.get('owner_a',id)).rejects.toMatchObject({code:'NOT_FOUND'});
    }finally{first?.close();second?.close();rmSync(dir,{recursive:true,force:true});}
  });
});
