import {describe,expect,it} from 'vitest';
import {createGuidedDraft} from '../../src/modules/card/guided-draft';
import {emptyDesignerSlots} from '../../src/modules/assistant/designer/workflow';
import type {DesignerProposal} from '../../src/modules/assistant/designer/types';
import type {LocalProfile} from '../../src/domain/types';

const profile:LocalProfile={schemaVersion:1,id:'profile',revision:3,identity:{name:'Existing name',role:'Designer'},modules:[{id:'private_note',kind:'other',title:'Private',items:[{id:'private_item',label:'Private',value:'Must stay private',sensitivity:'ordinary'}]}],facts:[],assets:[]};
const proposal:DesignerProposal={templateId:'soft-signal',alternatives:[],rationale:'A clean template keeps the verified project in focus.',identityFieldRefs:['name','role'],modules:[{kind:'project',title:'课程项目',evidenceIds:['ev1'],items:[{label:'项目经历',text:'我设计过课程预约流程',evidenceIds:['ev1'],treatment:'verbatim',needsConfirmation:false},{label:'项目亮点',text:'我主导了课程预约产品并大幅提升转化',evidenceIds:['ev1'],treatment:'rewrite',needsConfirmation:true}]}],proposedFieldRefs:[],omissions:[],missingInformation:[]};

describe('createGuidedDraft',()=>{
  it('keeps the profile untouched and excludes unconfirmed rewrites and private modules',()=>{
    const before=structuredClone(profile),draft=createGuidedDraft(profile,proposal,{...emptyDesignerSlots(),displayName:'林予安'},[{id:'ev1',sourceId:'source1',sourceRevision:1,quote:'我设计过课程预约流程',start:0,end:11,status:'confirmed'}],[],'2026-10-28T00:00:00.000Z');
    expect(profile).toEqual(before);
    expect(draft.identity).toEqual({name:'林予安',role:'Designer'});
    expect(draft.modules.flatMap(section=>section.items.map(item=>item.value))).toEqual(['我设计过课程预约流程']);
    expect(draft.modules.some(section=>section.id==='private_note')).toBe(false);
    expect(draft.config.templateId).toBe('soft-signal');
  });

  it('includes rewritten text only after its exact proposal item is confirmed',()=>{
    const evidence=[{id:'ev1',sourceId:'source1',sourceRevision:1,quote:'我设计过课程预约流程',start:0,end:11,status:'confirmed' as const}];
    const draft=createGuidedDraft(profile,proposal,emptyDesignerSlots(),evidence,['0:1'],'2026-10-28T00:00:00.000Z');
    expect(draft.modules.flatMap(section=>section.items.map(item=>item.value))).toEqual(['我设计过课程预约流程','我主导了课程预约产品并大幅提升转化']);
  });
});
