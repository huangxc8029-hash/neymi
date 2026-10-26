export type AssistantIntent='person'|'event'|'highlight';
export const creatorRoutes=['/','/prepare','/activity','/cards'] as const;
export const assistantPrompts=[
  '告诉我你要见谁，我帮你挑出最值得展示的信息。',
  '给我与会者名单和你的业务，我帮你排出联系优先级。',
  '想让对方记住什么？我们一起找到真实、有辨识度的亮点。',
] as const;
export function nextPrompt(index:number):number|null{return index<assistantPrompts.length-1?index+1:null;}
