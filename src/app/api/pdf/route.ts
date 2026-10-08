import { makePdf } from '@/lib/travel/pdf';
import { createPlan, validateInput } from '@/lib/travel/planner';
export const runtime='nodejs';
export const maxDuration=60;
const respond=(bytes:Uint8Array,name:string)=>new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'private, no-store'}});
export async function GET(){try{return respond(await makePdf({kind:'guide',preview:true}),'ramble-china-guide-preview.pdf');}catch{console.error('Guide preview generation failed');return Response.json({error:'The preview could not be prepared. Please try again.'},{status:500});}}
export async function POST(request:Request){try{const text=await request.text();if(text.length>12000)return Response.json({error:'Request too large.'},{status:413});const body=JSON.parse(text);if(body.kind!=='itinerary-preview')return Response.json({error:'A paid download requires verified payment.'},{status:403});const plan=createPlan(validateInput(body.input));return respond(await makePdf({kind:'itinerary',plan,preview:true}),'ramble-china-itinerary-preview.pdf');}catch(e){return Response.json({error:e instanceof Error?e.message:'Unable to prepare the preview.'},{status:400});}}
