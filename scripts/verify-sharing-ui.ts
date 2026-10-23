import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {create,type ReactTestRenderer} from 'react-test-renderer';
async function main(){
 const directory=await mkdtemp(resolve('.sharing-test-'));const originalFetch=globalThis.fetch;const originalWindow=(globalThis as Record<string,unknown>).window;let renderer:ReactTestRenderer|undefined;
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,self:globalThis});
 try{
  const outfile=join(directory,'ui.cjs');await build({stdin:{contents:"export {TripShareControls as Controls} from './src/components/travel/TripShareControls';",resolveDir:process.cwd(),loader:'tsx'},outfile,bundle:true,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime']});
  const {Controls}=createRequire(import.meta.url)(outfile);const methods:string[]=[];let fail=false;const events:unknown[][]=[];Object.assign(globalThis,{window:{location:{origin:'https://www.ramblechina.com',hostname:'www.ramblechina.com',protocol:'https:',href:'https://www.ramblechina.com/en/plan?trip=PRIVATE-ID'},__rambleAnalytics:{measurementId:'G-CONTROLLED',lastPage:'https://www.ramblechina.com/en/plan'},gtag:(...args:unknown[])=>events.push(args)}});
  const snapshot={schemaVersion:1,days:[{city:'Shanghai',date:'2026-11-20',stops:[{name:'Yu Garden',durationMinutes:90,uncertainty:['Hours unverified']}],uncertainty:[]}],uncertainty:['Saved snapshot, unverified']};
  globalThis.fetch=async(_input,options)=>{const method=options?.method||'GET';methods.push(method);if(fail)return Response.json({error:'Unavailable'},{status:503});if(method==='POST'){assert.equal(JSON.parse(String(options?.body)).confirmed,true);return Response.json({path:'/en/shared/'+'A'.repeat(43),publishedAt:'2026-10-23T00:00:00Z'});}if(method==='DELETE')return Response.json({published:false});return Response.json({published:true,publishedAt:'2026-10-22T00:00:00Z',preview:snapshot});};
  const text=()=>JSON.stringify(renderer!.toJSON());const button=(label:string)=>renderer!.root.findAllByType('button').find(node=>node.children.join('')===label)!;
  await act(async()=>{renderer=create(React.createElement(Controls,{tripId:'00000000-0000-4000-8000-000000000001',locale:'en'}));});
  assert.equal(methods.length,0);await act(async()=>button('Share itinerary').props.onClick());
  assert.match(text(),/Yu Garden/);assert.match(text(),/anyone with the link/i);assert.equal(button('Publish new link').props.disabled,true);
  await act(async()=>renderer!.root.findByProps({type:'checkbox'}).props.onChange({target:{checked:true}}));assert.equal(button('Publish new link').props.disabled,false);
  fail=true;await act(async()=>button('Publish new link').props.onClick());assert.match(text(),/could not be updated/i);assert.equal(events.length,0,'Failed publication cannot count as a share success');assert.match(text(),/Yu Garden/);assert.equal(renderer!.root.findAllByProps({'aria-label':'Share link'}).length,0);
  fail=false;await act(async()=>button('Publish new link').props.onClick());assert.equal(renderer!.root.findByProps({'aria-label':'Share link'}).props.value,'https://www.ramblechina.com/en/shared/'+'A'.repeat(43));
  assert.equal(renderer!.root.findByProps({type:'checkbox'}).props.checked,false);assert.equal(events[0]?.[1],'share_created');assert(!JSON.stringify(events).includes('PRIVATE-ID'));assert(!JSON.stringify(events).includes('A'.repeat(43)));assert(!JSON.stringify(events).includes('00000000-0000-4000-8000-000000000001'));
  await act(async()=>button('Revoke link').props.onClick());assert.equal(renderer!.root.findAllByProps({'aria-label':'Share link'}).length,0);assert.match(text(),/revoked/i);assert.equal(events[1]?.[1],'share_revoked');
  await act(async()=>renderer!.unmount());renderer=undefined;
  await act(async()=>{renderer=create(React.createElement(Controls,{tripId:'00000000-0000-4000-8000-000000000002',locale:'zh'}));});await act(async()=>button('分享行程').props.onClick());assert.match(text(),/任何持有链接的人/);
  console.log('PASS: owner preview/explicit disclosure gate, failed publication preserves preview, single-use returned link, revoke hides link and bilingual controls.');
 }finally{if(renderer)await act(async()=>renderer!.unmount());globalThis.fetch=originalFetch;if(originalWindow===undefined)delete(globalThis as Record<string,unknown>).window;else Object.assign(globalThis,{window:originalWindow});await rm(directory,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1});
