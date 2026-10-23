/**
 * Original travel Evals exercise planning/providers/calendar, not authentication.
 * Bundle the production handlers and replace only the new durable-admission
 * boundary with an authorized account. All original model/provider HTTP fixtures
 * and every travel assertion still run. verify-trial-api.ts separately exercises
 * the actual admission/accountSession/origin/quota boundary before provider work.
 */
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {withModelBudget} from '../../src/lib/growth/model-budget';
export function controlledTravel<T>(work:()=>Promise<T>){return withModelBudget('controlled-fixture',work,async()=>{});}

type Handler=(request:Request)=>Promise<Response>;
type TravelRoutes={POST:Handler;photosPOST:Handler;refreshPOST:Handler};
const loaded=new Map<string,Promise<TravelRoutes>>();
export function admittedTravelRoutes(now?:string):Promise<TravelRoutes>{
 const key=now||'wall-clock';let result=loaded.get(key);if(!result){result=load(now);loaded.set(key,result);}return result;
}
export async function admittedTripPOST(request:Request,now?:string){return (await admittedTravelRoutes(now)).POST(request);}
export async function admittedPhotosPOST(request:Request){return (await admittedTravelRoutes()).photosPOST(request);}
export async function admittedRefreshPOST(request:Request){return (await admittedTravelRoutes()).refreshPOST(request);}
async function load(now?:string):Promise<TravelRoutes>{
 const directory=await mkdtemp(join(tmpdir(),'ramble-admitted-travel-'));
 try{
  const outfile=join(directory,'routes.cjs');
  const banner=now?{js:`const Date=class extends globalThis.Date{constructor(...args){if(args.length===0)super(${JSON.stringify(now)});else super(...args);}static now(){return globalThis.Date.parse(${JSON.stringify(now)});}};`}:undefined;
  await build({banner,stdin:{contents:`export {POST} from './src/app/api/trip-concierge/route';export {POST as photosPOST} from './src/app/api/trip-place-photos/route';export {POST as refreshPOST} from './src/app/api/trip-refresh/route';`,resolveDir:process.cwd(),loader:'ts'},outfile,bundle:true,platform:'node',format:'cjs',plugins:[{name:'authorized-account-admission-only',setup(builder){
   builder.onLoad({filter:/src\/lib\/growth\/model-budget\.ts$/},()=>({loader:'ts',contents:`export class ModelBudgetError extends Error{} export function withModelBudget(_id,work){return work();} export async function admitModelCall(){} export async function budgetedModelFetch(input,init){return fetch(input,init);}`}));
   builder.onLoad({filter:/src\/lib\/growth\/trial\.ts$/},()=>({loader:'ts',contents:`
    export class GrowthDenied extends Error{constructor(message,status=429){super(message);this.status=status;}}
    export async function admitGrowth(_request,_operation,inputMessages){return {status:'admitted',requestId:'00000000-0000-4000-8000-000000000001',guest:false,plan:null,messages:null,inputMessages};}
    export async function finishGrowth(){}
    export async function guardedLookup(_request,work){return work();}
   `}));
  }}]});
  return createRequire(import.meta.url)(outfile) as TravelRoutes;
 }finally{await rm(directory,{recursive:true,force:true});}
}
