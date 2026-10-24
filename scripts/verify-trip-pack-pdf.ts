import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {PDFDocument,PDFArray,PDFDict,PDFName,PDFString,PDFHexString} from 'pdf-lib';
import {preparePack,type PackDocument} from '../src/lib/trip-pack/model';
import {renderPackPdf} from '../src/lib/trip-pack/pdf';

async function main(){
// Removing page flow, font subsetting or link annotations must break this boundary test.
const output='output/trip-pack';
await mkdir(output,{recursive:true});
const names=[['Yuyuan Bazaar','Yu Garden','The Bund'],['Wukang Road','Former French Concession','Xintiandi'],["People's Square",'Nanjing Road Pedestrian Street','Oriental Pearl Tower']];
function fixture(days:number,locale:'en'|'zh'){
 const selected=days===1?[["Yuyuan Bazaar","The Bund"]]:names;
 const result=preparePack({plan:{startDate:days===1?'2026-11-02':'2026-11-03',days:selected.map((stops,index)=>({city:'上海',date:days===1?'2026-11-02':`2026-11-0${3+index}`,stops:stops.map((name,i)=>({name,search:days===1?(i?'外滩':'豫园商城'):name,...(days===1?{nameChinese:i?'外滩':'豫园商城',nameEnglish:name}:{}),durationMinutes:60,at:`${10+i*3}:00`,booked:i===1,bookingNote:i===1?'Traveller booking note / 旅客预约备注':undefined}))}))}},locale,{name:'Example traveller-entered hotel / 示例自填酒店',address:'Traveller-entered return address / 旅客自填返回地址'},'2026-10-23T08:00:00.000Z');
 assert(result.document,JSON.stringify(result.issues));return result.document;
}
function linkTargets(pdf:PDFDocument){return pdf.getPages().flatMap(page=>{const annotations=page.node.lookupMaybe(PDFName.of('Annots'),PDFArray);return annotations?annotations.asArray().flatMap(ref=>{const annotation=pdf.context.lookup(ref,PDFDict);const action=annotation.lookupMaybe(PDFName.of('A'),PDFDict);const uri=action?.get(PDFName.of('URI'));return uri instanceof PDFString||uri instanceof PDFHexString?[uri.decodeText()]:[];}):[];});}
const files:string[]=[];
for(const locale of ['en','zh'] as const)for(const days of [1,3]){
 const document=fixture(days,locale);
 const bytes=await renderPackPdf(document);
 assert(bytes.length<2*1024*1024,`Font must be subset; ${bytes.length} bytes`);
 assert.equal(Buffer.from(bytes.subarray(0,5)).toString(),'%PDF-','Renderer must produce a PDF file');
 const pdf=await PDFDocument.load(bytes);
 assert(pdf.getPageCount()>=days+2,'Overview, itinerary and destination cards must survive');
 const links=linkTargets(pdf);
 for(const stop of document.days.flatMap(day=>day.stops)){
  assert(links.includes(stop.sourceUrl),`Missing source link ${stop.nameEnglish}`);
  assert(links.some(url=>url.startsWith('https://www.google.com/maps/search/?api=1&query=')&&decodeURIComponent(url).includes(stop.nameChinese)),'Google backup search must use independent Chinese identity');
  const amap=links.map(url=>new URL(url)).find(url=>url.hostname==='uri.amap.com'&&url.searchParams.get('keyword')===stop.nameChinese);
  assert(amap,`Missing Amap name-search annotation for ${stop.nameChinese}`);
  assert.equal(amap.protocol,'https:');assert.equal(amap.pathname,'/search');
  assert.equal(amap.searchParams.get('city'),'310000');assert.equal(amap.searchParams.get('src'),'ramblechina');assert.equal(amap.searchParams.get('callnative'),'0');
  assert.deepEqual([...amap.searchParams.keys()].sort(),['callnative','city','keyword','src'],'Amap search must contain no key, secret, coordinates or supplier payload');
  assert.equal(amap.username+amap.password,'','No credentials in map links');
 }
 const path=`${output}/shanghai-${days}day-${locale}.pdf`;await writeFile(path,bytes);await writeFile(path.replace(/\.pdf$/,'.json'),JSON.stringify(document,null,2)+'\n');files.push(path);
 console.log(`${path}: ${pdf.getPageCount()} pages, ${bytes.length} bytes`);
}
const long=fixture(3,'zh');long.hotel!.name='酒店长名称 '.repeat(30).trim();long.hotel!.address='用户自行填写的酒店地址 '.repeat(25).trim();long.days[0].stops[0].bookingNote=('A long traveller note 旅客备注 '.repeat(32)+' END-OF-LONG-NOTE').slice(0,1000);long.warnings.push(('Long caution 中文提醒 '.repeat(50)+' END-OF-LONG-WARNING').slice(0,2000));
const longBytes=await renderPackPdf(long);const longPath=`${output}/shanghai-long-zh.pdf`;await writeFile(longPath,longBytes);files.push(longPath);assert(longBytes.length<2*1024*1024);
const preview=await renderPackPdf(fixture(1,'en'),true);const previewPath=`${output}/shanghai-preview-en.pdf`;await writeFile(previewPath,preview);files.push(previewPath);
await assert.rejects(()=>renderPackPdf({...fixture(1,'en'),days:[]} as unknown as PackDocument),'Invalid stored document must not render');
const bundledPython=path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
// Override for CI with any Python environment containing pypdf. Poppler is also required.
const python=process.env.PACK_PDF_PYTHON||(existsSync(bundledPython)?bundledPython:'python3');
const check=String.raw`
import sys,re
from pypdf import PdfReader
for path in sys.argv[1:]:
 r=PdfReader(path)
 text='\n'.join(p.extract_text() or '' for p in r.pages)
 assert '豫园商城' in text, (path, 'Chinese text extraction lost the destination')
 assert 'Yuyuan Bazaar' in text, (path, 'English destination missing')
 assert ('2026-11-02' if '1day' in path or 'preview' in path else '2026-11-03') in text and '2026-10-23' in text, (path, 'Travel and review dates missing')
 assert '旅客预约备注' in text, (path, 'Chinese user choice missing')
 assert '\ufffd' not in text, (path, 'Replacement glyph found')
 if 'long' in path:
  assert 'END-OF-LONG-NOTE' in text, 'Long note clipped'
  assert 'END-OF-LONG-WARNING' in text, 'Long warning clipped'
 if 'preview' in path: assert 'PREVIEW' in text, 'Preview must be labelled'
 print('EXTRACT PASS',path,len(text),'characters')
`;
console.log(execFileSync(python,['-c',check,...files],{encoding:'utf8'}));
const render=spawnSync('pdftoppm',['-f','1','-singlefile','-r','72','-png',`${output}/shanghai-1day-zh.pdf`,`${output}/chinese-render-check`],{encoding:'utf8',maxBuffer:1024*1024});
assert.equal(render.status,0,render.stderr);
assert(!/Embedded font file may be invalid|Couldn't create a font|non-embedded font/i.test(render.stderr),'Chinese font must actually render, not merely extract text');
console.log('PASS trip-pack PDF: bilingual extraction, links, bounded subsets, long flow, invalid-input denial and preview labels.');

}
main().catch(error=>{console.error(error);process.exitCode=1;});
