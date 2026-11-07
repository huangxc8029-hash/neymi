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
});
