import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import React,{act,StrictMode} from 'react';
import {create,type ReactTestRenderer} from 'react-test-renderer';

async function main(){
 const directory=await mkdtemp(resolve('.signup-analytics-test-'));
 const originalFetch=globalThis.fetch;
 const originalEnv={NODE_ENV:process.env.NODE_ENV,NEXT_PUBLIC_GA_MEASUREMENT_ID:process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID};
 Object.assign(process.env,{NODE_ENV:'production'});delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
 const keys=['window','document','self','__signupClient','IS_REACT_ACT_ENVIRONMENT'];
 const descriptors=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let renderer:ReactTestRenderer|undefined;
 const events:unknown[][]=[];
 const user=(id:string,verified=true)=>({id,email_confirmed_at:verified?'2026-10-23T04:00:00Z':null,created_at:'2026-10-23T03:00:00Z'});
 let current:ReturnType<typeof user>|null=null,callback:((event:string,session:unknown)=>void)|undefined;
 const calls:{url:string;body:unknown}[]=[];
 let receipt:'new'|'existing'|'failure'='existing';
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,self:globalThis,
  window:{location:new URL('https://www.ramblechina.com/en/login'),__rambleAnalytics:{measurementId:'G-QBCYPGN6SB',lastPage:'https://www.ramblechina.com/en/login'},gtag:(...args:unknown[])=>events.push(args)},
  document:{documentElement:{dataset:{}}},
  __signupClient:{auth:{
   getUser:async()=>({data:{user:current},error:null}),
   onAuthStateChange(fn:typeof callback){callback=fn;return {data:{subscription:{unsubscribe(){}}}};},
   signUp:async()=>({data:{user:user('pending-private-id',false),session:null},error:null}),
   verifyOtp:async()=>{current=user('existing-private-id');callback?.('SIGNED_IN',{user:current});return {data:{user:current},error:null};},
   updateUser:async()=>({error:null}),
   signInWithOAuth:async()=>({data:{url:'https://controlled.invalid'},error:null}),
  }}});
 globalThis.fetch=async(url,options)=>{
  calls.push({url:String(url),body:options?.body?JSON.parse(String(options.body)):null});
  if(receipt==='failure')return Response.json({error:'Unavailable'},{status:503});
  return Response.json({newSignup:receipt==='new'});
 };
 try{
  const outfile=join(directory,'ui.cjs');
  await build({stdin:{contents:`export {AuthProvider} from './src/components/account/AuthProvider'; export {default as Login} from './src/components/account/LoginScreen'; export {LocaleProvider} from './src/i18n/context';`,resolveDir:process.cwd(),loader:'tsx'},
   outfile,bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime','next/link'],plugins:[{name:'controlled-identity-boundaries',setup(build){
    build.onResolve({filter:/^(?:@\/lib\/supabase\/(?:client|config)|next\/navigation)$/},args=>({path:args.path,namespace:'controlled'}));
    build.onLoad({filter:/.*/,namespace:'controlled'},args=>({loader:'js',contents:args.path==='next/navigation'?'export const useRouter=()=>({replace(){},refresh(){}});':args.path.endsWith('/client')?'export const createClient=()=>globalThis.__signupClient;':'export const isSupabaseConfigured=()=>true;'}));
   }}]});
  const {AuthProvider,Login,LocaleProvider}=createRequire(import.meta.url)(outfile);
  const tree=(login=false)=>React.createElement(StrictMode,null,React.createElement(LocaleProvider,{locale:'en'},React.createElement(AuthProvider,null,
   login?React.createElement(Login,{configured:true,google:true,next:'/en/plan'}):React.createElement('p',null,'Account UI remains usable'))));
  const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
  const text=()=>JSON.stringify(renderer!.toJSON());
  const count=()=>events.filter(event=>event[1]==='sign_up').length;
  await act(async()=>{renderer=create(tree(true));await tick();});
  assert.equal(calls.length,0);assert.equal(count(),0,'A guest visit is not a signup');
  const button=(label:string)=>renderer!.root.findAllByType('button').find(node=>node.children.join('')===label)!;
  await act(async()=>button('Sign up').props.onClick());
  await act(async()=>renderer!.root.findByProps({type:'email'}).props.onChange({target:{value:'private@example.invalid'}}));
  await act(async()=>{await renderer!.root.findByType('form').props.onSubmit({preventDefault(){}});await tick();});
  assert.equal(calls.length,0);assert.equal(count(),0,'An unverified signup response cannot count');
  await act(async()=>renderer!.root.findByProps({inputMode:'numeric'}).props.onChange({target:{value:'123456'}}));
  await act(async()=>{await renderer!.root.findByType('form').props.onSubmit({preventDefault(){}});await tick();});
  assert.equal(calls.length,1);assert.equal(count(),0,'OTP verification of an existing account cannot bypass the server receipt');
  await act(async()=>renderer!.unmount());renderer=undefined;
  const browser=globalThis.window as unknown as {location:URL};
  current=user('preview-private-id');receipt='new';browser.location=new URL('https://preview.vercel.app/en/plan');
  await act(async()=>{renderer=create(tree());await tick();});await act(tick);
  assert.equal(calls.length,1,'Excluded preview traffic cannot consume a production signup receipt');
  await act(async()=>renderer!.unmount());renderer=undefined;
  browser.location=new URL('https://www.ramblechina.com/en/plan');
  current=user('new-google-private-id');receipt='new';
  await act(async()=>{renderer=create(tree());await tick();});await act(tick);
  assert.equal(calls.length,2,'Strict Mode shares the same receipt request for one identity');
  assert.equal(count(),1,'A server-confirmed new Google/email identity counts after verification');
  await act(async()=>callback?.('TOKEN_REFRESHED',{user:current}));await act(tick);
  assert.equal(calls.length,2);assert.equal(count(),1,'Session refresh cannot repeat signup');
  await act(async()=>{callback?.('SIGNED_OUT',null);});
  current=user('unconfirmed-private-id',false);
  await act(async()=>callback?.('SIGNED_IN',{user:current}));await act(tick);
  assert.equal(calls.length,2,'Unconfirmed session cannot request a signup receipt');
  current=user('failure-private-id');receipt='failure';
  await act(async()=>callback?.('SIGNED_IN',{user:current}));await act(tick);
  assert.equal(count(),1);assert.match(text(),/Account UI remains usable/,'Failed analytics must not break authentication');
  assert(calls.every(call=>call.url==='/api/analytics/signup'&&call.body===null),'No client-supplied identity is posted');
  assert(!JSON.stringify(events).match(/private-id|private@example|123456/),'No account id/email/code enters GA4');
  console.log('PASS: actual AuthProvider/Login only count server-confirmed new verified identities, never clicks/unverified/old users, dedupe Strict Mode/token refresh and tolerate analytics storage failure.');
 }finally{
  if(renderer)await act(async()=>renderer!.unmount());globalThis.fetch=originalFetch;
  for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
  for(const [key,value] of Object.entries(originalEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  await rm(directory,{recursive:true,force:true});
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
