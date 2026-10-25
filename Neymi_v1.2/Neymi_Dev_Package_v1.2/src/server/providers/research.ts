import {unavailable} from '../errors';
import type {ResearchSource} from '../../domain/types';

export interface ResearchProvider{search(query:string):Promise<ResearchSource[]>}
export class UnconfiguredResearchProvider implements ResearchProvider{
  async search():Promise<ResearchSource[]>{throw unavailable('Public research provider is not configured');}
}
export function getResearchProvider():ResearchProvider{return new UnconfiguredResearchProvider();}
