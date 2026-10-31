import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildContent, parseCourseMap, renderDocument, ROOT, CONTENT_ROOT } from '../scripts/build-content.mjs';
import { collectionItems } from '../src/collections.js';

test('all lesson files and topic mappings are represented without duplicating lessons', async () => {
  const catalog = await buildContent();
  const lessons = catalog.documents.filter(d => d.kind === 'lesson');
  const sourceFiles = (await fs.readdir(path.join(CONTENT_ROOT, 'Course-Notes'))).filter(f => /^Lesson-\d+-.*\.md$/.test(f));
  assert.equal(lessons.length, sourceFiles.length);
  assert.equal(new Set(catalog.documents.map(d => d.id)).size, catalog.documents.length);
  assert.deepEqual(catalog.warnings, []);
  assert.equal(CONTENT_ROOT, path.join(ROOT, 'content'));
  const bites = JSON.parse(await fs.readFile(path.join(CONTENT_ROOT, 'Language-Bites/notes.json'), 'utf8'));
  assert.deepEqual(catalog.bites, bites.notes, 'all short-note fields survive content generation');
  assert.equal(catalog.bitesNotice, bites.notice);
  assert.equal(new Set(catalog.bites.map(note => note.id)).size, catalog.bites.length);
  assert.ok(catalog.bites.length >= 80, 'all imported short notes remain available');
  assert.doesNotMatch(JSON.stringify(catalog.bites), /instagram|[\p{Script=Han}]/iu);
  for (const category of ['Grammar', 'Vocabulary', 'Pronunciation', 'Speaking']) assert.ok(catalog.bites.some(note => note.category === category));
  assert.deepEqual(lessons.find(d => d.id === 'lesson-04').tags, ['02', '05', '06']);
  for (const category of catalog.categories) assert.equal(category.count, lessons.filter(d => d.tags.includes(category.id)).length);
  const grammar = catalog.documents.find(d => d.id === 'grammar');
  const cueCards = catalog.documents.find(d => d.id === 'cue-cards');
  const individualCards = catalog.documents.filter(d => d.kind === 'cue-card');
  const cueFiles = (await fs.readdir(path.join(CONTENT_ROOT, 'Practice/IELTS-Speaking/Cue-Cards'))).filter(f => /^Cue-Card-\d+-.*\.md$/.test(f));
  assert.equal(individualCards.length, cueFiles.length);
  assert.equal(cueCards.groups.length, individualCards.length);
  assert.equal(grammar.groups.length, 13);
  const linkingWords = catalog.documents.find(d => d.id === 'linking-words');
  assert.equal(linkingWords.kind, 'linking-words');
  assert.equal(linkingWords.groups.length, 12);
  assert.equal(linkingWords.groups.filter(group => group.terms.includes('However')).length, 1);
  assert.equal(cueCards.groups.length, 22);
  const orderedCues = collectionItems(catalog, 'cue-cards');
  assert.deepEqual(orderedCues.map(d => d.number), [17, 18, 15, 16, 21, 13, 14, 11, 12, 9, 10, 8, 4, 5, 6, 7, 1, 2, 3, 19, 20, 22]);
  assert.deepEqual(collectionItems(catalog, 'cue-cards', new URLSearchParams('sort=asc')).map(d => d.number), [22, 20, 19, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 17, 18]);
  assert.deepEqual(cueCards.groups.map(g => Number(g.title.match(/^\d+/)[0])), orderedCues.map(d => d.number), 'the combined reader follows course order without changing topic anchors');
  for (const cue of individualCards) assert.ok(lessons.some(lesson => lesson.number === cue.courseOrder.lesson));
  for (const doc of catalog.documents) {
    const rendered = JSON.parse(await fs.readFile(path.join(ROOT, 'web/public/content', `${doc.id}.json`), 'utf8'));
    const ids = rendered.headings.map(h => h.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const group of doc.groups) assert.ok(ids.includes(group.id));
    assert.ok(rendered.html.length > 200);
    assert.ok(!rendered.html.includes('/Users/'));
    if (doc.kind === 'cue-card') {
      const sections = rendered.headings.filter(heading => heading.depth === 2).map(heading => heading.title);
      assert.deepEqual(sections.slice(0, 3), ['Practice Cue Card', 'Extended Model Answer', 'Linking Language']);
      assert.match(sections[3], /^Your Grammar.*Review/);
      assert.equal(sections[4], 'Shorten for the Exam');
      assert.equal(sections.length, 5);
    }
  }
});

test('Markdown rendering keeps tables, generates unique anchors, and rejects unsafe HTML and links', () => {
  const source = '# Example\n\n## A repeated heading\n\n## A repeated heading\n\n| Wrong | Right |\n| --- | --- |\n| goes | go |\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[bad](javascript:alert%281%29)\n\n[safe](https://example.com)\n';
  const { html, headings } = renderDocument(source, 'Course-Notes/Example.md', new Map());
  assert.ok(html.includes('<table>'));
  assert.ok(headings.some(h => h.id === 'a-repeated-heading-1'));
  assert.ok(!/<script|onerror=|javascript:/i.test(html));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});

test('internal document links and approved images work under a project subpath', () => {
  const registry = new Map([['Topic-Review/02-Tenses.md', 'topic-02']]);
  const { html } = renderDocument('[Tenses](../Topic-Review/02-Tenses.md#past-simple)\n\n![class](assets/image1.png)\n\n![private](assets/unreviewed.png)', 'Course-Notes/Lesson.md', registry);
  assert.ok(html.includes('#/read/topic-02?section=past-simple'));
  assert.ok(html.includes('src="./lesson-assets/image1.png"'));
  assert.ok(!html.includes('src="assets/unreviewed.png"'));
  const chart = renderDocument('[Chart](../Resources/LinkingWordsInEnglish.jpg)', 'Practice/Example.md', registry);
  assert.ok(chart.html.includes('href="./lesson-assets/LinkingWordsInEnglish.jpg"'));
});

test('invalid course map duplicates are detected instead of silently overwriting categories', () => {
  const row = '| [20](../Course-Notes/Lesson-20-Example.md) | [02](02-Tenses.md) |';
  assert.throws(() => parseCourseMap(`${row}\n${row}`), /Duplicate/);
});
