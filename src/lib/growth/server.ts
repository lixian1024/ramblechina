import {createHmac} from 'node:crypto';

function secret(){const value=process.env.RAMBLE_GROWTH_SECRET;if(!value||value.length<32)throw Error('Trial services are not configured.');return value;}
export function hashGrowthIdentity(value:string){return createHmac('sha256',secret()).update(value).digest('hex');}
export function growthRequestIp(request:Request){
 const trusted=request.headers.get('x-vercel-forwarded-for');
 const value=trusted||(process.env.NODE_ENV!=='production'?request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')||'local-development':null);
 if(!value)throw Error('Trusted request identity is unavailable.');
 return value.split(',')[0].trim();
}
export async function callGrowthRpc<T=unknown>(name:string,args:Record<string,unknown>):Promise<T>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key||!/^ramble_[a-z_]+$/.test(name))throw Error('Trial services are not configured.');
 const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};
 if(!key.startsWith('sb_publishable_'))headers.Authorization=`Bearer ${key}`;
 if(key.startsWith('sb_secret_'))throw Error('Only a publishable project key is allowed.');
 const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify({...args,p_secret:secret()}),cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Trial storage is unavailable. Please retry later.');
 const body=await response.text();return (body?JSON.parse(body):null) as T;
}
