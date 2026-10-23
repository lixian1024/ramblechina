import {receiveResearchRequest,type ResearchReceipt} from '@/lib/research/requests';
import {callGrowthRpc,growthRequestIp,hashGrowthIdentity} from '@/lib/growth/server';

export const runtime='nodejs';
export async function POST(request:Request) {
  return receiveResearchRequest(request,async input=>{
    const ipHash=hashGrowthIdentity(`research:${growthRequestIp(request)}`);
    const {requestId,email,destination,travelWindow,question,language,consent}=input;
    const details={email,destination,travelWindow,question,language,consent};
    return callGrowthRpc<ResearchReceipt>('ramble_submit_research_request',{
      p_request_id:requestId,p_ip_hash:ipHash,p_request:details,
    });
  });
}
