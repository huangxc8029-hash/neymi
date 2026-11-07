import {afterEach,describe,expect,it,vi} from 'vitest';

describe('server runtime loading',()=>{
  afterEach(()=>vi.resetModules());

  it('creates a session without loading the SQLite runtime',async()=>{
    vi.doMock('node:sqlite',()=>{throw new Error('node:sqlite is unavailable in this function runtime');});
    process.env.NEYMI_SESSION_SECRET='runtime-session-secret-at-least-thirty-two-bytes';
    const {route}=await import('../../src/server/router');
    const origin='https://cards.example';
    const response=await route(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}),['session']);
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('neymi_session=');
  });

  it('exposes a dedicated session function that stays independent of the catch-all API graph',async()=>{
    vi.doMock('node:sqlite',()=>{throw new Error('node:sqlite is unavailable in this function runtime');});
    process.env.NEYMI_SESSION_SECRET='runtime-session-secret-at-least-thirty-two-bytes';
    const handler=await import('../../src/app/v1/session/route');
    const origin='https://cards.example',response=await handler.POST(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin}}));
    expect(response.status).toBe(201);
  });

  it('accepts the public origin forwarded by Vercel ahead of its internal host',async()=>{
    process.env.NEYMI_SESSION_SECRET='runtime-session-secret-at-least-thirty-two-bytes';
    const handler=await import('../../src/app/v1/session/route'),origin='https://swtpic.com';
    const response=await handler.POST(new Request(`${origin}/v1/session`,{method:'POST',headers:{origin,host:'internal.vercel.app','x-forwarded-host':'swtpic.com','x-forwarded-proto':'https'}}));
    expect(response.status).toBe(201);
  });

  it('exposes a dedicated publication function without loading SQLite',async()=>{
    vi.doMock('node:sqlite',()=>{throw new Error('node:sqlite is unavailable in this function runtime');});
    const handler=await import('../../src/app/v1/publications/route');
    const origin='https://cards.example',response=await handler.POST(new Request(`${origin}/v1/publications`,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'}));
    expect(response.status).toBe(404);
  });
});
