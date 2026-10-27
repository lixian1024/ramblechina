import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {languageDestination} from '../src/i18n/routing';
import sitemap from '../src/app/sitemap';

async function main() {
  assert(existsSync('src/content/medical-guide.ts'), 'The bilingual medical guide has not been added');
  const {medicalSections, medicalSources, medicalOriginals} = await import('../src/content/medical-guide');
  const sectionIds = new Set(medicalSections.map(section => section.id));
  assert.deepEqual([...sectionIds], ['before-you-decide', 'care-options', 'hospitals', 'appointments', 'costs-insurance', 'entry-medicines', 'travel-preparation', 'language-records', 'risks-recovery', 'follow-up']);
  const sourceIds = new Set(medicalSources.map(source => source.id));
  assert.equal(sectionIds.size, 10, 'Every agreed topic must have a distinct addressable chapter');
  assert.equal(sourceIds.size, medicalSources.length, 'Source identifiers must be unambiguous');
  for (const section of medicalSections) {
    const questionIds = new Set(section.questions.map(question => question.id));
    assert.equal(questionIds.size, section.questions.length, 'FAQ deep links cannot collide');
    assert(section.questions.length >= 2 && section.actions.length >= 2, 'Readers need answers and visible next steps');
    for (const value of [section.title, section.intro, ...section.actions, ...section.questions.flatMap(question => [question.title, question.body])]) {
      assert(value.en.trim() && value.zh.trim(), `Incomplete bilingual chapter: ${section.id}`);
      assert.notEqual(value.en, value.zh, 'A language switch must not expose untranslated English prose');
    }
    for (const id of section.sources) assert(sourceIds.has(id), `Unresolvable citation ${id}`);
  }
  for (const source of medicalSources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.equal(medicalOriginals.length, 6);
  for (const original of medicalOriginals) {
    assert(original.sections.length);
    for (const id of original.sections) assert(sectionIds.has(id), `Original article points to missing topic ${id}`);
  }
  assert(medicalSections.find(section => section.id === 'appointments')!.questions.some(question => question.id === 'cancelled-appointment'));
  assert(medicalSections.find(section => section.id === 'language-records')!.questions.some(question => question.id === 'missing-english-report'));
  const visibleRiskActions = medicalSections.find(section => section.id === 'risks-recovery')!.actions;
  assert(visibleRiskActions.some(action => /seek.*local.*assessment.*do not wait/i.test(action.en) && /及时.*当地.*不要等待/.test(action.zh)), 'Worsening symptoms require visible local-care guidance outside collapsed FAQs');
  assert.equal(languageDestination('/en/medical#costs-insurance', 'zh'), '/zh/medical#costs-insurance');
  assert.equal(languageDestination('/zh/medical#language-records', 'en'), '/en/medical#language-records');
  for (const locale of ['en', 'zh']) {
    assert(sitemap().some(entry => entry.url === `https://www.ramblechina.com/${locale}/medical`), 'Readers and search engines must be able to discover both medical editions');
  }
  const base = process.argv.find(arg => arg.startsWith('--url='))?.slice(6);
  if (base) {
    for (const locale of ['en', 'zh']) {
      const response: Response = await fetch(`${base}/${locale}/medical`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert(html.includes(`https://www.ramblechina.com/${locale}/medical`), 'Canonical page URL missing');
      assert(html.includes('hrefLang="zh-CN"') || html.includes('hreflang="zh-CN"'));
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      assert.equal(new Set(ids).size, ids.length, 'Duplicate DOM IDs break contents links');
      for (const id of sectionIds) assert(ids.includes(id), `Missing rendered chapter ${locale}/${id}`);
      for (const source of medicalSources) assert(html.includes(source.url.replaceAll('&', '&amp;')), `Missing source link ${source.id}`);
      assert((html.match(/<details\b/g) || []).length >= 21, 'Questions and mobile contents must be available without client rendering');
      assert(html.includes('aria-current="page"'), 'Medical navigation selection missing');
      for (const id of ['appointments-cancelled-appointment', 'language-records-missing-english-report']) {
        assert(new RegExp(`<details[^>]*id="${id}"[^>]*open`).test(html), 'Recovery guidance must be expanded initially');
      }
      const riskChapter = html.split('id="risks-recovery"')[1].split('</section>')[0].replace(/<details\b[\s\S]*?<\/details>/g, '');
      assert.match(riskChapter, locale === 'en' ? /do not wait/i : /不要等待/, 'Critical next steps must remain outside disclosures');
    }
  }
  console.log('PASS: complete bilingual medical topics, resolvable citations and original-article mapping, stable language anchors' + (base ? ', actual bilingual SSR and metadata.' : '.'));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
