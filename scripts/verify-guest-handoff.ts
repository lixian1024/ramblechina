import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {create,type ReactTestRenderer} from 'react-test-renderer';
import type {VerifiedTrip,TripMessage} from '../src/lib/travel/concierge-types';

const fixture=(title='Controlled Shanghai plan',createdAt='2026-10-23T04:00:00.000Z'):VerifiedTrip=>({title,summary:'Controlled rest-day fixture. Venue facts remain unknown.',
  createdAt,provider:'Google + Amap',checks:[],days:[{id:'day-1',city:'Shanghai',title:'Rest day',kind:'rest',stops:[],legs:[],weather:{status:'date-needed'},checks:[]}]});
async function main() {
  const directory=await mkdtemp(resolve('.guest-handoff-test-'));
  const originalFetch=globalThis.fetch;
  const names=['window','document','sessionStorage','self','__growthAuth','__growthRouter','IS_REACT_ACT_ENVIRONMENT'];
  const descriptors=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  let renderer:ReactTestRenderer|undefined;
  const storage=new Map<string,string>(),events:unknown[][]=[],paths:string[]=[],writes:Record<string,unknown>[]=[],refreshes:{plan:VerifiedTrip;locale:string}[]=[];
  const globals=globalThis as unknown as Record<string,unknown>;
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,self:globalThis,
    sessionStorage:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)},
    window:{location:new URL('https://www.ramblechina.com/en/plan'),__rambleAnalytics:{measurementId:'G-QBCYPGN6SB',lastPage:'https://www.ramblechina.com/en/plan'},
      gtag:(...args:unknown[])=>events.push(args),history:{replaceState:(_data:unknown,_unused:string,path:string)=>paths.push(path)},
      addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:true}),requestAnimationFrame:(fn:()=>void)=>fn()},
    document:{documentElement:{dataset:{}},addEventListener(){},removeEventListener(){}},
    __growthAuth:{user:null,loading:false,error:''},__growthRouter:{push:(path:string)=>paths.push(path)}});
  try {
    const outfile=join(directory,'ui.cjs');
    await build({stdin:{contents:`export {default as Planner} from './src/components/travel/Planner'; export {LocaleProvider} from './src/i18n/context'; export * from './src/lib/growth/handoff';`,resolveDir:process.cwd(),loader:'tsx'},
      outfile,bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime','next/link'],
      plugins:[{name:'controlled-browser-boundaries',setup(build){
        build.onResolve({filter:/^(?:next\/navigation|next\/dynamic|@\/components\/account\/AuthProvider)$/},args=>({path:args.path,namespace:'controlled'}));
        build.onLoad({filter:/.*/,namespace:'controlled'},args=>({loader:'js',contents:args.path==='next/navigation'?'export const useRouter=()=>globalThis.__growthRouter;':
          args.path==='next/dynamic'?'export default ()=>()=>null;':'export const useAuth=()=>globalThis.__growthAuth;'}));
      }}]});
    const {Planner,LocaleProvider,stageGuestDraft,readGuestDraft,clearGuestDraft,guestDraftKey}=createRequire(import.meta.url)(outfile);
    const messages=[{role:'user',text:'A private planning question'}];
    const rich=fixture();rich.days[0].stops=[{id:'stop',name:'Controlled place',search:'Controlled place',durationMinutes:30,placeStatus:'matched',
      place:{id:'google-place',name:'provider label',address:'provider-address',point:{lat:31,lng:121},adcode:'',citycode:'',provider:'Google',checkedAt:'2026-10-23T00:00:00Z'}}];
    stageGuestDraft(rich,messages);
    assert.doesNotMatch(storage.get(guestDraftKey)!,/provider-address|provider label/,'Provider content is stripped before explicit browser handoff');
    assert.equal(readGuestDraft().plan.days[0].stops[0].googlePlaceId,'google-place');
    assert.equal(readGuestDraft().messages[0].text,messages[0].text);
    storage.set(guestDraftKey,JSON.stringify({expiresAt:Date.now()-1,snapshot:{plan:fixture(),messages}}));
    assert.equal(readGuestDraft(),null);assert(!storage.has(guestDraftKey),'Expired draft is removed');
    storage.set(guestDraftKey,'broken-json');assert.equal(readGuestDraft(),null);clearGuestDraft();
    let mode:'failed'|'incomplete'|'aborted'|'generated'|'edited'|'result-error'|'result-abort'|'answer-error'='failed';
    let editNumber=0;
    let saveFails=true;
    let refreshFails=true;
    let trial:{enabled:boolean;generated:boolean;edited:boolean;plan?:VerifiedTrip;messages?:TripMessage[]}={enabled:true,generated:false,edited:false};
    globalThis.fetch=async (url,options)=>{
      const path=String(url);
      if(path==='/api/trial')return Response.json(trial);
      if(path==='/api/trip-concierge'){
        if(mode==='failed')return Response.json({error:'Controlled failure'},{status:503});
        if(mode==='aborted')return new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));
        if(mode==='incomplete')return new Response(JSON.stringify({type:'phase',phase:'research'})+'\n');
        if(mode==='answer-error')return new Response(JSON.stringify({type:'answer',reply:'Discarded answer text'})+'\n'+JSON.stringify({type:'error',message:'Controlled post-answer failure'})+'\n');
        if(mode==='result-error'||mode==='result-abort'){
          const result=JSON.stringify({type:'result',plan:fixture('Rejected intermediate plan'),reply:'Discarded stream reply'})+'\n';
          if(mode==='result-error')return new Response(result+JSON.stringify({type:'error',message:'Controlled post-result failure'})+'\n');
          return new Response(new ReadableStream({start(controller){
            controller.enqueue(new TextEncoder().encode(result));
            options?.signal?.addEventListener('abort',()=>controller.error(new DOMException('Aborted','AbortError')));
          }}));
        }
        const plan=mode==='generated'?fixture():fixture('Controlled revised plan',`2026-10-23T04:${String(++editNumber).padStart(2,'0')}:00.000Z`);
        trial={enabled:true,generated:true,edited:mode==='edited'};
        const result=JSON.stringify({type:'result',plan,reply:'Controlled result'});
        return new Response(result+'\n'+result+'\n');
      }
      if(path==='/api/trip-refresh'){
        refreshes.push(JSON.parse(String(options?.body)));
        return refreshFails?Response.json({error:'Controlled map refresh outage'},{status:503}):Response.json({plan:rich});
      }
      if(path==='/api/trips'){
        const body=JSON.parse(String(options?.body));writes.push(body);
        return saveFails?Response.json({error:'Controlled storage outage'},{status:503}):Response.json({id:body.id,version:1});
      }
      if(path.startsWith('/api/trips/'))return Response.json({error:'Controlled private trip missing'},{status:404});
      throw Error('Unexpected transport '+path);
    };
    const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
    const tree=(tripId?:string,locale='en')=>React.createElement(LocaleProvider,{locale},React.createElement(Planner,{tripId}));
    const count=(name:string)=>events.filter(event=>event[1]===name).length;
    const text=()=>JSON.stringify(renderer!.toJSON());
    const button=(label:string)=>renderer!.root.findAllByType('button').find(node=>node.children.join('')===label);
    async function send(value:string) {
      await act(async()=>renderer!.root.findByType('textarea').props.onChange({target:{value}}));
      await act(async()=>{renderer!.root.findByType('form').props.onSubmit({preventDefault(){}});await tick();});
    }
    await act(async()=>{renderer=create(tree());await tick();});
    await act(tick);
    await send('Plan one day in Shanghai');
    assert.equal(count('itinerary_generated'),0);assert.equal(count('planner_error'),1,'HTTP failure only records failure');
    mode='aborted';await send('Try again');
    await act(async()=>renderer!.root.findAllByType('button').find(node=>node.props['aria-label']==='Stop planning')!.props.onClick());
    await act(tick);
    assert.equal(count('itinerary_generated'),0);assert.equal(count('planner_error'),2,'Abort only records failure');
    mode='incomplete';await send('Try again');
    assert.equal(count('itinerary_generated'),0);assert.equal(count('planner_error'),3,'An incomplete stream must record failure without success');
    mode='generated';await send('Plan one day in Shanghai');
    assert.equal(count('itinerary_generated'),1,'Duplicate confirmed result delivery counts once');
    assert.doesNotMatch(text(),/Temporary draft restored/,'A newly generated live plan does not show a restored-map warning');
    assert.equal((text().match(/Controlled result/g)||[]).length,1,'Duplicate result lines publish only one assistant reply');
    mode='result-error';await send('Do not replace this plan if the stream fails');
    assert.match(text(),/Controlled Shanghai plan/);assert.doesNotMatch(text(),/Rejected intermediate plan|Discarded stream reply/);
    assert.equal(count('itinerary_first_edit'),0,'A result followed by failure is not an edit success');
    mode='answer-error';await send('Answer should stay unpublished on failure');
    assert.doesNotMatch(text(),/Discarded answer text/);
    mode='result-abort';await send('Stop after the intermediate result');
    assert.doesNotMatch(text(),/Rejected intermediate plan|Discarded stream reply/,'Intermediate results remain unpublished before EOF');
    await act(async()=>renderer!.root.findAllByType('button').find(node=>node.props['aria-label']==='Stop planning')!.props.onClick());
    await act(tick);
    assert.match(text(),/Controlled Shanghai plan/);assert.doesNotMatch(text(),/Rejected intermediate plan|Discarded stream reply/);
    assert.equal(count('itinerary_first_edit'),0,'Aborting after a result preserves the previous confirmed plan and success count');
    assert(button('Sign in to save'));assert.equal(writes.length,0,'Guest generation never persists into an account');
    mode='edited';await send('Make day one easier');
    assert.equal(count('itinerary_first_edit'),1);
    await act(async()=>button('Sign in to save')!.props.onClick());
    assert(storage.has(guestDraftKey),'An explicit save action stages the guest draft');
    assert.match(paths.at(-1)!,/^\/en\/login\?next=/);
    await act(async()=>renderer!.unmount());renderer=undefined;
    // Failed login leaves the draft available; only a confirmed account save clears it.
    assert.equal(readGuestDraft().plan.title,'Controlled revised plan');
    globals.__growthAuth={user:{id:'account-a'},loading:false,error:''};
    await act(async()=>{renderer=create(tree());await tick();});await act(tick);
    assert.match(text(),/Controlled revised plan/);
    assert.equal(refreshes.length,1,'Authenticated handoff invokes the existing provider refresh path');
    assert.match(text(),/Controlled map refresh outage/);
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,750));});
    assert.equal(writes.length,1);assert.match(text(),/Controlled storage outage/);
    assert(storage.has(guestDraftKey),'A failed account save retains the original guest handoff');assert.equal(count('itinerary_saved'),0);
    saveFails=false;await act(async()=>button('Retry saving')!.props.onClick());
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,750));});
    assert.equal(writes.length,2);assert.equal(writes[0].id,writes[1].id,'Retry preserves private trip identity');
    assert(!storage.has(guestDraftKey),'Confirmed account save clears the staged handoff');assert.equal(count('itinerary_saved'),1);
    assert(!JSON.stringify(events).match(/account-a|private planning|google-place|Controlled|provider-address/),'Real production integration never emits traveller text or private ids');
    const beforeAccountEdit=count('itinerary_first_edit');
    mode='edited';await send('First account edit');
    assert.equal(count('itinerary_first_edit'),beforeAccountEdit+1);
    await send('Second account edit');
    assert.equal(count('itinerary_first_edit'),beforeAccountEdit+1,'Second successful edit cannot count another first edit');
    stageGuestDraft(fixture('Do not import over a private URL'),messages);
    await act(async()=>renderer!.unmount());renderer=undefined;
    await act(async()=>{renderer=create(tree('other-private-id'));await tick();});await act(tick);
    assert.doesNotMatch(text(),/Do not import over a private URL/);assert(storage.has(guestDraftKey),'Opening a saved-trip URL cannot consume a different staged draft');
    await act(async()=>renderer!.unmount());renderer=undefined;
    globals.__growthAuth={user:null,loading:false,error:''};
    rich.title='Controlled restored booking plan';rich.days[0].date='2026-11-01';
    Object.assign(rich.days[0].stops[0],{booked:true,at:'10:00',bookingNote:'Controlled fixed booking',nameEnglish:'Controlled place'});
    rich.days[0].stops[0].place!.sourceUrl='https://controlled.invalid/place';
    stageGuestDraft(rich,messages);
    const restored=readGuestDraft();clearGuestDraft();
    trial={enabled:true,generated:true,edited:false,plan:restored.plan,messages:restored.messages};
    const beforeGuestRefresh=refreshes.length;
    await act(async()=>{renderer=create(tree());await tick();});await act(tick);
    assert.match(text(),/Temporary draft restored; map details need verification/);
    assert.match(text(),/Sign in to save and refresh/);
    assert.match(text(),/Booking · fixed/);assert.match(text(),/10:00/);
    assert.equal(refreshes.length,beforeGuestRefresh,'Guest reload does not call authenticated refresh APIs');
    await act(async()=>renderer!.unmount());renderer=undefined;
    await act(async()=>{renderer=create(tree(undefined,'zh'));await tick();});await act(tick);
    assert.match(text(),/已恢复临时草稿/);assert.match(text(),/地图资料仍需核验/);
    await act(async()=>renderer!.unmount());renderer=undefined;
    await act(async()=>{renderer=create(tree());await tick();});await act(tick);
    await act(async()=>button('Sign in to save')!.props.onClick());
    await act(async()=>renderer!.unmount());renderer=undefined;
    globals.__growthAuth={user:{id:'account-rich'},loading:false,error:''};saveFails=true;
    const beforeRichWrites=writes.length;
    await act(async()=>{renderer=create(tree());await tick();});await act(tick);
    assert.equal(refreshes.length,beforeGuestRefresh+1);
    assert.equal(refreshes.at(-1)!.plan.days[0].stops[0].booked,true);
    assert.equal(refreshes.at(-1)!.plan.days[0].stops[0].at,'10:00');
    assert.equal(refreshes.at(-1)!.plan.days[0].stops[0].googlePlaceId,'google-place');
    assert.match(text(),/Controlled map refresh outage/);assert.match(text(),/Booking · fixed/);assert.match(text(),/10:00/);
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,750));});
    assert.equal(writes.length,beforeRichWrites+1);assert(storage.has(guestDraftKey),'Provider plus private storage failure retains the staged booking plan');
    const privateSnapshot=writes.at(-1)!.snapshot as {plan:VerifiedTrip};
    assert.equal(privateSnapshot.plan.days[0].stops[0].booked,true);
    assert.equal(privateSnapshot.plan.days[0].stops[0].bookingNote,'Controlled fixed booking');
    saveFails=false;await act(async()=>button('Retry saving')!.props.onClick());
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,750));});
    assert.equal(writes.length,beforeRichWrites+2);assert.equal(writes.at(-1)!.id,writes.at(-2)!.id);
    assert(!storage.has(guestDraftKey),'Only the confirmed private copy clears the staged booking plan');
    assert.match(text(),/Controlled restored booking plan/);assert.match(text(),/Booking · fixed/);
    refreshFails=false;await act(async()=>button('Retry')!.props.onClick());await act(tick);
    assert(renderer!.root.findAllByType('a').some(node=>node.props.href==='https://controlled.invalid/place'),'Retry recovers provider details on the existing booked plan');
    console.log('PASS: actual Planner/funnel/persistence integration rejects HTTP/abort/incomplete successes, deduplicates confirmed outcomes, hands off only explicitly, retains failed login/save draft, retries stable identity and clears only after confirmed save.');
  } finally {
    if(renderer)await act(async()=>renderer!.unmount());
    globalThis.fetch=originalFetch;
    for(const [name,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}
    await rm(directory,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
