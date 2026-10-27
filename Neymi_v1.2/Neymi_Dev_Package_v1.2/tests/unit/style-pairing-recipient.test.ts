import { describe, expect, it } from 'vitest';
import { selectStylePairings } from '../../src/modules/content/propose-modules';

describe('recipient-aware style pairings', () => {
  it('recommends three visibly distinct new VIP themes based on purpose and recipient', () => {
    const result=selectStylePairings(['project_case'],['给游戏工作室制作作品集','独立游戏制作人']);
    expect(result).toHaveLength(3);
    expect(result.some(item=>item.templateId==='pixel-game')).toBe(true);
    expect(new Set(result.map(item=>item.templateId)).size).toBe(3);
  });
  it('maps story and craft preferences to the new theme catalog', () => {
    expect(selectStylePairings(['my_story'],['个人故事 剪贴手账']).map(item=>item.templateId)).toContain('scrapbook');
    expect(selectStylePairings(['my_story'],['东方新潮']).map(item=>item.templateId)).toContain('oriental-newwave');
  });
});
