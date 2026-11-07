import {describe,expect,it,vi} from 'vitest';
import {SupabasePublicationStore} from '../../src/modules/publication/supabase-store';
import {makeProjection} from '../fixtures/domain';

describe('Supabase publication store',()=>{
  it('maps a stored publication returned by the REST API',async()=>{
    const fetcher=vi.fn(async()=>Response.json([{
      public_id:'public_123456789012',owner_id:'owner',projection_json:makeProjection(),digest:'a'.repeat(64),revoke_hash:'b'.repeat(64),idempotency_key:'key',created_at:'2026-11-07T00:00:00.000Z',expires_at:'2026-11-08T00:00:00.000Z',revoked_at:null,
    }]));
    const store=new SupabasePublicationStore({url:'https://project.supabase.co',key:'service-key',fetcher});
    const value=await store.get('public_123456789012');
    expect(value).toEqual({publicId:'public_123456789012',ownerId:'owner',projection:makeProjection(),digest:'a'.repeat(64),revokeHash:'b'.repeat(64),idempotencyKey:'key',createdAt:'2026-11-07T00:00:00.000Z',expiresAt:'2026-11-08T00:00:00.000Z'});
  });

  it('writes the publication through the REST API with server credentials',async()=>{
    const calls:Array<[string|URL|Request,RequestInit?]>=[],fetcher=async(input:string|URL|Request,init?:RequestInit)=>{calls.push([input,init]);return new Response(null,{status:201});};
    const store=new SupabasePublicationStore({url:'https://project.supabase.co',key:'service-key',fetcher});
    await store.create({publicId:'public_123456789012',ownerId:'owner',projection:makeProjection(),digest:'a'.repeat(64),revokeHash:'b'.repeat(64),idempotencyKey:'key',createdAt:'2026-11-07T00:00:00.000Z',expiresAt:'2026-11-08T00:00:00.000Z'});
    const [url,init]=calls[0];
    expect(String(url)).toBe('https://project.supabase.co/rest/v1/neymi_publications');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer service-key');
  });
});
