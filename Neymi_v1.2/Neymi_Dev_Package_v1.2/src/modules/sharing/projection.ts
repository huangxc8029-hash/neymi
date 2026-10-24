import {localDraftSchema,shareProjectionSchema,shareSelectionSchema} from '../../domain/schemas';
import type {LocalDraft,ShareProjection,ShareSelection} from '../../domain/types';
import {toBase64} from '../vault/crypto';
import {stripPngMetadata} from './media';

export function projectShare(draft:LocalDraft,selection:ShareSelection):ShareProjection{
  const checked=localDraftSchema.parse(draft),chosen=shareSelectionSchema.parse(selection);
  const fields=new Map<string,{section:typeof checked.modules[number];item:typeof checked.modules[number]['items'][number]}>(checked.modules.flatMap(section=>section.items.map(item=>[
    `${section.id}/${item.id}`,{section,item}
  ] as const)));
  const selected=new Set(chosen.fields.map(ref=>`${ref.moduleId}/${ref.itemId}`));
  if(selected.size!==chosen.fields.length||[...selected].some(key=>!fields.has(key)))throw new Error('Invalid field selection');
  const assets=new Map(checked.assets.map(asset=>[asset.id,asset]));
  if(new Set(chosen.assetIds).size!==chosen.assetIds.length||chosen.assetIds.some(id=>!assets.has(id)))throw new Error('Invalid asset selection');
  const identity=Object.fromEntries(chosen.identity.filter(key=>checked.identity[key]!==undefined).map(key=>[key,checked.identity[key]]));
  return shareProjectionSchema.parse({
    schemaVersion:1,format:'ncard-public-share',identity,
    modules:checked.modules.flatMap(section=>{
      const items=section.items.filter(item=>selected.has(`${section.id}/${item.id}`)).map(item=>({label:item.label,value:item.value}));
      return items.length?[{kind:section.kind,title:section.title,items}]:[];
    }),
    assets:chosen.assetIds.map(id=>{const asset=assets.get(id)!;
      if(asset.mime!=='image/png')throw new Error('Image must be normalized before sharing');
      return {mime:'image/png',base64:toBase64(stripPngMetadata(asset.bytes))};}),
    templateId:checked.config.templateId,layout:checked.config.layout,animation:checked.config.animation,
    ...(chosen.publicDedication?{publicDedication:chosen.publicDedication}:{})
  });
}
