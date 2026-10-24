/** Public demo only: Task 1's controlled synthetic fixture, never an account or order. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {renderPackPdf} from '../src/lib/trip-pack/pdf';
import {packDocumentSchema} from '../src/lib/trip-pack/model';
async function main(){
 await mkdir('public/trip-pack',{recursive:true});
 for(const locale of ['en','zh'] as const){const fixture=packDocumentSchema.parse(JSON.parse(await readFile(`output/trip-pack/shanghai-1day-${locale}.json`,'utf8')));// Explicitly omit the controlled fixture's synthetic hotel; no hotel data is published.
 delete fixture.hotel;
 for(const day of fixture.days)for(const stop of day.stops){stop.booked=false;delete stop.bookingNote;}
 await writeFile(`public/trip-pack/sample-${locale}.pdf`,await renderPackPdf(fixture,true));}
 console.log('Public samples: controlled synthetic one-day Shanghai fixtures, bilingual PREVIEW rendering; source review dates retained.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
