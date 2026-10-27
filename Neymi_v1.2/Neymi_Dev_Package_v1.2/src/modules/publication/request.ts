export async function publicationRequest(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
  try{return await fetch(input,{...init,signal:AbortSignal.timeout(15_000)});}
  catch(error){if(error instanceof DOMException&&error.name==='TimeoutError')throw new Error('请求超时，请检查网络后重试。');throw error;}
}
