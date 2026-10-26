import {describe,expect,it} from 'vitest';
import {normalizeCardUrl} from '../../src/modules/card/links';
import {projectShare} from '../../src/modules/sharing/projection';
import {serializeNcard,serializeVcard} from '../../src/modules/sharing/export';
import {importSharedCard} from '../../src/modules/sharing/import';
import {makeDraft,makeProjection} from '../fixtures/domain';

describe('safe selective external records',()=>{
  it.each([['example.org/work','https://example.org/work'],['https://example.org','https://example.org/'],['http://example.org/a','http://example.org/a']])('normalizes %s',(value,expected)=>expect(normalizeCardUrl(value)).toBe(expected));
  it.each(['javascript:alert(1)','data:text/html,hi','file:///tmp/a','https://user:secret@example.org','//example.org','https://example.org\n/evil','not a url'])('rejects %s',value=>expect(()=>normalizeCardUrl(value)).toThrow());
  it('account and URL are independently allowlisted in JSON and vCard',()=>{
    const draft=makeDraft({modules:[{id:'social',kind:'social',title:'Social',items:[{id:'account',label:'账号',value:'PRIVATE_ACCOUNT',sensitivity:'ordinary'},{id:'url',label:'URL',value:'example.org/work',sensitivity:'ordinary'}]}]});
    const urlOnly=projectShare(draft,{identity:['name'],fields:[{moduleId:'social',itemId:'url'}],assetIds:[]});
    expect(new TextDecoder().decode(serializeNcard(urlOnly))).not.toContain('PRIVATE_ACCOUNT');
    expect(new TextDecoder().decode(serializeVcard(urlOnly))).toContain('URL:https://example.org/work');
    const accountOnly=projectShare(draft,{identity:['name'],fields:[{moduleId:'social',itemId:'account'}],assetIds:[]});
    const accountVcard=new TextDecoder().decode(serializeVcard(accountOnly));
    expect(accountVcard).toContain('NOTE:账号: PRIVATE_ACCOUNT');expect(accountVcard).not.toContain('TEL:');
    expect(new TextDecoder().decode(serializeNcard(accountOnly))).not.toContain('example.org');
  });
  it('rejects unsafe links on import but preserves old cards',async()=>{
    const old=makeProjection();expect(await importSharedCard(serializeNcard(old))).toEqual(old);
    const invalid=makeProjection({modules:[{kind:'website',title:'Site',items:[{label:'URL',value:'javascript:alert(1)'}]}]});
    await expect(importSharedCard(new TextEncoder().encode(JSON.stringify(invalid)))).rejects.toThrow();
  });
});
