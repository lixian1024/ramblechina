import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {create,type ReactTestRenderer} from 'react-test-renderer';

async function main() {
  const directory=await mkdtemp(resolve('.guide-admin-test-'));
  const originalFetch=globalThis.fetch;
  let renderer:ReactTestRenderer|undefined;
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,self:globalThis});
  try {
    const outfile=join(directory,'ui.cjs');
    await build({stdin:{contents:`export {default as Admin} from './src/components/account/GuideRequestAdmin'; export {LocaleProvider} from './src/i18n/context';`,resolveDir:process.cwd(),loader:'tsx'},
      outfile,bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime','next/link']});
    const {Admin,LocaleProvider}=createRequire(import.meta.url)(outfile);
    const id='00000000-0000-4000-8000-000000000001';
    const row={id,reference:'RG-'+id,status:'new',created_at:'2026-10-19T00:00:00Z',request:{
      requestId:id,name:'Controlled traveler',email:'test@example.invalid',destinations:'Shanghai',startDate:'2026-10-20',endDate:'2026-10-21',travelers:2,guideLanguage:'English',budget:'USD 1,000–3,000',notes:'Vegetarian; controlled UI fixture',consent:true,website:''}};
    let mode:'ok'|'fail'|'forbidden'|'defer'='ok';
    const pending:{url:string;finish:(response:Response)=>void}[]=[];
    globalThis.fetch=async input=>{
      const url=String(input);
      if(mode==='defer')return new Promise<Response>(finish=>pending.push({url,finish}));
      if(mode==='fail')return Response.json({error:'Unavailable'},{status:503});
      if(mode==='forbidden')return Response.json({error:'Denied'},{status:403});
      const params=new URL(url,'http://controlled-ui.test').searchParams;
      if(params.get('status')!=='all'||params.get('page')==='1')return Response.json({requests:[],hasMore:false});
      return Response.json({requests:[row,{...row,id:'00000000-0000-4000-8000-000000000002',reference:'RG-invalid',request:null}],hasMore:true});
    };
    const text=()=>JSON.stringify(renderer!.toJSON());
    const button=(label:string)=>renderer!.root.findAllByType('button').find(node=>node.children.join('')===label)!;
    await act(async()=>{renderer=create(React.createElement(LocaleProvider,{locale:'en'},React.createElement(Admin)));});
    assert.match(text(),/Shanghai/);assert.match(text(),/Vegetarian/);assert.match(text(),/test@example.invalid/);
    assert.match(text(),/Invalid request details/,'Malformed details do not crash valid cards');
    assert.equal(renderer!.root.findAllByType('details').length,1);
    assert.equal(button('Previous').props.disabled,true);
    await act(async()=>button('Next').props.onClick());
    assert.match(text(),/No requests match/);assert.equal(button('Next').props.disabled,true);
    await act(async()=>renderer!.root.findByType('select').props.onChange({target:{value:'closed'}}));
    assert.equal(button('Previous').props.disabled,true,'Changing filters resets pagination');
    mode='fail';await act(async()=>button('Refresh').props.onClick());
    assert.match(text(),/could not be loaded/);assert.doesNotMatch(text(),/test@example.invalid/);
    mode='ok';await act(async()=>button('Retry').props.onClick());assert.match(text(),/No requests match/);
    mode='defer';await act(async()=>renderer!.root.findByType('select').props.onChange({target:{value:'all'}}));
    assert.match(text(),/Loading guide requests/);
    await act(async()=>renderer!.root.findByType('select').props.onChange({target:{value:'new'}}));
    assert.equal(pending.length,2);
    await act(async()=>pending[1].finish(Response.json({requests:[],hasMore:false})));
    await act(async()=>pending[0].finish(Response.json({requests:[row],hasMore:false})));
    assert.match(text(),/No requests match/);assert.doesNotMatch(text(),/Controlled traveler/,'Late response must not replace the selected filter');
    mode='forbidden';await act(async()=>button('Refresh').props.onClick());
    assert.match(text(),/Administrator access is required/);assert.equal(renderer!.root.findAllByType('select').length,0);
    await act(async()=>renderer!.unmount());renderer=undefined;
    mode='ok';await act(async()=>{renderer=create(React.createElement(LocaleProvider,{locale:'zh'},React.createElement(Admin)));});
    assert.match(text(),/本地导游需求/);assert.match(text(),/需求信息异常/);
    console.log('PASS: production admin component renders details/invalid rows, paginates, resets filters, retries after failure, rejects late responses, hides forbidden content and supports Chinese. Controlled responses are not live Supabase data.');
  } finally {
    if(renderer)await act(async()=>renderer!.unmount());
    globalThis.fetch=originalFetch;
    await rm(directory,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error(error);process.exit(1);});
