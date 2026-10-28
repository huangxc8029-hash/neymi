import type {AssistantIntent} from '../assistant/prompts';
import type {StudioStep} from './editor';

export type StudioNavigationRequest={step:StudioStep;target:'editor'|'share'};

export function studioNavigationForIntent(intent:AssistantIntent):StudioNavigationRequest|null{
  if(intent==='style_pairing')return{step:'appearance',target:'editor'};
  if(intent==='recipient_card')return{step:'visibility',target:'editor'};
  if(intent==='share_check')return{step:'visibility',target:'share'};
  if(intent==='create_module'||intent==='facts'||intent==='copy_edit'||intent==='bilingual')return{step:'personal',target:'editor'};
  return null;
}
