import type {LocalDraft} from '../../domain/types';
import {CardExperience} from './card-experience';
export function CardRenderer({draft,reducedMotion=false}:{draft:LocalDraft;reducedMotion?:boolean}){
  return <CardExperience identity={draft.identity} modules={draft.modules} templateId={draft.config.templateId} motion={reducedMotion?'float':draft.config.animation} label="我的名片"/>;
}
