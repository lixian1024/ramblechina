import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {create,type ReactTestRenderer} from 'react-test-renderer';

async function main() {
  const directory=await mkdtemp(resolve('.research-test-'));
  const originalFetch=globalThis.fetch;
  let renderer:ReactTestRenderer|undefined;
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,self:globalThis});
  try {
    const outfile=join(directory,'ui.cjs');
    await build({stdin:{contents:`export {default as Form} from './src/components/travel/TripReviewForm'; export {LocaleProvider} from './src/i18n/context';`,resolveDir:process.cwd(),loader:'tsx'},
      outfile,bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime','next/link']});
    const {Form,LocaleProvider}=createRequire(import.meta.url)(outfile);
    let mode:'fail'|'ok'|'conflict'='fail';
    const attempts:Record<string,unknown>[]=[];
    globalThis.fetch=async (_url,options)=>{
      const body=JSON.parse(String(options?.body)); attempts.push(body);
      if(mode==='fail')return Response.json({error:'Save unavailable'},{status:503});
      if(mode==='conflict')return Response.json({error:'Changed request',retryWithNewId:true},{status:409});
      return Response.json({requestId:body.requestId},{status:201});
    };
    const text=()=>JSON.stringify(renderer!.toJSON());
    const input=(name:string)=>renderer!.root.findAll(node=>node.props.name===name)[0];
    const submit=()=>renderer!.root.findByType('form').props.onSubmit({preventDefault(){}});
    await act(async()=>{renderer=create(React.createElement(LocaleProvider,{locale:'en'},React.createElement(Form)));});
    assert.equal(input('consent').props.checked,false,'Consent requires a deliberate action');
    await act(async()=>{
      for(const [name,value] of Object.entries({email:'traveler@example.invalid',destination:'Shanghai',question:'Can day two work?'}))input(name).props.onChange({target:{value}});
      input('consent').props.onChange({target:{checked:true}});
    });
    await act(async()=>submit());
    assert.match(text(),/Save unavailable/);
    assert.equal(input('question').props.value,'Can day two work?','A failed save retains input');
    await act(async()=>submit());
    assert.equal(attempts[0].requestId,attempts[1].requestId,'A lost response retry keeps the idempotency key');
    mode='conflict';await act(async()=>submit());
    mode='ok';await act(async()=>submit());
    assert.notEqual(attempts[2].requestId,attempts[3].requestId,'A conflict permits a new explicit submission');
    assert.match(text(),/Request received/);assert.match(text(),/not a confirmed/);
    await act(async()=>renderer!.unmount());renderer=undefined;
    await act(async()=>{renderer=create(React.createElement(LocaleProvider,{locale:'zh'},React.createElement(Form)));});
    assert.match(text(),/联系邮箱/);assert.match(text(),/同意/);
    console.log('PASS: production guest form requires explicit consent, retains failed input, retries idempotently, recovers conflicts, confirms only saved requests and supports Chinese.');
  } finally {
    if(renderer)await act(async()=>renderer!.unmount());
    globalThis.fetch=originalFetch; await rm(directory,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
