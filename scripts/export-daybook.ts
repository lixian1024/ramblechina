import { mkdir,writeFile } from 'node:fs/promises';
import { makeDaybook } from '../src/lib/journey/pdf';
import { defaultOptions } from '../src/lib/content/beijing-day';
async function main(){await mkdir('output/pdf',{recursive:true});const bytes=await makeDaybook(defaultOptions);await writeFile('output/pdf/ramble-china-beijing-daybook.pdf',bytes);console.log('Exported Beijing daybook:',bytes.length,'bytes');}main().catch(()=>{console.error('Daybook export failed.');process.exitCode=1;});
