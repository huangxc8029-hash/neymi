import {describe, expect, it} from 'vitest';
import {socialPreview, publicCardUrl} from '../../src/modules/publication/social-preview';
import type {ShareProjection} from '../../src/domain/types';

const projection: ShareProjection = {
  schemaVersion:1, format:'ncard-public-share',
  identity:{name:'Alex', role:'Designer', company:'Studio'},
  modules:[{kind:'contact', title:'Contacts', items:[{label:'email',value:'private@example.org'}]}],
  assets:[],templateId:'midnight',layout:'editorial',animation:'float',
};

describe('social preview privacy and identity',()=>{
  it('uses only the user-approved public identity, never contact modules',()=>{
    const preview=socialPreview(projection);
    expect(preview.title).toContain('Alex');
    expect(preview.description).toContain('Designer');
    expect(JSON.stringify(preview)).not.toContain('private@example.org');
  });
  it('uses a neutral fallback when identity has no name',()=>{
    expect(socialPreview({...projection,identity:{}}).title).toContain('Neymi');
  });
  it('constructs an encoded canonical path without accepting untrusted hosts',()=>{
    expect(publicCardUrl('abc_123')).toBe('https://swtpic.com/p/abc_123');
  });
});
