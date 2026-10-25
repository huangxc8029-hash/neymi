import {ResearchService} from '../modules/research/service';
let service:ResearchService|undefined;
export function getResearchService():ResearchService{return service??=new ResearchService();}
