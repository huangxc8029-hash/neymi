import {describe,expect,it} from 'vitest';
import {createManualDraft} from '../../src/modules/card/create';
import {projectShare} from '../../src/modules/sharing/projection';
import {digestProjection,confirmShare,assertConfirmation} from '../../src/modules/sharing/confirmation';
import {serializeNcard,serializeVcard} from '../../src/modules/sharing/export';
import {sanitizeImage} from '../../src/modules/sharing/media';
import {fromBase64} from '../../src/modules/vault/crypto';
import {makeManual,makeProfile,makeSelection} from '../fixtures/domain';

function privateDraft(){
  const profile=makeProfile();
  profile.modules[0].items.push({id:'phone',label:'电话',value:'PRIVATE_PHONE',valueKind:'phone',sensitivity:'sensitive'});
  const draft=createManualDraft(profile,makeManual());
  draft.modules[0].items.push({...profile.modules[0].items[1]});
  return draft;
}
describe('share projection',()=>{
  it('contains only selected fields and no private recipe/recipient metadata',()=>{
    const p=projectShare(privateDraft(),makeSelection({fields:[]}));
    const bytes=new TextDecoder().decode(serializeNcard(p));
    expect(bytes).not.toContain('PRIVATE_PHONE');
    expect(bytes).not.toContain('Warehouse robot');
    expect(bytes).not.toContain('recipientId');
    expect(p.identity.name).toBe('Lin');
  });
  it('escapes malicious vCard line breaks and omits hidden values',()=>{
    const draft=privateDraft();draft.modules[0].items[0].value='Demo\nTEL:PRIVATE_PHONE';
    const p=projectShare(draft,makeSelection());
    const v=new TextDecoder().decode(serializeVcard(p));
    expect(v).not.toMatch(/\r\nTEL:PRIVATE_PHONE/);
    expect(v).toContain('Demo\\nTEL:PRIVATE_PHONE');
  });
  it('includes a sensitive field only when deliberately selected',()=>{
    const draft=privateDraft();
    const hidden=projectShare(draft,makeSelection({fields:[]}));
    expect(JSON.stringify(hidden)).not.toContain('PRIVATE_PHONE');
    const shown=projectShare(draft,makeSelection({fields:[{moduleId:'mod_project',itemId:'phone'}]}));
    expect(new TextDecoder().decode(serializeNcard(shown))).toContain('PRIVATE_PHONE');
  });
  it('rejects references outside the draft',()=>expect(()=>projectShare(privateDraft(),makeSelection({fields:[{moduleId:'other',itemId:'unknown'}]}))).toThrow());
  it('makes a content-bound action confirmation',async()=>{
    const p=projectShare(privateDraft(),makeSelection());
    const confirmation=await confirmShare(p,'file');
    await expect(assertConfirmation(p,confirmation)).resolves.toBeUndefined();
    const changed={...p,publicDedication:'Changed'};
    expect(await digestProjection(changed)).not.toBe(confirmation.digest);
    await expect(assertConfirmation(changed,confirmation)).rejects.toThrow();
  });
  it('rejects SVG and media whose bytes contradict its declared format',async()=>{
    await expect(sanitizeImage(new Blob(['<svg/>'],{type:'image/svg+xml'}))).rejects.toThrow();
    await expect(sanitizeImage(new Blob(['<svg/>'],{type:'image/png'}))).rejects.toThrow();
  });
  it('requires media to be normalized before adding it to a public snapshot',()=>{
    const draft=privateDraft();
    draft.assets.push({id:'raw',mime:'image/jpeg',bytes:new Uint8Array([255,216,255,0])});
    expect(()=>projectShare(draft,makeSelection({assetIds:['raw']}))).toThrow();
  });
  it('strips ancillary PNG metadata from the exported snapshot',()=>{
    const image=fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5q8AAAAASUVORK5CYII=');
    const note=new TextEncoder().encode('PRIVATE_EXIF');
    const chunk=new Uint8Array(12+note.length);
    new DataView(chunk.buffer).setUint32(0,note.length);
    chunk.set(new TextEncoder().encode('tEXt'),4);chunk.set(note,8);
    const withNote=new Uint8Array(image.length+chunk.length);
    withNote.set(image.slice(0,-12));withNote.set(chunk,image.length-12);withNote.set(image.slice(-12),image.length-12+chunk.length);
    const draft=privateDraft();draft.assets.push({id:'photo',mime:'image/png',bytes:withNote});
    const projected=projectShare(draft,makeSelection({assetIds:['photo']}));
    expect(new TextDecoder().decode(fromBase64(projected.assets[0].base64))).not.toContain('PRIVATE_EXIF');
  });
});
