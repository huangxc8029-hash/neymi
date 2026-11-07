import {z} from 'zod';
import {readSession} from '../../../server/session';
import {invalidRequest,notFound} from '../../../server/errors';
import {getPublicationService} from '../../../server/publication-runtime';
import {readShareJson,shareFailure,shareJson,shareOriginOk} from '../../../server/share-http';

const inputSchema=z.strictObject({projection:z.unknown(),confirmation:z.unknown()});
export const runtime='nodejs';
export async function POST(request:Request){try{if(!shareOriginOk(request))throw invalidRequest('Invalid origin');const owner=readSession(request);if(!owner)throw notFound();const key=request.headers.get('idempotency-key')??'',input=inputSchema.parse(await readShareJson(request)),service=await getPublicationService(new URL(request.url).origin);return shareJson(await service.publishCard(owner,input.projection as never,input.confirmation as never,key),201);}catch(error){return shareFailure(error);}}
