export function normalizeCardUrl(value:string):string{
  const trimmed=value.trim();
  if(!trimmed||/[\u0000-\u0020\u007f\\]/.test(trimmed)||trimmed.startsWith('//'))throw new Error('链接仅支持有效的 http/https 网址');
  const hasScheme=/^[a-z][a-z\d+.-]*:/i.test(trimmed);
  if(hasScheme&&!/^https?:\/\//i.test(trimmed))throw new Error('链接仅支持 http/https');
  const url=new URL(hasScheme?trimmed:`https://${trimmed}`);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname||(!hasScheme&&!url.hostname.includes('.')))throw new Error('链接无效或包含登录凭据');
  return url.href;
}
export function isCardLinkItem(kind:string,label:string):boolean{
  return ['website','social','link','portfolio_link','booking'].includes(kind)&&/^(url|网址|链接)$/i.test(label.trim());
}
export function safeCardHref(kind:string,label:string,value:string):string|undefined{
  if(!isCardLinkItem(kind,label))return undefined;
  try{return normalizeCardUrl(value);}catch{return undefined;}
}
