import {describe,expect,it} from 'vitest';
import {studioNavigationForIntent} from '../../src/modules/card/studio-bridge';

describe('assistant studio navigation',()=>{
  it('routes templates, modules, visibility, and sharing through typed editor actions',()=>{
    expect(studioNavigationForIntent('style_pairing')).toEqual({step:'appearance',target:'editor'});
    expect(studioNavigationForIntent('create_module')).toEqual({step:'personal',target:'editor'});
    expect(studioNavigationForIntent('recipient_card')).toEqual({step:'visibility',target:'editor'});
    expect(studioNavigationForIntent('share_check')).toEqual({step:'visibility',target:'share'});
  });
  it('leaves non-studio tasks to their own routes',()=>{
    expect(studioNavigationForIntent('import')).toBeNull();
    expect(studioNavigationForIntent('event')).toBeNull();
  });
});
