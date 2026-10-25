import {unavailable} from './errors';
import {PublicationService} from '../modules/publication/service';
import {getConfiguredPublicationStore} from '../modules/publication/store';

export function getPublicationService(baseUrl:string):PublicationService{
  const secret=process.env.NEYMI_PUBLICATION_SECRET;
  if(!secret||Buffer.byteLength(secret)<32)throw unavailable('Publication signing is not configured');
  return new PublicationService(getConfiguredPublicationStore(),{secret,baseUrl});
}
