import {handlePackWebhook} from '@/lib/trip-pack/commerce';
export const runtime='nodejs';
export async function POST(request:Request){return handlePackWebhook(request);}
