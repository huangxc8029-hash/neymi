import type {LocalDraft} from '../../domain/types';
import {CardExperience} from './card-experience';
import {toBase64} from '../vault/crypto';
export function CardRenderer({draft,reducedMotion=false,moduleDisplayLimit,visibleIdentityFields,visibleModuleIds,visibleFieldIds,visibleContactIds,showLogo=true}:{draft:LocalDraft;reducedMotion?:boolean;moduleDisplayLimit?:number;visibleIdentityFields?:Array<'name'|'company'|'role'>;visibleModuleIds?:string[];visibleFieldIds?:string[];visibleContactIds?:string[];showLogo?:boolean}){
  const logo=draft.assets.find(asset=>asset.id==='card_logo')??draft.assets[0];
  return <CardExperience identity={draft.identity} modules={draft.modules} templateId={draft.config.templateId} layout={draft.config.layout} motion={reducedMotion?'float':draft.config.animation} label="我的名片" moduleDisplayLimit={moduleDisplayLimit} visibleIdentityFields={visibleIdentityFields} visibleModuleIds={visibleModuleIds} visibleFieldIds={visibleFieldIds} visibleContactIds={visibleContactIds} logoSrc={logo&&showLogo?`data:${logo.mime};base64,${toBase64(logo.bytes)}`:undefined}/>;
}
