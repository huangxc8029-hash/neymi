import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {request as httpsRequest} from 'node:https';
import {ApiError,invalidRequest,unavailable} from './errors';

type Address={address:string;family:4|6};
type PublicResponse={status:number;headers:Record<string,string>;body:AsyncIterable<Uint8Array>};
export type PublicFetchDependencies={
  resolve:(hostname:string)=>Promise<Address[]>;
  request:(url:URL,pinnedAddress:string,signal:AbortSignal)=>Promise<PublicResponse>;
};
const maxBytes=2*1024*1024;
const ipv4Number=(address:string)=>address.split('.').reduce((value,part)=>value*256+Number(part),0)>>>0;
function inV4(address:string,network:string,bits:number):boolean{
  const mask=bits===0?0:(0xffffffff<<(32-bits))>>>0;
  return(ipv4Number(address)&mask)===(ipv4Number(network)&mask);
}
function ipv6Groups(address:string):number[]{
  const halves=address.toLowerCase().split('::');
  if(halves.length>2)throw invalidRequest();
  const parse=(part:string)=>part?part.split(':'):[];
  const left=parse(halves[0]),right=parse(halves[1]??'');
  const tail=right.length?right:left,last=tail.at(-1);
  if(last?.includes('.')){
    const octets=last.split('.').map(Number);if(octets.length!==4||octets.some(value=>value<0||value>255))throw invalidRequest();
    tail.splice(-1,1,((octets[0]<<8)|octets[1]).toString(16),((octets[2]<<8)|octets[3]).toString(16));
  }
  let groups=[...left,...right].map(value=>{if(!/^[a-f\d]{1,4}$/.test(value))throw invalidRequest();return parseInt(value,16);});
  if(halves.length===2){const zeros=8-groups.length;if(zeros<1)throw invalidRequest();groups=[...left.map(value=>parseInt(value,16)),...Array(zeros).fill(0),...right.map(value=>parseInt(value,16))];}
  if(groups.length!==8)throw invalidRequest();
  return groups;
}
export function isPublicAddress(address:string):boolean{
  const family=isIP(address);
  if(family===4){
    const blocked:[[string,number],...Array<[string,number]>]=[
      ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],
      ['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],
      ['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4],
    ];
    return!blocked.some(([network,bits])=>inV4(address,network,bits));
  }
  if(family!==6||address.includes('%'))return false;
  try{
    const groups=ipv6Groups(address),value=groups.reduce((total,group)=>(total<<16n)|BigInt(group),0n);
    const prefix=value>>125n;
    return prefix===1n&&!(groups[0]===0x2001&&groups[1]<=0x01ff)&&!(groups[0]===0x2001&&groups[1]===0x0db8)&&groups[0]!==0x2002;
  }catch{return false;}
}
async function resolvePublic(hostname:string):Promise<Address[]>{
  if(hostname.endsWith('.localhost')||hostname.endsWith('.local')||hostname.endsWith('.internal'))throw invalidRequest();
  try{
    const family=isIP(hostname);
    const addresses=family?[{address:hostname,family:family as 4|6}]:await lookup(hostname,{all:true,verbatim:true}) as Address[];
    if(!addresses.length||addresses.some(item=>!isPublicAddress(item.address)))throw invalidRequest();
    return addresses;
  }catch(error){if(error instanceof ApiError)throw error;throw unavailable('Public host lookup failed');}
}
function requestPinned(url:URL,address:string,signal:AbortSignal):Promise<PublicResponse>{
  return new Promise((resolve,reject)=>{
    const family=isIP(address) as 4|6;
    const req=httpsRequest(url,{method:'GET',headers:{'accept':'text/html,text/plain','accept-encoding':'identity','user-agent':'NeymiResearch/1.0'},
      lookup:(_host,_options,callback)=>callback(null,address,family),signal},res=>{
      if(res.statusCode!==200){res.resume();resolve({status:res.statusCode??0,headers:{},body:(async function*(){})()});return;}
      const headers=Object.fromEntries(Object.entries(res.headers).map(([key,value])=>[key,Array.isArray(value)?value.join(','):value??'']));
      resolve({status:res.statusCode??0,headers,body:res as AsyncIterable<Uint8Array>});
    });
    req.setTimeout(5000,()=>req.destroy(unavailable('Public fetch timed out')));
    req.once('error',reject);req.end();
  });
}
const defaults:PublicFetchDependencies={resolve:resolvePublic,request:requestPinned};
function htmlText(input:string):string{
  return input.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|svg|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
    .replace(/<\/(?:p|div|li|h[1-6]|br|section|article)\s*>/gi,'\n').replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&#(\d+);/g,(_,code:string)=>String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi,(_,code:string)=>String.fromCodePoint(parseInt(code,16))).replace(/[\t\r ]+/g,' ').replace(/ *\n */g,'\n').trim().slice(0,20_000);
}
export async function fetchPublic(input:string,dependencies:PublicFetchDependencies=defaults):Promise<{text:string;url:string}>{
  let url:URL;try{url=new URL(input);}catch{throw invalidRequest();}
  if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||url.hash)throw invalidRequest();
  const hostname=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(isIP(hostname)&&!isPublicAddress(hostname))throw invalidRequest();
  const addresses=await dependencies.resolve(hostname),selected=addresses[0];
  if(!selected||!addresses.every(item=>isPublicAddress(item.address)))throw invalidRequest();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await dependencies.request(url,selected.address,controller.signal);
    const type=response.headers['content-type']?.split(';')[0].trim().toLowerCase();
    if(response.status!==200||!['text/html','text/plain'].includes(type)||response.headers['content-encoding']&&response.headers['content-encoding']!=='identity')throw invalidRequest();
    const declared=Number(response.headers['content-length']??0);if(declared>maxBytes)throw invalidRequest();
    const chunks:Uint8Array[]=[];let size=0;
    for await(const chunk of response.body){size+=chunk.byteLength;if(size>maxBytes){controller.abort();throw invalidRequest();}chunks.push(chunk);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes),text=type==='text/html'?htmlText(raw):raw.trim().slice(0,20_000);
    return{text,url:url.toString()};
  }catch(error){if(error instanceof Error&&'code'in error)throw error;throw unavailable('Public fetch failed');}
  finally{clearTimeout(timer);}
}
