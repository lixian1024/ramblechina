/** Controlled transport for image bytes and the model. No live photo/AI calls. */
export function photoScreeningFixture(input:URL,init?:RequestInit):Response|undefined{
  if(input.hostname==='lh3.googleusercontent.com')return new Response(new Uint8Array([137,80,78,71]),{headers:{'Content-Type':'image/png'}});
  if(input.pathname.endsWith('/chat/completions')){
    const data=JSON.parse(String(init?.body));
    if(!data.messages?.[1]?.content?.some((part:{type:string;image_url?:{url:string}})=>part.type==='image_url'&&part.image_url?.url.startsWith('data:image/png;base64,')))throw new Error('Image pixels must be screened');
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({verdict:'match',selectedIndex:0,confidence:.99,visibleEvidence:'Controlled identifiable landmark'})}}]});
  }
}
export function configurePhotoFixture(){
  const original={...process.env};
  process.env.TRIP_LLM_API_KEY='controlled-model-key';
  process.env.TRIP_LLM_BASE_URL='https://model.fixture.invalid/v1';
  process.env.TRIP_LLM_MODEL='qwen3.8-flash';
  return ()=>{for(const key of ['TRIP_LLM_API_KEY','TRIP_LLM_BASE_URL','TRIP_LLM_MODEL']){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];}};
}
