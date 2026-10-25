export class ApiError extends Error{
  constructor(readonly code:string,message:string,readonly status:number,readonly retryAfter?:number){
    super(message);this.name='ApiError';
  }
}
export const notFound=()=>new ApiError('NOT_FOUND','Resource not found',404);
export const permissionDenied=()=>new ApiError('PERMISSION_DENIED','Permission denied',403);
export const invalidRequest=(message='Invalid request')=>new ApiError('INVALID_REQUEST',message,400);
export const unavailable=(message='Service unavailable')=>new ApiError('SERVICE_UNAVAILABLE',message,503);
export const rateLimited=(seconds:number)=>new ApiError('RATE_LIMITED','Hourly task limit reached',429,seconds);
