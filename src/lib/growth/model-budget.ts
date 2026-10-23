import {AsyncLocalStorage} from 'node:async_hooks';
import {callGrowthRpc} from './server';
type Budget={check:()=>Promise<void>};
const budgets=new AsyncLocalStorage<Budget>();
export class ModelBudgetError extends Error {}

/** Trusted server context, never supplied through a request body. */
export function withModelBudget<T>(requestId:string,work:()=>Promise<T>,check?:()=>Promise<void>):Promise<T>{
 return budgets.run({check:check||(async()=>{
  const status=await callGrowthRpc<string>('ramble_growth_model_admit',{p_request:requestId});
  if(status!=='admitted')throw new ModelBudgetError('The daily AI allowance is exhausted or planning is paused. Your existing itinerary is retained. / 今日AI额度已用完或服务已暂停，已有行程已保留。');
 })},work);
}
export async function admitModelCall(){
 const budget=budgets.getStore();
 if(!budget)throw Error('A durable planning reservation is required before model work.');
 await budget.check();
}
export async function budgetedModelFetch(input:string,init:RequestInit){await admitModelCall();return fetch(input,init);}
