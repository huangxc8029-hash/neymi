import {getConfiguredJobStore} from './store';
import {getConfiguredPublicationStore} from '../modules/publication/store';
export async function purgeExpiredJobs(now=new Date().toISOString()):Promise<number>{
  return getConfiguredJobStore().purgeExpired(now);
}
export async function expirePublications(now=new Date().toISOString()):Promise<number>{
  return getConfiguredPublicationStore().expireBefore(now);
}
export async function runScheduledCleanup(now=new Date().toISOString()):Promise<{jobs:number;publications:number}>{
  const jobs=await purgeExpiredJobs(now),publications=await expirePublications(now);return{jobs,publications};
}
