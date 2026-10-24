import {handlePack} from '@/lib/trip-pack/commerce';
export const runtime='nodejs';
export async function GET(request:Request){return handlePack(request,'status');}
