import {expect,it} from 'vitest';
import {createManualDraft} from '../../src/modules/card/create';
import {makeManual,makeProfile} from '../fixtures/domain';

it('renders every chosen module without exposing locked contact values',()=>{
  const profile=makeProfile();
  profile.modules[0].items.push({id:'private_phone',label:'Phone',value:'PRIVATE_SENTINEL',valueKind:'phone',sensitivity:'sensitive'});
  const config=makeManual({orderedModules:[{localModuleId:'mod_project',kind:'project',emphasis:'high'}]});
  const draft=createManualDraft(profile,config);
  expect(draft.modules[0].items.map(item=>item.value)).toEqual(['Warehouse robot']);
  expect(JSON.stringify(draft)).not.toContain('PRIVATE_SENTINEL');
  expect(draft.config.kind).toBe('manual');
});

it('keeps an unbounded set of optional display modules',()=>{
  const profile=makeProfile();
  for(let i=0;i<7;i++)profile.modules.push({id:`extra_${i}`,kind:'project',title:`Item ${i}`,items:[]});
  const config=makeManual({orderedModules:profile.modules.map(section=>({localModuleId:section.id,kind:'project',emphasis:'normal'}))});
  expect(createManualDraft(profile,config).modules).toHaveLength(8);
});
