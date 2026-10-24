import type {PackOrder} from '../src/lib/trip-pack/api-types';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {create,type ReactTestRenderer} from 'react-test-renderer';
async function main(){
 const dir=await mkdtemp(resolve('.pack-ui-test-'));let ui:ReactTestRenderer|undefined;const previous=globalThis.fetch;
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 try{
 await build({stdin:{contents:"export {PackWorkflow} from './src/components/trip-pack/PackWorkflow'; export {PackOrders} from './src/components/trip-pack/PackOrders';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(dir,'ui.cjs'),bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime']});
 const {PackWorkflow,PackOrders}=createRequire(import.meta.url)(join(dir,'ui.cjs'));
 const order:PackOrder={id:'order-private',tripId:'trip-private',mode:'test',state:'prepared',version:2,locale:'en',revision:1,createdAt:'2026-10-24T00:00:00Z',paidAt:null,expiresAt:null,canDownload:false,canRegenerate:false,checkoutUrl:null,needsSupport:false};
 const data={trip:{id:'trip-private',title:'Saved Shanghai',version:2},preview:{days:[{date:'2026-11-20',stops:[{nameEnglish:'The Bund',nameChinese:'外滩',durationMinutes:60}]}],warnings:['Check current opening times.']},issues:[],config:{mode:'test',checkoutAvailable:true,reason:null,amount:990,currency:'USD',policyVersion:'trip-pack-2026-10-24-v1'},order:null};
 const requests:{url:string;body?:Record<string,unknown>}[]=[];let result:unknown=data;let status=200;let respond:((url:string,options?:RequestInit)=>Promise<Response>)|undefined;
 globalThis.fetch=async(url,options)=>{requests.push({url:String(url),body:options?.body?JSON.parse(String(options.body)):undefined});return respond?respond(String(url),options):Response.json(result,{status});};
 const text=()=>JSON.stringify(ui!.toJSON());const button=(label:string)=>ui!.root.findAllByType('button').find(n=>n.children.join('')===label)!;
 const mount=async(props:Record<string,unknown>={})=>{if(ui)await act(async()=>ui!.unmount());await act(async()=>{ui=create(React.createElement(PackWorkflow,{locale:'en',signedIn:true,authReady:true,tripId:'trip-private',...props}));});};
 await mount({authReady:false});assert.match(text(),/Loading your account/);assert.equal(requests.length,0);
 await mount({tripId:undefined});assert.match(text(),/Save an itinerary/);assert.equal(requests.length,0);
 await mount({signedIn:false});assert.match(text(),/Sign in/);assert.equal(requests.length,0);
 await mount();assert.match(text(),/US\$9.90/);assert.match(text(),/90/);assert.match(text(),/The Bund/);
 result={order};await act(async()=>button('Prepare my PDF').props.onClick());assert.equal(requests.at(-1)?.body?.version,2);assert.equal(button('Continue to test checkout').props.disabled,true);
 await act(async()=>ui!.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}));assert.equal(button('Continue to test checkout').props.disabled,false);
 result={error:{code:'checkout_uncertain',message:'SECRET INTERNAL'}};status=503;await act(async()=>button('Continue to test checkout').props.onClick());assert.match(text(),/service@ramblechina.com/);assert(!text().includes('SECRET INTERNAL'));
 status=200;result={...data,order:{...order,state:'pending',checkoutUrl:'https://www.creem.io/test/checkout/prod_fixture/ch_same'}};await mount({orderId:'order-private'});assert.match(text(),/Awaiting payment confirmation/);assert(!text().includes('Download PDF'));
 result={order:{...order,state:'paid',canDownload:true,canRegenerate:false,expiresAt:'2026-01-01T00:00:00Z'}};await act(async()=>button('Refresh payment status').props.onClick());assert.match(text(),/Download PDF/);assert.match(text(),/ended/);assert(!text().includes('Update PDF'));
 result={...data,order:{...order,state:'paid',canDownload:true,canRegenerate:true}};await mount();result={error:{code:'busy',message:'internal'}};status=409;await act(async()=>button('Update PDF from saved trip').props.onClick());assert.match(text(),/Download PDF/);assert.match(text(),/already being prepared/);
 status=200;result={...data,preview:null,issues:['Day 1, stop 2: unsupported destination "Unknown museum".']};await mount();assert.match(text(),/Unknown museum/);assert(!text().includes('Prepare my PDF'));
 await mount({locale:'zh'});assert.match(text(),/第 1 天/);assert.match(text(),/Unknown museum/);assert.match(text(),/尚未支持/);
 result={...data,config:{...data.config,checkoutAvailable:false,amount:999}};await mount();assert.match(text(),/unavailable/);assert(!text().includes('Prepare my PDF'));
 result={...data,order:{...order,state:'revoked',canDownload:false}};await mount();assert.match(text(),/revoked/);assert(!text().includes('Download PDF'));
 status=404;result={error:{code:'not_found',message:'internal'}};await mount();assert.match(text(),/deleted/);assert.match(text(),/Retry/);
 status=200;result=data;await act(async()=>button('Retry').props.onClick());assert.match(text(),/The Bund/);
 result={orders:[{...order,state:'paid',canDownload:true,canRegenerate:false}]};await act(async()=>{ui!.unmount();ui=create(React.createElement(PackOrders,{locale:'en'}));});assert.equal(requests.at(-1)?.url,'/api/trip-pack/orders');assert.match(text(),/Download PDF/);assert.match(text(),/Open Pack & status/);assert.match(text(),/no real money/);
 result={orders:[{...order,state:'revoked',canDownload:false}]};await act(async()=>{ui!.unmount();ui=create(React.createElement(PackOrders,{locale:'zh'}));});assert.match(text(),/权限已撤销/);assert(!text().includes('下载 PDF'));
 // Recovery regressions: keep server-returned order identifiers and never create another checkout to resume.
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const oldNow=Date.now,oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
 try{
 const navigations:string[]=[];let navigationFails=false;
 Object.assign(globalThis,{window:{location:{origin:'https://www.ramblechina.com',protocol:'https:',hostname:'www.ramblechina.com',assign:(url:string)=>{navigations.push(url);if(navigationFails)throw Error('navigation blocked');}}}});
 const hosted='https://www.creem.io/test/checkout/prod_fixture/ch_same';
 let currentOrder:PackOrder={...order,state:'pending',checkoutUrl:hosted};
 respond=async url=>Response.json(url.includes('/status')?{order:currentOrder}:{...data,order:currentOrder});
 await mount({orderId:order.id});const requestsBeforeResume=requests.length;
 assert(button('Resume test checkout'),'Pending order reopened from Account must resume');
 await act(async()=>button('Resume test checkout').props.onClick());assert.equal(navigations.at(-1),hosted);assert.equal(requests.length,requestsBeforeResume,'Resume must not create a provider checkout');
 currentOrder={...currentOrder,checkoutExpired:true} as typeof currentOrder;
 await act(async()=>button('Refresh payment status').props.onClick());assert.match(text(),/checkout has expired/i);assert(!button('Resume test checkout'));assert.match(text(),/service@ramblechina.com/);
 currentOrder={...order,state:'pending',checkoutUrl:null,needsSupport:true};await mount();assert(!button('Resume test checkout'));assert.match(text(),/before starting another purchase/);
 respond=undefined;result={...data,order};await mount();await act(async()=>ui!.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}));
 result={order:{...order,state:'pending',checkoutUrl:hosted}};navigationFails=true;
 await act(async()=>button('Continue to test checkout').props.onClick());assert(button('Resume test checkout'));const afterFailedNavigation=requests.length;navigationFails=false;
 await act(async()=>button('Resume test checkout').props.onClick());assert.equal(navigations.at(-1),hosted);assert.equal(requests.length,afterFailedNavigation);
 result={...data,config:{...data.config,checkoutAvailable:false},order:{...order,state:'pending',checkoutUrl:hosted}};await mount();assert(!button('Resume test checkout'),'Disabled checkout cannot resume a hosted session');
 // A prepared old version cannot be paid while showing a newer or unsupported preview.
 result={...data,trip:{...data.trip,version:1}};await mount();const hotelFields=ui!.root.findAllByType('input');await act(async()=>{hotelFields[0].props.onChange({target:{value:'Explicit hotel'}});hotelFields[1].props.onChange({target:{value:'Explicit private address'}});});result={order:{...order,version:1}};await act(async()=>button('Prepare my PDF').props.onClick());assert.equal(requests.at(-1)?.body?.version,1);assert.deepEqual(requests.at(-1)?.body?.hotel,{name:'Explicit hotel',address:'Explicit private address'});
 result={...data,order:{...order,version:1}};await mount();assert.match(text(),/prepared PDF.*older|saved trip.*changed/i);assert(!button('Continue to test checkout'));assert(button('Prepare updated PDF'));
 result={error:{code:'unavailable',message:'PRIVATE INTERNAL'}};status=503;await act(async()=>button('Prepare updated PDF').props.onClick());assert.match(text(),/order-private/);assert(!button('Continue to test checkout'));
 status=200;result={order:{...order,revision:2}};await act(async()=>button('Prepare updated PDF').props.onClick());assert.equal(requests.at(-1)?.body?.version,2);assert.equal(requests.at(-1)?.body?.hotel,undefined,'Replacement never silently copies an old hotel');assert.equal(button('Continue to test checkout').props.disabled,true);assert.match(text(),/re-enter.*hotel|hotel.*re-enter/i);
 await act(async()=>ui!.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}));
 result={order:{...order,revision:3}};await act(async()=>button('Prepare updated PDF').props.onClick());assert.equal(button('Continue to test checkout').props.disabled,true,'Every prepared replacement requires fresh consent');
 await act(async()=>ui!.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}));result={order:{...order,state:'pending',checkoutUrl:hosted}};await act(async()=>button('Continue to test checkout').props.onClick());assert.equal(requests.at(-1)?.body?.orderId,order.id);
 result={...data,order:{...order,locale:'zh'}};await mount();assert(!button('Continue to test checkout'));assert(button('Prepare updated PDF'));
 result={...data,preview:null,issues:['Unsupported place'],order:{...order,version:1}};await mount();assert.match(text(),/Unsupported place/);assert(!button('Continue to test checkout'));assert(!button('Prepare updated PDF'));
 // Actual timestamp boundary, not canRegenerate, decides whether a new purchase is offered.
 const boundary=Date.parse('2026-11-24T12:00:00Z');Date.now=()=>boundary-1;
 const paidOrder:PackOrder={...order,state:'paid',canDownload:true,canRegenerate:false,expiresAt:new Date(boundary).toISOString()};
 result={...data,config:{...data.config,checkoutAvailable:false},order:paidOrder};await mount();assert.match(text(),/Updates are temporarily unavailable/i);assert(!text().includes('window has ended'));assert(!button('Prepare new test purchase · US$9.90'));
 result={...data,order:{...paidOrder,canRegenerate:true}};await mount();assert(!button('Prepare new test purchase · US$9.90'),'Active entitlement never offers another purchase');
 Date.now=()=>boundary;
 const newerPaid={...paidOrder,id:'newer-active-order',expiresAt:new Date(boundary+86400000).toISOString(),canRegenerate:true};
 respond=async url=>Response.json(url.includes('/status')?{order:paidOrder}:{...data,order:newerPaid});await mount({orderId:paidOrder.id});assert(!button('Prepare new test purchase · US$9.90'),'Opening expired history must not offer another purchase when this trip has active rights');assert.match(text(),/Open current Trip Pack/);
 respond=undefined;result={...data,order:paidOrder};await mount();assert(button('Prepare new test purchase · US$9.90'),'Exact expiry boundary permits a fresh test purchase');assert.match(text(),/Download PDF/);
 result={order:{...order,id:'new-order',revision:1}};await act(async()=>button('Prepare new test purchase · US$9.90').props.onClick());assert.equal(requests.at(-1)?.body?.version,2);assert.equal(button('Continue to test checkout').props.disabled,true);assert.match(text(),/fresh|US\$9.90/);
 // Shared download action keeps the current page on error and saves real successful PDF bytes.
 Date.now=oldNow;const clicked:string[]=[];const blobs:Blob[]=[];const revoked:string[]=[];
 URL.createObjectURL=(blob:Blob|MediaSource)=>{blobs.push(blob as Blob);return 'blob:private-local-pdf';};URL.revokeObjectURL=(value:string)=>{revoked.push(value);};
 Object.assign(globalThis,{document:{createElement:()=>({href:'',download:'',click(){clicked.push(this.download);},remove(){}}),body:{appendChild(){}}}});
 result={...data,order:paidOrder};await mount();status=401;result={error:{code:'sign_in',message:'PRIVATE INTERNAL'}};await act(async()=>button('Download PDF').props.onClick());assert.match(text(),/Sign in again/);assert.match(text(),/My account/);assert(!text().includes('PRIVATE INTERNAL'));assert.equal(clicked.length,0);
 status=403;result={error:{code:'revoked',message:'PRIVATE INTERNAL'}};await act(async()=>button('Download PDF').props.onClick());assert.match(text(),/revoked/);assert.match(text(),/Check order status/);
 status=503;result={error:{code:'unavailable',message:'PRIVATE INTERNAL'}};await act(async()=>button('Download PDF').props.onClick());assert.match(text(),/service@ramblechina.com/);assert.equal(clicked.length,0);
 respond=async()=>new Response('%PDF-1.7\nreal-controlled-bytes',{headers:{'Content-Type':'application/pdf'}});await act(async()=>button('Download PDF').props.onClick());assert.equal(clicked.length,1);assert.match(await blobs[0].text(),/^%PDF-/);assert.equal(requests.at(-1)?.url,'/api/trip-pack/download?order=order-private');await new Promise(resolve=>setTimeout(resolve,5));assert.equal(revoked.length,1);
 respond=undefined;status=200;result={orders:[{...order,id:'new-order'},paidOrder]};await act(async()=>{ui!.unmount();ui=create(React.createElement(PackOrders,{locale:'zh'}));});assert.match(text(),/new-order/);assert.match(text(),/order-private/);status=401;result={error:{code:'sign_in',message:'PRIVATE INTERNAL'}};await act(async()=>button('下载 PDF').props.onClick());assert.match(text(),/重新登录/);assert.match(text(),/查看订单状态/);assert.equal(clicked.length,1);
 }finally{respond=undefined;status=200;Date.now=oldNow;URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');}
 console.log('PASS: pending same-checkout recovery/expiry, stale prepared version and locale refresh, exact 90-day boundary and new test purchase, shared download error/success recovery; account order recovery and revoked denial; real workflow loading/auth/unsaved, supported preview and price, policy gate, uncertain checkout, pending/manual refresh, expired retained download, failed regeneration retention, unsupported details, wrong config, revocation, missing trip and retry.');
 }finally{if(ui)await act(async()=>ui!.unmount());globalThis.fetch=previous;await rm(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
