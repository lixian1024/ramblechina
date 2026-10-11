/** Next dev may normalize request.url to localhost; validate against the actual Host. */
export function sameOrigin(request:Request) {
  const origin=request.headers.get('origin');if(!origin)return false;
  try{
    const incoming=new URL(request.url),source=new URL(origin);
    const host=request.headers.get('host')||incoming.host;
    const forwardedProtocol=request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
    const protocol=forwardedProtocol==='https'||forwardedProtocol==='http'?`${forwardedProtocol}:`:incoming.protocol;
    return source.origin===`${protocol}//${host}`;
  }catch{return false;}
}
