import {describe,expect,it} from 'vitest';
import {createContextApproval,buildCloudContext} from '../../src/modules/self/facts';
import {getLLMProvider} from '../../src/server/providers/llm';
import {getResearchProvider} from '../../src/server/providers/research';
import {makeContext,makeResearch} from '../fixtures/domain';
import {validatePlan} from '../../src/modules/strategy/plan';

// Explicit opt-in only: never send test data or incur provider cost during the default suite.
const enabled=process.env.NEYMI_LIVE_PROVIDERS==='1';
describe.skipIf(!enabled)('opt-in live provider canaries',()=>{
  it('returns schema-valid sources for a synthetic research query',async()=>{
    const sources=await getResearchProvider().search(process.env.NEYMI_LIVE_RESEARCH_QUERY??'Neymi synthetic robotics industry example');
    expect(sources.length).toBeGreaterThan(0);
  });
  it('returns a strategy grounded in a synthetic, non-personal context',async()=>{
    const context=makeContext({scenario:'Synthetic provider check'}),research=makeResearch({recipient:{id:'recipient_live_test',displayName:'Synthetic recipient',identityStatus:'unverified'}});
    const text='Synthetic test context only; do not use real personal data.',now=new Date().toISOString();
    const approval=await createContextApproval(text,context.id,'Live provider canary',now);
    const approvedContext=await buildCloudContext(text,[],approval),input={context,research,approvedContext};
    const result=await getLLMProvider().plan(input);expect(()=>validatePlan(result,input)).not.toThrow();
  });
});
