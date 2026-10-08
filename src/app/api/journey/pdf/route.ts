import { makeDaybook } from '@/lib/journey/pdf';
import { validateOptions } from '@/lib/content/beijing-day';
import {isLocale,type Locale} from '@/i18n/locales';
export const runtime='nodejs';
let active=0;
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(active>=2)return Response.json({error:'The daybook maker is busy. Please retry shortly.'},{status:429,headers});
 let options;let locale:Locale='en';try{const reader=request.body?.getReader();if(!reader)throw Error('Missing options.');const chunks:Uint8Array[]=[];let length=0;while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>16384){await reader.cancel();return Response.json({error:'Request is too large.'},{status:413,headers});}chunks.push(value);}const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(body.locale!==undefined){if(typeof body.locale!=='string'||!isLocale(body.locale)||body.locale==='zh')throw Error('Unsupported language.');locale=body.locale;}options=validateOptions(body);}catch(e){return Response.json({error:e instanceof SyntaxError?'Invalid request JSON.':e instanceof Error?e.message:'Invalid daybook options.'},{status:400,headers});}
 active++;try{const bytes=await makeDaybook(options,locale);return new Response(Buffer.from(bytes),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="ramble-china-beijing-daybook-${locale}.pdf"`}});}catch{return Response.json({error:'The daybook could not be created. Please retry.'},{status:500,headers});}finally{active--;}
}
