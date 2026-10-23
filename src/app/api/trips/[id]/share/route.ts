import {z} from 'zod';
import {accountSession,json,readMutation,mutationFailure} from '@/lib/account/http';
import {sameOrigin} from '@/lib/account/origin';
import {publishShare,revokeShare,shareStatus,ShareNotFound,ShareNotPublishable} from '@/lib/sharing/store';
type Context={params:Promise<{id:string}>};
function failure(error:unknown){
 if(error instanceof ShareNotFound)return json({error:'Trip not found in your account.'},404);
 if(error instanceof ShareNotPublishable)return json({error:'This saved trip has no publishable itinerary. Save a valid itinerary first.'},422);
 return json({error:'Sharing services could not be reached. Your saved trip is safe. Please retry.'},503);
}
export async function GET(_request:Request,context:Context){
 const session=await accountSession();if(session.response)return session.response;
 try{return json(await shareStatus(session.client,session.user.id,(await context.params).id));}catch(error){return failure(error);}
}
export async function POST(request:Request,context:Context){
 const session=await accountSession();if(session.response)return session.response;
 let input:{confirmed:true;locale:'en'|'zh'};
 try{input=z.object({confirmed:z.literal(true),locale:z.enum(['en','zh']).default('en')}).strict().parse(await readMutation(request,1000));}catch(error){return mutationFailure(error);}
 try{const result=await publishShare(session.client,session.user.id,(await context.params).id);return json({path:`/${input.locale}/shared/${result.token}`,publishedAt:result.publishedAt},201);}catch(error){return failure(error);}
}
export async function DELETE(request:Request,context:Context){
 const session=await accountSession();if(session.response)return session.response;
 if(!sameOrigin(request))return json({error:'Please use the Ramble China website.'},403);
 try{await revokeShare(session.client,session.user.id,(await context.params).id);return json({published:false});}catch(error){return failure(error);}
}
