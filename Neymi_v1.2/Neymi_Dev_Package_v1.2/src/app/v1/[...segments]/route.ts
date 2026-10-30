import {route} from '../../../server/router';
export const runtime='nodejs';
export const GET=(request:Request,{params}:{params:Promise<{segments:string[]}>})=>params.then(({segments})=>route(request,segments));
export const POST=(request:Request,{params}:{params:Promise<{segments:string[]}>})=>params.then(({segments})=>route(request,segments));
export const DELETE=(request:Request,{params}:{params:Promise<{segments:string[]}>})=>params.then(({segments})=>route(request,segments));

export const PATCH=(request:Request,{params}:{params:Promise<{segments:string[]}>})=>params.then(({segments})=>route(request,segments));
