import {sameOrigin} from '@/lib/account/origin';

type SignupSession={user?:{id:string};response?:Response};
const headers={'Cache-Control':'private, no-store'};
/** The client body is deliberately ignored: only a verified server session selects identity. */
export async function receiveSignupClaim(request:Request,session:()=>Promise<SignupSession>,claim:(id:string)=>Promise<boolean>):Promise<Response>{
 if(!sameOrigin(request))return Response.json({error:'Please use the Ramble China website.'},{status:403,headers});
 try{
  const current=await session();
  if(current.response)return current.response;
  if(!current.user)return Response.json({error:'Please sign in.'},{status:401,headers});
  const newSignup=await claim(current.user.id);
  if(typeof newSignup!=='boolean')throw Error('Invalid receipt');
  return Response.json({newSignup},{headers});
 }catch{return Response.json({error:'Analytics receipt is unavailable.'},{status:503,headers});}
}
