import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {receiveResearchRequest, type ResearchRequest} from '../src/lib/research/requests';
import {POST} from '../src/app/api/research-requests/route';

const input = {requestId: randomUUID(), email: 'traveler@example.invalid', destination: 'Shanghai',
  travelWindow: 'November, dates flexible', question: 'Is day two realistic with my elderly parent?',
  language: 'en', consent: true, website: ''};
const request = (body: unknown = input, origin = 'https://www.ramblechina.com') => new Request('https://www.ramblechina.com/api/research-requests',
  {method: 'POST', headers: {'origin': origin, 'content-type': 'application/json'}, body: JSON.stringify(body)});
async function main() {
  let saved: ResearchRequest | undefined;
  const save = async (value: ResearchRequest) => {saved = value; return {status: 'created' as const, requestId: value.requestId};};
  let response = await receiveResearchRequest(request(), save);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).requestId, input.requestId);
  assert.equal(saved?.email, input.email);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal((await receiveResearchRequest(request(input, 'https://evil.test'), save)).status, 403);
  for (const bad of [{...input, consent: false}, {...input, email: 'bad'}, {...input, website: 'bot'}, {...input, question: ''}, {...input, injected: true}]) {
    saved = undefined;
    assert.equal((await receiveResearchRequest(request(bad), save)).status, 400);
    assert.equal(saved, undefined, 'Invalid or bot submissions cannot persist');
  }
  assert.equal((await receiveResearchRequest(request({...input, question: 'x'.repeat(15_000)}), save)).status, 413);
  assert.equal((await receiveResearchRequest(request(), async () => {throw Error('secret provider details');})).status, 503);
  response = await receiveResearchRequest(request(), async () => ({status: 'duplicate', requestId: input.requestId}));
  assert.equal(response.status, 200, 'A lost response can retry the same request');
  response = await receiveResearchRequest(request(), async () => ({status: 'conflict', requestId: input.requestId}));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).retryWithNewId, true);
  assert.equal((await receiveResearchRequest(request(), async () => ({status: 'rate_limited', requestId: input.requestId}))).status, 429);
  const originalFetch=globalThis.fetch;
  const savedEnvironment={NODE_ENV:process.env.NODE_ENV,RAMBLE_GROWTH_SECRET:process.env.RAMBLE_GROWTH_SECRET,
    NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY};
  try {
    Object.assign(process.env,{NODE_ENV:'production',RAMBLE_GROWTH_SECRET:'controlled-secret-32-characters-long',
      NEXT_PUBLIC_SUPABASE_URL:'https://controlled.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'controlled-publishable'});
    let rpc:Record<string,unknown>|undefined;
    globalThis.fetch=async (url,options)=>{
      assert.equal(String(url),'https://controlled.invalid/rest/v1/rpc/ramble_submit_research_request');
      rpc=JSON.parse(String(options?.body));
      return Response.json({status:'created',requestId:input.requestId});
    };
    const trusted=request();trusted.headers.set('x-vercel-forwarded-for','198.51.100.4');
    assert.equal((await POST(trusted)).status,201);
    assert.match(String(rpc!.p_ip_hash),/^[a-f0-9]{64}$/);
    assert(!JSON.stringify(rpc).includes('198.51.100.4'),'Raw IP never enters persistence');
    assert.equal((rpc!.p_request as Record<string,unknown>).website,undefined);
    assert.equal((rpc!.p_request as Record<string,unknown>).requestId,undefined);
    rpc=undefined;
    assert.equal((await POST(request())).status,503,'Production missing trusted IP fails closed');
    assert.equal(rpc,undefined);
  } finally {
    globalThis.fetch=originalFetch;
    for(const [key,value] of Object.entries(savedEnvironment)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
  console.log('PASS: guest intake validates consent/bot/format/size, rejects cross-origin, preserves retry identity and handles storage failure privately.');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
