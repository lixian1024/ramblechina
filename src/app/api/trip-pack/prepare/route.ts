import {handlePack} from '@/lib/trip-pack/commerce';
export const runtime='nodejs';
export async function POST(request:Request){return handlePack(request,'prepare');}
