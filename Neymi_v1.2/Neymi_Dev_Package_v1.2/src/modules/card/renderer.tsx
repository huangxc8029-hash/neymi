import type {LocalDraft} from '../../domain/types';
import {CardExperience} from './card-experience';
import {toBase64} from '../vault/crypto';
export function CardRenderer({draft,reducedMotion=false}:{draft:LocalDraft;reducedMotion?:boolean}){
  const logo=draft.assets.find(asset=>asset.id==='card_logo')??draft.assets[0];
  return <CardExperience identity={draft.identity} modules={draft.modules} templateId={draft.config.templateId} motion={reducedMotion?'float':draft.config.animation} label="我的名片" logoSrc={logo?`data:${logo.mime};base64,${toBase64(logo.bytes)}`:undefined}/>;
}
