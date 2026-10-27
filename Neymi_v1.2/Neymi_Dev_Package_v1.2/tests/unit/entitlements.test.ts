import {describe,expect,it} from 'vitest';
import {FixtureEntitlementPort,IdempotentUsageLedger} from '../../src/modules/content/entitlements';

describe('read-only entitlement and usage boundary',()=>{
  it('returns stable unavailable access for guest and expired plans',async()=>{
    expect(await new FixtureEntitlementPort({status:'guest'}).check({kind:'template',id:'mosaic-porcelain'})).toMatchObject({allowed:false,reason:'sign_in_required'});
    expect(await new FixtureEntitlementPort({status:'expired'}).check({kind:'template',id:'mosaic-porcelain'})).toMatchObject({allowed:false,reason:'plan_expired'});
    expect(await new FixtureEntitlementPort({status:'pro',expiresAt:'2020-01-01T00:00:00.000Z'}).check({kind:'template',id:'mosaic-porcelain'})).toMatchObject({allowed:false,reason:'plan_expired'});
  });
  it('reserves one last unit once, settles only persisted valid work, and replays idempotently',async()=>{
    const ledger=new IdempotentUsageLedger(1);
    const first=await ledger.reserve('job-a'),retry=await ledger.reserve('job-a'),other=await ledger.reserve('job-b');
    expect(first).toEqual(retry);expect(other.status).toBe('unavailable');
    expect(await ledger.settle('job-a',{schemaValid:true,persisted:true})).toMatchObject({status:'settled'});
    expect(await ledger.reserve('job-a')).toMatchObject({status:'settled'});
  });
  it('releases a reservation after cancellation or a result that was not persisted',async()=>{
    const ledger=new IdempotentUsageLedger(1);await ledger.reserve('job-a');
    expect(await ledger.settle('job-a',{schemaValid:true,persisted:false})).toMatchObject({status:'released'});
    expect(await ledger.reserve('job-b')).toMatchObject({status:'reserved'});
  });
});
