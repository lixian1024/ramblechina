import {accountSession} from '@/lib/account/http';
import {callGrowthRpc} from '@/lib/growth/server';
import {receiveSignupClaim} from '@/lib/growth/signup';
export const runtime='nodejs';
export async function POST(request:Request){
 return receiveSignupClaim(request,accountSession,id=>callGrowthRpc<boolean>('ramble_claim_signup',{p_user:id}));
}
