import {expect,it} from 'vitest';
import {createManualDraft} from '../../src/modules/card/create';
import {makeManual,makeProfile} from '../fixtures/domain';
import {DEFAULT_CARD_TEMPLATE,FREE_CARD_TEMPLATES,PRO_CARD_TEMPLATES,cardThemeStyle,getCardTemplate,resolveCardTemplateId} from '../../src/modules/card/templates';

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

it('registers six requested premium styles and keeps all prior IDs readable',()=>{
  expect(PRO_CARD_TEMPLATES.map(template=>template.id)).toEqual(['pixel-game','oriental-newwave','y2k','street-graffiti','scrapbook','cyber-neon']);
  expect(DEFAULT_CARD_TEMPLATE).toBe('soft-signal');expect(FREE_CARD_TEMPLATES[0].id).toBe('soft-signal');
  expect(new Set(PRO_CARD_TEMPLATES.map(template=>template.openingEffect)).size).toBe(6);
  for(const id of ['paper','midnight','evergreen','coast','clay','lilac'])expect(resolveCardTemplateId(id)).toBe(id);
  for(const id of ['mosaic-porcelain','mosaic-glass','mosaic-memories','dopamine-candy','dopamine-tropical','dopamine-stickers','anime-daily','anime-adventure','anime-cel'])expect(resolveCardTemplateId(id)).toBe(id);
  expect(getCardTemplate('unknown-template').id).toBe('soft-signal');
  expect(new Set(PRO_CARD_TEMPLATES.map(template=>template.moduleShell)).size).toBeGreaterThan(1);
  expect(new Set(PRO_CARD_TEMPLATES.map(template=>template.layout)).size).toBeGreaterThan(1);
  expect(new Set(PRO_CARD_TEMPLATES.map(template=>cardThemeStyle(template.id).backgroundImage)).size).toBe(6);
});
