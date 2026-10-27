import {describe,expect,it} from 'vitest';
import {applyModuleProposal,proposeModules,selectStylePairings} from '../../src/modules/content/propose-modules';

const source={kind:'file' as const,sourceId:'doc-1',paragraph:1,createdAt:'2026-10-26T00:00:00.000Z'};
describe('content module proposals',()=>{
  it('accepts only registered module kinds with citations from selected sources',async()=>{
    const context={text:'I built a product workflow.',approvedSourceIds:['doc-1']};
    const result=await proposeModules(context,async()=>[{id:'proposal-1',kind:'project_case',title:'Product workflow',items:[{id:'result',label:'Result',value:'I built a product workflow.'}],sourceRefs:[source],rationale:'Directly stated',missingEvidence:[]}]);
    expect(result[0]?.kind).toBe('project_case');
    await expect(proposeModules(context,async()=>[{id:'bad',kind:'arbitrary_html',title:'x',items:[{id:'v',label:'v',value:'x'}],sourceRefs:[source],rationale:'x',missingEvidence:[]}])).rejects.toThrow();
    await expect(proposeModules(context,async()=>[{id:'bad',kind:'project_case',title:'x',items:[{id:'v',label:'v',value:'x'}],sourceRefs:[{...source,sourceId:'not-approved'}],rationale:'x',missingEvidence:[]}])).rejects.toThrow(/source/i);
  });
  it('rejects a true excerpt paired with another file source',async()=>{
    const fileA={...source,sourceId:'file-a'},fileB={...source,sourceId:'file-b'},context={text:'Result from file A. Other text from file B.',approvedSourceIds:['file-a','file-b'],approvedSources:[fileA,fileB],approvedSourceSegments:[{sourceRef:fileA,text:'Result from file A.'},{sourceRef:fileB,text:'Other text from file B.'}]};
    await expect(proposeModules(context,async()=>[{id:'misattributed',kind:'project_case',title:'Claim',items:[{id:'result',label:'Result',value:'Result from file A.'}],sourceRefs:[fileB],rationale:'Text appears in merged input',missingEvidence:[]}])).rejects.toThrow(/supported by its cited source/i);
  });
  it('selects three registered style IDs deterministically and reports Pro access',()=>{
    const first=selectStylePairings(['project_case'],['作品集','马赛克']);
    expect(first).toEqual(selectStylePairings(['project_case'],['作品集','马赛克']));
    expect(first).toHaveLength(3);expect(first.every(item=>item.templateId)).toBe(true);
    expect(first.some(item=>item.availability==='pro')).toBe(true);
  });
  it('adds a user-confirmed proposal as a new sourced module and refuses overwrite or sensitive fields',()=>{
    const proposal={id:'proposal_2',kind:'project_case',title:'Project',items:[{id:'result',label:'Result',value:'I built a product workflow.'}],sourceRefs:[source],rationale:'Direct evidence',missingEvidence:[],status:'candidate' as const};
    const profile={schemaVersion:1 as const,id:'guest_profile',revision:1,identity:{name:'Lin'},modules:[],facts:[],assets:[]};
    const result=applyModuleProposal(profile,proposal,'2026-10-26T00:00:00.000Z');
    expect(result.revision).toBe(2);expect(result.modules[0]?.items[0]).toMatchObject({sourceRefs:[source],confirmedAt:'2026-10-26T00:00:00.000Z',sensitivity:'ordinary'});
    expect(()=>applyModuleProposal(result,proposal,'2026-10-26T00:00:00.000Z')).toThrow(/already added/i);
    expect(()=>applyModuleProposal(profile,{...proposal,items:[{...proposal.items[0],valueKind:'email' as const}]},'2026-10-26T00:00:00.000Z')).toThrow(/encrypted contact vault/i);
  });
  it('bounds titles before a proposal can be persisted',async()=>{
    const context={text:'I built a product workflow.',approvedSourceIds:['doc-1']};
    await expect(proposeModules(context,async()=>[{id:'too-long-title',kind:'project_case',title:'x'.repeat(1001),items:[{id:'result',label:'Result',value:'I built a product workflow.'}],sourceRefs:[source],rationale:'Directly stated',missingEvidence:[]}])).rejects.toThrow();
  });
});
