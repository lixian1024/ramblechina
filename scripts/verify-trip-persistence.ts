import assert from 'node:assert/strict';
import React, { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { useTripPersistence } from '../src/components/account/useTripPersistence';
import type { TripMessage } from '../src/lib/travel/concierge-types';

async function main(){
  const calls:{url:string;method:string;body:Record<string,unknown>}[]=[],paths:string[]=[],listeners=new Map<string,()=>void>();
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,window:{history:{replaceState(_data:unknown,_unused:string,url:string){paths.push(url);}},addEventListener(name:string,fn:()=>void){listeners.set(name,fn);},removeEventListener(name:string){listeners.delete(name);}}});
  let current:ReturnType<typeof useTripPersistence>,renderer:ReactTestRenderer;
  let reply=(call:typeof calls[number])=>Promise.resolve(Response.json({id:call.body.id,version:Number(call.body.version)+1,updated_at:new Date().toISOString()}));
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{const call={url:String(url),method:options?.method||'GET',body:options?.body?JSON.parse(String(options.body)):{} };calls.push(call);return reply(call);};
  function Harness({id,busy=false,enabled=true}:{id?:string;busy?:boolean;enabled?:boolean}){current=useTripPersistence(id,busy,enabled);return React.createElement('p',null,current.saveState);}
  const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
  async function change(messages:TripMessage[]){await act(async()=>{current.setMessages(messages);});}
  async function save(){await act(async()=>{await current.saveNow();});}
  try{
    await act(async()=>{renderer=create(React.createElement(Harness,{id:'private-trip-id',enabled:false}));});await act(tick);
    assert.equal(current!.ready,true,'Guests can see the workspace immediately');
    assert.equal(calls.length,0,'Guests must not fetch a bookmarked private trip');
    assert.equal(listeners.has('beforeunload'),false,'Guest previews do not claim unsaved account work');
    await change([{role:'user',text:'An unauthorized write must be ignored'}]);await save();
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,750));});
    assert.equal(calls.length,0,'Neither explicit nor automatic saving may write anonymous trip data');
    assert.equal(current!.dirty,false);
    await act(async()=>renderer.unmount());
    await act(async()=>{renderer=create(React.createElement(Harness));});await act(tick);
    assert.equal(current!.ready,true);
    await change([{role:'user',text:'Ten days from October 20'}]);await save();
    assert.equal(calls[0].method,'POST');assert.equal(calls[0].body.version,0);assert.equal(current!.saveState,'saved');assert.equal(current!.dirty,false);const firstId=String(calls[0].body.id);assert.equal(paths.at(-1),'/en/plan?trip='+firstId);
    let release:(response:Response)=>void=()=>{};
    reply=()=>new Promise(resolve=>{release=resolve;});
    await change([{role:'user',text:'Ten days from October 20'},{role:'assistant',text:'First revision'}]);
    await act(async()=>{void current.saveNow();});
    assert.equal(current!.saveState,'saving');
    await change([{role:'user',text:'Ten days from October 20'},{role:'assistant',text:'First revision'},{role:'user',text:'Make day 2 slower'}]);
    await act(async()=>{release(Response.json({id:firstId,version:2}));await tick();});
    assert.equal(current!.dirty,true,'A response for the old snapshot must not mark newer edits saved');
    reply=call=>Promise.resolve(Response.json({id:call.body.id,version:Number(call.body.version)+1}));await save();
    assert.equal(calls.at(-1)?.method,'PATCH');assert.equal(calls.at(-1)?.body.version,2);assert.equal((calls.at(-1)?.body.snapshot as {messages:TripMessage[]}).messages.at(-1)?.text,'Make day 2 slower');assert.equal(current!.dirty,false);
    reply=()=>Promise.resolve(Response.json({error:'Database offline'},{status:503}));
    await change([{role:'user',text:'Keep this unsaved input'}]);await save();assert.equal(current!.saveError,'Database offline');assert.equal(current!.messages[0].text,'Keep this unsaved input');assert.equal(current!.dirty,true);
    reply=call=>Promise.resolve(Response.json({id:call.body.id,version:Number(call.body.version)+1}));await act(async()=>current.retrySave());await save();assert.equal(current!.dirty,false);assert.equal(calls.at(-1)?.body.version,3,'A failed request must not advance the expected version');
    reply=()=>Promise.resolve(Response.json({error:'Edited in another tab',conflict:true},{status:409}));await change([{role:'user',text:'Conflicting edit'}]);await save();assert.equal(current!.conflict,true);const before=calls.length;await save();assert.equal(calls.length,before,'A conflict must never be retried as a blind overwrite');
    await act(async()=>current.reset());assert.equal(current!.messages.length,0);assert.equal(current!.conflict,false);reply=call=>Promise.resolve(Response.json({id:call.body.id,version:1}));await change([{role:'user',text:'A separate new trip'}]);await save();assert.equal(calls.at(-1)?.method,'POST');assert.notEqual(calls.at(-1)?.body.id,firstId);
    await act(async()=>renderer.unmount());
    reply=()=>Promise.resolve(Response.json({id:firstId,version:5,title:'Existing conversation',snapshot:{plan:null,messages:[{role:'user',text:'A saved conversation'}]}}));
    await act(async()=>{renderer=create(React.createElement(Harness,{id:firstId}));});await act(async()=>{await tick();await tick();});assert.equal(current!.messages[0].text,'A saved conversation');assert.equal(current!.dirty,false);
    await act(async()=>renderer.unmount());
    reply=()=>Promise.resolve(Response.json({error:'Trip not found in your account.'},{status:404}));await act(async()=>{renderer=create(React.createElement(Harness,{id:firstId}));});await act(async()=>{await tick();await tick();});assert.equal(current!.ready,false);assert.match(current!.loadError,/not found/);assert.equal(current!.messages.length,0);
    await act(async()=>renderer.unmount());
    console.log('PASS: guest workspaces never read or write private trips; production save hook creates/reopens authenticated trips, serializes in-flight edits, preserves input after database failure, retries without version drift, blocks stale overwrite, resets to a separate trip, and never saves an empty draft over a load failure. No browser cache is used.');
  }finally{globalThis.fetch=originalFetch;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
