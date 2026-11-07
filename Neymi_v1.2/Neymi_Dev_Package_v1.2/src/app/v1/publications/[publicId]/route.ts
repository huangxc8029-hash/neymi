import {invalidRequest} from '../../../../server/errors';
import {getPublicationService} from '../../../../server/publication-runtime';
import {shareFailure,shareJson,shareOriginOk} from '../../../../server/share-http';

export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{publicId:string}>}){try{const{publicId}=await params,service=await getPublicationService(new URL(request.url).origin);return shareJson({projection:await service.readPublication(publicId)},200,{'Cache-Control':'no-store, max-age=0'});}catch(error){return shareFailure(error);}}
export async function DELETE(request:Request,{params}:{params:Promise<{publicId:string}>}){try{if(!shareOriginOk(request))throw invalidRequest('Invalid origin');const authorization=request.headers.get('authorization')??'';if(!authorization.startsWith('Bearer '))throw invalidRequest('Missing revocation token');const{publicId}=await params,service=await getPublicationService(new URL(request.url).origin);await service.revokePublication(publicId,authorization.slice(7));return shareJson({ok:true});}catch(error){return shareFailure(error);}}
