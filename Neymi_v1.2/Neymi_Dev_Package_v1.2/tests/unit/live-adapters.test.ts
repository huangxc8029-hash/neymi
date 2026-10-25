import {describe,expect,it,vi} from 'vitest';
import {DeepSeekLLMProvider,getLLMProvider,UnconfiguredLLMProvider} from '../../src/server/providers/llm';
import {TavilyResearchProvider} from '../../src/server/providers/research';
import {createContextApproval,buildCloudContext} from '../../src/modules/self/facts';

describe('configured provider adapters with local transports',()=>{
  it('selects DeepSeek from its server key without requiring a model override',()=>{
    const previousKey=process.env.NEYMI_DEEPSEEK_API_KEY,previousModel=process.env.NEYMI_DEEPSEEK_MODEL;
    const previousAnthropicKey=process.env.NEYMI_ANTHROPIC_API_KEY,previousAnthropicModel=process.env.NEYMI_ANTHROPIC_MODEL;
    try{
      process.env.NEYMI_DEEPSEEK_API_KEY='fake-key';
      delete process.env.NEYMI_DEEPSEEK_MODEL;
      delete process.env.NEYMI_ANTHROPIC_API_KEY;
      delete process.env.NEYMI_ANTHROPIC_MODEL;
      expect(getLLMProvider()).toBeInstanceOf(DeepSeekLLMProvider);
      expect(getLLMProvider()).not.toBeInstanceOf(UnconfiguredLLMProvider);
    }finally{
      if(previousKey===undefined)delete process.env.NEYMI_DEEPSEEK_API_KEY;else process.env.NEYMI_DEEPSEEK_API_KEY=previousKey;
      if(previousModel===undefined)delete process.env.NEYMI_DEEPSEEK_MODEL;else process.env.NEYMI_DEEPSEEK_MODEL=previousModel;
      if(previousAnthropicKey===undefined)delete process.env.NEYMI_ANTHROPIC_API_KEY;else process.env.NEYMI_ANTHROPIC_API_KEY=previousAnthropicKey;
      if(previousAnthropicModel===undefined)delete process.env.NEYMI_ANTHROPIC_MODEL;else process.env.NEYMI_ANTHROPIC_MODEL=previousAnthropicModel;
    }
  });
  it('sends only approved text to DeepSeek and requires exact user evidence',async()=>{
    const text='I built a robotics demo.',approval=await createContextApproval(text,'ctx','extract facts','2026-10-25T00:00:00.000Z');
    const context=await buildCloudContext(text,[],approval);
    const transport=vi.fn(async(url:RequestInfo|URL,options?:RequestInit)=>{
      const body=JSON.parse(String(options?.body));
      expect(String(url)).toBe('https://api.deepseek.com/chat/completions');
      expect(new Headers(options?.headers).get('authorization')).toBe('Bearer fake-key');
      expect(body.messages[0].content).toContain('facts');
      expect(body.messages[1].content).toBe(text);
      expect(body.response_format).toEqual({type:'json_object'});
      expect(JSON.stringify(body)).not.toContain('PRIVATE_PHONE');
      return Response.json({choices:[{message:{content:JSON.stringify({facts:[{text:'Built a robotics demo',category:'experience',evidence:'built a robotics demo'}]})}}]});
    });
    const provider=new DeepSeekLLMProvider('fake-key','deepseek-flash',transport as typeof fetch);
    const facts=await provider.proposeFacts(context) as Array<{text:string}>;
    expect(facts[0].text).toBe('Built a robotics demo');
    expect(transport).toHaveBeenCalledOnce();
  });

  it('rejects a model fact with no verbatim user evidence',async()=>{
    const text='I enjoy design.',approval=await createContextApproval(text,'ctx','extract facts','2026-10-25T00:00:00.000Z');
    const context=await buildCloudContext(text,[],approval);
    const transport=vi.fn(async()=>Response.json({choices:[{message:{content:JSON.stringify({facts:[{text:'Won a prize',category:'achievement',evidence:'won a prize'}]})}}]}));
    await expect(new DeepSeekLLMProvider('fake-key','deepseek-flash',transport as typeof fetch).proposeFacts(context)).rejects.toThrow('evidence');
  });

  it('returns a follow-up question with only locally evidenced candidate facts',async()=>{
    const text='I design logistics tools.',approval=await createContextApproval(text,'ctx','coach','2026-10-25T00:00:00.000Z');
    const context=await buildCloudContext(text,[],approval);
    const transport=vi.fn(async()=>Response.json({choices:[{message:{content:JSON.stringify({reply:'Who uses those tools?',facts:[{text:'Designs logistics tools',category:'work',evidence:'design logistics tools'}]})}}]}));
    const answer=await new DeepSeekLLMProvider('fake-key','deepseek-flash',transport as typeof fetch).coach(context);
    expect(answer.reply).toBe('Who uses those tools?');
    expect(answer.facts[0]).toMatchObject({origin:'ai_extracted',text:'Designs logistics tools'});
  });

  it('reports malformed model output as a provider failure',async()=>{
    const text='I design logistics tools.',approval=await createContextApproval(text,'ctx','coach','2026-10-25T00:00:00.000Z');
    const context=await buildCloudContext(text,[],approval);
    const transport=vi.fn(async()=>Response.json({choices:[{message:{content:'not json'}}]}));
    await expect(new DeepSeekLLMProvider('fake-key','deepseek-flash',transport as typeof fetch).coach(context)).rejects.toMatchObject({code:'SERVICE_UNAVAILABLE'});
  });

  it('maps HTTPS search snippets to explicitly unverified sources',async()=>{
    const transport=vi.fn(async(_url:RequestInfo|URL,options?:RequestInit)=>{
      expect(JSON.parse(String(options?.body)).query).toBe('public recipient');
      return Response.json({results:[{title:'Speaker',url:'https://example.org/speaker',content:'Public professional biography',published_date:null},
        {title:'Unsafe',url:'http://example.org/',content:'Ignored'}]});
    });
    const sources=await new TavilyResearchProvider('fake-key',transport as typeof fetch).search('public recipient');
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({origin:'other',url:'https://example.org/speaker',publishedAt:null});
  });
});
