import {describe,expect,it} from 'vitest';
import {assistantPrompts,nextPrompt,creatorRoutes} from '../../src/modules/assistant/prompts';

describe('global assistant entry prompts',()=>{
  it('offers exactly three fixed prompts in order then stops',()=>{
    expect(assistantPrompts).toHaveLength(3);
    expect(assistantPrompts[0]).toContain('告诉我你要见谁');
    expect(nextPrompt(0)).toBe(1);expect(nextPrompt(1)).toBe(2);expect(nextPrompt(2)).toBeNull();
  });
  it('allows the assistant only on creator routes',()=>{
    expect(creatorRoutes).toEqual(['/','/prepare','/activity','/cards']);
  });
});
