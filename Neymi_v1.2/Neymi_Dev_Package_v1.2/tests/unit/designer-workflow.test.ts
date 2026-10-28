import {describe,expect,it} from 'vitest';
import {emptyDesignerSlots,nextDesignerStage,nextDesignerQuestion,mergeSlotCandidates,validateDesignerProposal,validateDesignerEvidenceSources,validateDesignerFactCandidates,retainConfirmedPrimaryHighlight} from '../../src/modules/assistant/designer/workflow';
import type {DesignerProposal} from '../../src/modules/assistant/designer/types';
import {DEFAULT_CARD_TEMPLATE,getCardTemplate} from '../../src/modules/card/templates';
import {designerPayloadContainsContact} from '../../src/modules/assistant/designer/payload';

describe('Neymi card designer workflow',()=>{
  it('checks contact details in user-visible text without treating numeric evidence IDs as phone numbers',()=>{
    const text='我设计课程预约流程。',id='ev_123456789012345678901234';
    const payload={message:text,slots:emptyDesignerSlots(),evidence:[{id,sourceId:id,sourceRevision:1,quote:text,start:0,end:text.length,status:'candidate' as const}],recentMessages:[{role:'user' as const,text}],templateIds:['soft-signal']};
    expect(designerPayloadContainsContact(payload)).toBe(false);
    expect(designerPayloadContainsContact({...payload,message:'联系我 demo@example.org'})).toBe(true);
  });
  it('accepts evidence only when its quoted range matches approved user text',()=>{
    const evidence={id:'ev1',sourceId:'source1',sourceRevision:1,quote:'课程预约流程',start:3,end:9,status:'candidate' as const};
    expect(()=>validateDesignerEvidenceSources('我设计课程预约流程。',[],[evidence])).not.toThrow();
    expect(()=>validateDesignerEvidenceSources('我设计课程预约流程。',[],[{...evidence,quote:'我负责大幅提升收入'}])).toThrow('evidence quote does not match');
  });
  it('requires each factual candidate to be an exact quote from a cited source',()=>{
    const evidence=[{id:'ev1',sourceId:'source1',sourceRevision:1,quote:'我设计课程预约流程。',start:0,end:11,status:'candidate' as const}];
    expect(()=>validateDesignerFactCandidates([{text:'设计课程预约流程',evidenceIds:['ev1']}],evidence)).not.toThrow();
    expect(()=>validateDesignerFactCandidates([{text:'把预约转化率提升了50%',evidenceIds:['ev1']}],evidence)).toThrow('fact candidate is not quoted');
  });
  it('asks for the next missing required decision and accepts a general audience',()=>{
    const slots=emptyDesignerSlots();
    expect(nextDesignerQuestion(slots)?.field).toBe('purposeType');
    expect(nextDesignerStage(slots)).toBe('collecting');
    const purposeful=mergeSlotCandidates(slots,[{field:'purposeType',value:'partner'}]);
    expect(nextDesignerQuestion(purposeful)?.field).toBe('audienceMode');
    const general=mergeSlotCandidates(purposeful,[{field:'audienceMode',value:'general'}]);
    expect(nextDesignerQuestion(general)?.field).toBe('displayName');
  });
  it('does not ask again for slots that were already supplied in one message',()=>{
    const slots=mergeSlotCandidates(emptyDesignerSlots(),[
      {field:'purposeType',value:'job'},{field:'audienceMode',value:'group'},{field:'displayName',value:'林予安'},
    ]);
    expect(nextDesignerQuestion(slots)?.field).toBe('primaryHighlightRef');
  });
  it('rejects unsupported templates and evidence references',()=>{
    const proposal={templateId:'unknown',alternatives:[],rationale:'适合简洁交流',identityFieldRefs:['name'],modules:[{kind:'my_intro',title:'个人介绍',items:[{label:'亮点',text:'未提供的成就',evidenceIds:['missing'],treatment:'rewrite',needsConfirmation:true}],evidenceIds:['missing']}],proposedFieldRefs:[],omissions:[],missingInformation:[]} as DesignerProposal;
    expect(()=>validateDesignerProposal(proposal,{templateIds:['soft-signal'],evidenceIds:['fact-1'],fieldRefs:[]})).toThrow();
    expect(()=>validateDesignerProposal({...proposal,templateId:'soft-signal'},{templateIds:['soft-signal'],evidenceIds:['fact-1'],fieldRefs:[]})).toThrow();
  });
  it('keeps the exact user-confirmed primary highlight when the model omits it',()=>{
    const source={id:'fact_primary',sourceId:'source_primary',sourceRevision:1,quote:'把复杂需求转成清晰的产品方案',start:0,end:16,status:'confirmed' as const};
    const proposal:DesignerProposal={templateId:'soft-signal',alternatives:[],rationale:'简洁清晰',identityFieldRefs:['name'],modules:[{kind:'intro',title:'简介',items:[{label:'职位',text:'产品顾问',evidenceIds:[source.id],treatment:'rewrite',needsConfirmation:true}],evidenceIds:[source.id]}],proposedFieldRefs:[],omissions:[],missingInformation:[]};
    const retained=retainConfirmedPrimaryHighlight(proposal,source.id,[source]);
    expect(retained.modules.flatMap(section=>section.items).some(item=>item.text===source.quote&&item.evidenceIds.includes(source.id))).toBe(true);
    expect(()=>validateDesignerProposal(retained,{templateIds:['soft-signal'],evidenceIds:[source.id],fieldRefs:[]},[source])).not.toThrow();
  });
  it('deduplicates candidate highlights while retaining only verified slot names',()=>{
    const slots=mergeSlotCandidates(emptyDesignerSlots(),[
      {field:'primaryHighlightRef',value:'fact_1'},{field:'highlightRefs',value:['fact_1','fact_1','fact_2']},
    ]);
    expect(slots.highlightRefs).toEqual(['fact_1','fact_2']);
    expect(()=>mergeSlotCandidates(slots,[{field:'admin',value:'true'} as never])).toThrow();
  });
  it('registers Soft Signal as a real free card template and new-user default',()=>{
    expect(DEFAULT_CARD_TEMPLATE).toBe('soft-signal');
    expect(getCardTemplate('soft-signal')).toMatchObject({availability:'free',layout:'editorial',pattern:'soft-signal'});
  });
});
