import {afterEach,describe,expect,it,vi} from 'vitest';
import {publicationRequest} from '../../src/modules/publication/request';

afterEach(()=>vi.unstubAllGlobals());

describe('publicationRequest',()=>{
  it('turns a timed out request into a retryable message',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new DOMException('Timed out','TimeoutError')));
    await expect(publicationRequest('/v1/publications')).rejects.toThrow('请求超时，请检查网络后重试。');
  });
});
