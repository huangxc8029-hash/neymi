import {unavailable} from './errors';
import {PublicationService} from '../modules/publication/service';
import {getConfiguredPublicationStore} from '../modules/publication/store';

export async function getPublicationService(baseUrl:string):Promise<PublicationService>{
  const secret=process.env.NEYMI_PUBLICATION_SECRET;
  if(!secret||Buffer.byteLength(secret)<32)throw unavailable('Publication signing is not configured');
  return new PublicationService(await getConfiguredPublicationStore(),{secret,baseUrl});
}
