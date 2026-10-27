export const assistantTaskIntents=['facts','import','create_module','style_pairing','copy_edit','bilingual','person_prep','event_prep','share_check','recipient_card'] as const;
export type AssistantTaskIntent=typeof assistantTaskIntents[number];
export type AssistantIntent='person'|'event'|'highlight'|AssistantTaskIntent;
export const creatorRoutes=['/','/prepare','/activity','/cards','/beyond','/vip'] as const;
export const assistantPrompts=[
  '告诉我你要见谁，我帮你挑出最值得展示的信息。',
  '给我与会者名单和你的业务，我帮你排出联系优先级。',
  '想让对方记住什么？我们一起找到真实、有辨识度的亮点。',
] as const;
export function nextPrompt(index:number):number|null{return index<assistantPrompts.length-1?index+1:null;}
