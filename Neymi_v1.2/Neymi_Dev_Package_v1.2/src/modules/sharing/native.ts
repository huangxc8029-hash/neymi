import {localDraftSchema,shareProjectionSchema} from '../../domain/schemas';
import type {LocalDraft,ShareProjection} from '../../domain/types';
import {serializeNcard} from './export';
import type {Vault} from '../vault/vault';

export async function cachePreparedCard(draft:LocalDraft,vault:Vault):Promise<void>{
  const checked=localDraftSchema.parse(draft);await vault.savePreparedDraft(checked);
}
export async function shareViaOS(projection:ShareProjection):Promise<'shared'|'cancelled'|'fallback'>{
  const checked=shareProjectionSchema.parse(projection),bytes=serializeNcard(checked),file=new File([bytes as BlobPart],'neymi-card.ncard',{type:'application/vnd.neymi.card+json'});
  if(typeof navigator!=='undefined'&&typeof navigator.share==='function'){
    try{const text=[checked.identity.name,[checked.identity.role,checked.identity.company].filter(Boolean).join(' · '),
        ...checked.modules.flatMap(section=>section.items.map(item=>`${section.title} · ${item.label}: ${item.value}`)),checked.publicDedication].filter(Boolean).join('\n');
      if(navigator.canShare?.({files:[file]}))await navigator.share({title:checked.identity.name??'Neymi card',text:'我的名片',files:[file]});
      else await navigator.share({title:checked.identity.name??'Neymi card',text});
      return'shared';
    }catch(error){if(error instanceof DOMException&&error.name==='AbortError')return'cancelled';return downloadFallback(file);}
  }
  return downloadFallback(file);
}
function downloadFallback(file:File):'fallback'{
  if(typeof document==='undefined')return'fallback';const url=URL.createObjectURL(file),anchor=document.createElement('a');anchor.href=url;anchor.download=file.name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);return'fallback';
}
