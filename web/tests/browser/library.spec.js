import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('browse every lesson, combine tags, search full text, and return with filters intact', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const catalog = await (await request.get('/content/catalog.json')).json();
  const lessons = catalog.documents.filter(d => d.kind === 'lesson');
  await page.goto('/');
  await expect(page.locator('.course-card')).toHaveCount(lessons.length);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.course-grid')).toHaveClass(/is-list/);
  await page.screenshot({ path: testInfo.outputPath('courses-desktop.png') });
  await page.locator('.filter-panel > summary').click();
  await page.locator('[data-action="tag"][data-tag="01"]').click();
  await expect(page.locator('.course-card')).toHaveCount(lessons.filter(d => d.tags.includes('01')).length);
  await page.locator('[data-action="tag"][data-tag="02"]').click();
  await expect(page.locator('.course-card')).toHaveCount(lessons.filter(d => d.tags.includes('01') && d.tags.includes('02')).length);
  await page.locator('#match-mode').selectOption('any');
  await expect(page.locator('.course-card')).toHaveCount(lessons.filter(d => d.tags.includes('01') || d.tags.includes('02')).length);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.locator('#library-search').fill('out of paper');
  await expect(page.locator('.course-card')).toHaveCount(1);
  await page.locator('.card-main').click();
  await expect(page.locator('.document')).toContainText('The printer');
  await expect(page.locator('.document img')).toHaveCount(5);
  for (const img of await page.locator('.document img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('reader-desktop.png') });
  await page.locator('.document h3').filter({ hasText: 'Practice Dialogues' }).evaluate(heading => heading.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('reader-heading-levels-desktop.png') });
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#library-search')).toHaveValue('out of paper');
  await expect(page.locator('.course-card')).toHaveCount(1);
  await page.locator('#library-search').fill('zzzz-no-match-xyz');
  await expect(page.getByText('No matching notes')).toBeVisible();
  expect(errors).toEqual([]);
});

test('existing personal summaries, grammar groups, and all cue cards are readable and deep-linkable', async ({ page }) => {
  await page.goto('/#/topics');
  await expect(page.locator('.topic-card')).toHaveCount(9);
  await page.locator('.topic-card').first().getByText('Read collection').click();
  await expect(page.locator('.document')).toContainText('Pronunciation');
  await page.goto('/#/grammar');
  await expect(page.locator('.group-card')).toHaveCount(13);
  await page.locator('.group-card').nth(5).click();
  await expect(page.locator('.document')).toBeVisible();
  const targetId = new URLSearchParams(page.url().split('?')[1]).get('section');
  expect(targetId).toContain('countable-nouns');
  await expect.poll(() => page.locator(`[id="${targetId}"]`).evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(105);
  await page.reload();
  await expect(page.locator('.document')).toBeVisible();
  await expect.poll(() => page.locator(`[id="${targetId}"]`).evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(105);
  await page.goto('/#/cue-cards');
  await expect(page.locator('.group-card')).toHaveCount(22);
  await page.locator('.group-card').last().click();
  await expect(page.locator('.reader-heading h1')).toContainText('A Motorcycle Workshop');
  await expect(page.locator('[data-wiki-section="extended-model-answer"] .section-body')).toBeVisible();
  await page.goto('/#/resources');
  await expect(page.locator('.resource-card')).toHaveCount(4);
});

test('mobile navigation, reading tables, and search work without page-wide horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.course-card')).toHaveCount(19);
  await page.screenshot({ path: testInfo.outputPath('courses-mobile.png'), fullPage: false });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('.nav-link').filter({ hasText: 'My topic collections' }).click();
  await expect(page.locator('.topic-card')).toHaveCount(9);
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await page.goto('/#/read/lesson-02');
  await expect(page.locator('.document')).toContainText('The printer');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/read\/lesson-02/);
  await expect(page.locator('#main')).toBeFocused();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await expect(page.locator('.table-scroll').first()).toBeVisible();
  await page.locator('.document h3').filter({ hasText: 'Practice Dialogues' }).evaluate(heading => heading.scrollIntoView({ block: 'start' }));
  await page.screenshot({ path: testInfo.outputPath('reader-heading-levels-mobile.png') });
  await page.getByRole('button', { name: 'Increase text size' }).click();
  await expect(page.locator('.document')).toHaveCSS('font-size', '18px');
});

test('a missing document shows a useful recovery route', async ({ page }) => {
  await page.goto('/#/read/not-a-document');
  await expect(page.getByText('Document not found')).toBeVisible();
  await page.getByRole('link', { name: 'Back to courses' }).click();
  await expect(page.locator('.course-card')).toHaveCount(19);
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`every cue card opens its visible prompt and answer at ${viewport.width}px`, async ({ page, request }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const catalog = await (await request.get('/content/catalog.json')).json();
    const cards = catalog.documents.filter(doc => doc.kind === 'cue-card').sort((a, b) => a.number - b.number);
    for (const [index, card] of cards.entries()) {
      await page.goto('/#/cue-cards');
      await page.locator('.group-card').nth(index).click();
      await expect(page).toHaveURL(new RegExp(`#/read/${card.id}(?:\\?|$)`));
      await expect(page.locator('.reader-heading h1')).toHaveText(card.title);
      await expect(page.locator('.wiki-section[open]')).toHaveCount(5);
      await expect(page.locator('[data-wiki-section="practice-cue-card"] .section-body > p').first()).toBeVisible();
      await expect(page.locator('[data-wiki-section="extended-model-answer"] .section-body > p').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Linking Language', exact: true })).toBeVisible();
      if (index === 0 || index === cards.length - 1) {
        await page.screenshot({ path: testInfo.outputPath(`cue-card-${index + 1}.png`) });
        await page.reload();
        await expect(page.locator('[data-wiki-section="practice-cue-card"] .section-body > p').first()).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  });
}

test('all lessons open from course cards and every library document loads visible content', async ({ page, request }) => {
  const catalog = await (await request.get('/content/catalog.json')).json();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const doc of catalog.documents.filter(doc => doc.kind === 'lesson')) {
    await page.goto('/#/courses');
    await page.locator(`.card-main[href^="#/read/${doc.id}?"]`).click();
    await expect(page.locator('.reader-heading h1')).toHaveText(doc.title);
    await expect(page.locator('.wiki-section[open] .section-body').first()).toBeVisible();
    await expect(page.locator('.error-state')).toHaveCount(0);
  }
  for (const doc of catalog.documents.filter(doc => doc.kind !== 'lesson' && doc.kind !== 'cue-card')) {
    await page.goto(`/#/read/${doc.id}`);
    await expect(page.locator('.reader-heading h1')).toHaveText(doc.title);
    await expect(page.locator('.document')).toBeVisible();
    if (doc.sections) await expect(page.locator('.wiki-section[open] .section-body').first()).toBeVisible();
    else await expect(page.locator('.document > p').first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('internal clicks render directly, retain history, and legacy cue-card links still work', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('.course-card')).toHaveCount(19);
  // Model a preview host that suppresses native fragment events.
  await page.evaluate(() => {
    window.suppressFragmentEvent = event => event.stopImmediatePropagation();
    window.addEventListener('hashchange', window.suppressFragmentEvent, true);
  });
  await page.locator('.card-main').first().click();
  await expect(page.locator('.document')).toBeVisible();
  await page.locator('.nav-link[href="#/cue-cards"]').click();
  await page.locator('.group-card').first().click();
  await expect(page.locator('[data-wiki-section="extended-model-answer"] .section-body')).toBeVisible();
  await page.evaluate(() => window.removeEventListener('hashchange', window.suppressFragmentEvent, true));
  await page.goBack();
  await expect(page.locator('.group-card')).toHaveCount(22);
  await page.goForward();
  await expect(page).toHaveURL(/#\/read\/cue-card-01/);
  await expect(page.locator('.document')).toBeVisible();
  const catalog = await (await request.get('/content/catalog.json')).json();
  const group = catalog.documents.find(doc => doc.id === 'cue-cards').groups.at(-1);
  await page.goto(`/#/read/cue-cards?section=${encodeURIComponent(group.id)}`);
  await expect(page.locator(`[data-wiki-section="${group.id}"] .section-body > p`).first()).toBeVisible();
});

test('unavailable document responses show a working retry instead of an empty reader', async ({ page }) => {
  let unavailable = true;
  await page.route('**/content/lesson-01.json', route => unavailable
    ? route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Unavailable</html>' })
    : route.continue());
  await page.goto('/');
  await page.locator('.card-main').first().click();
  await expect(page.getByRole('heading', { name: 'Unable to open these notes' })).toBeVisible();
  await expect(page.locator('.error-state')).toContainText('Refresh the library');
  unavailable = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.document')).toBeVisible();
});

test('the production build works beneath a GitHub Pages project directory', async ({ page }) => {
  const dist = new URL('../../dist/', import.meta.url);
  const failedRequests = [];
  page.on('response', response => { if (response.status() >= 400) failedRequests.push(response.url()); });
  await page.route('**/english-library/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const relative = pathname.replace(/^\/english-library\//, '') || 'index.html';
    const file = new URL(relative, dist);
    if (!file.href.startsWith(dist.href)) return route.fulfill({ status: 404 });
    const contentType = ({ js: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' })[relative.split('.').at(-1)] || 'application/octet-stream';
    try { await route.fulfill({ body: await fs.readFile(file), contentType }); }
    catch { await route.fulfill({ status: 404 }); }
  });
  await page.goto('/english-library/#/courses?tags=01');
  await expect(page.locator('.course-card')).toHaveCount(9);
  await page.locator('.card-main').first().click();
  await expect(page.locator('.document')).toContainText('The printer');
  const firstImage = page.locator('.document img').first();
  await firstImage.scrollIntoViewIfNeeded();
  await expect.poll(() => firstImage.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.goto('/english-library/#/cue-cards');
  await page.locator('.group-card').first().click();
  await expect(page).toHaveURL(/english-library\/#\/read\/cue-card-01/);
  await expect(page.locator('[data-wiki-section="extended-model-answer"] .section-body')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-wiki-section="practice-cue-card"] .section-body')).toBeVisible();
  await page.goto('/english-library/#/bites');
  await expect(page.locator('.bite-card')).toHaveCount(80);
  await page.locator('.bite-card').first().click();
  await page.getByRole('tab', { name: '4 Practise' }).click();
  await page.getByText('Reveal answer', { exact: true }).click();
  await expect(page.locator('.bite-answer p')).toBeVisible();
  expect(failedRequests).toEqual([]);
});

test('wiki preferences, section links, focus mode, and expanded tables work together', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Card view', exact: true }).click();
  await expect(page.locator('.course-grid')).not.toHaveClass(/is-list/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Card view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await page.keyboard.press('/');
  await expect(page.locator('#library-search')).toBeFocused();
  await expect(page.locator('#search-dialog')).not.toBeVisible();
  await page.goto('/#/read/lesson-02');
  const sections = page.locator('.wiki-section');
  await expect(sections.first()).toHaveJSProperty('open', true);
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  await expect(page.locator('.wiki-section[open]')).toHaveCount(0);
  const tocLink = page.locator('.reader-index [data-section]').nth(1);
  const target = await tocLink.getAttribute('data-section');
  await tocLink.click();
  await expect(page.locator(`[data-wiki-section="${target}"]`)).toHaveJSProperty('open', true);
  await page.locator(`[data-wiki-section="${target}"] .section-link`).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(`section=${target}`);
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await expect(page.locator('.wiki-section[open]')).toHaveCount(await sections.count());
  const table = page.locator('.document table').first();
  const tableText = await table.innerText();
  await page.getByRole('button', { name: 'Expand table 1', exact: true }).click();
  await expect(page.locator('#table-dialog')).toBeVisible();
  expect(await page.locator('#table-dialog table').innerText()).toBe(tableText);
  await page.keyboard.press('Escape');
  await expect(page.locator('#table-dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await expect(page.locator('.reader-aside')).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Exit focus', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
});

test('Language Bites preserve all content, filter state, keyboard steps and copied notes', async ({ page, request, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const catalog = await (await request.get('/content/catalog.json')).json();
  await page.goto('/#/bites');
  await expect(page.locator('.bite-card')).toHaveCount(80);
  await page.screenshot({ path: testInfo.outputPath('bites-desktop.png') });
  for (const [category, count] of [['Grammar', 24], ['Vocabulary', 20], ['Pronunciation', 20], ['Speaking', 16]]) {
    await page.locator(`[data-category="${category}"]`).click();
    await expect(page.locator('.bite-card')).toHaveCount(count);
  }
  await page.locator('[data-category="Grammar"]').click();
  await page.locator('#library-search').fill('worth');
  await expect(page.locator('.bite-card')).toHaveCount(1);
  await page.locator('.bite-card').click();
  const note = catalog.bites.find(note => note.id === 'G01');
  await expect(page.getByRole('tabpanel')).toContainText('worth visiting?');
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText(note.explanation);
  await expect(page.getByRole('tabpanel')).toContainText(note.qualification);
  await page.getByRole('tab', { name: '3 Examples' }).click();
  for (const [sentence, meaning] of note.examples) {
    await expect(page.getByRole('tabpanel')).toContainText(sentence);
    await expect(page.getByRole('tabpanel')).toContainText(meaning);
  }
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '4 Practise' })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText(note.practice);
  await expect(page.locator('.bite-answer p')).not.toBeVisible();
  await page.getByText('Reveal answer', { exact: true }).click();
  await expect(page.locator('.bite-answer p')).toHaveText(note.answer);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('tab', { name: '4 Practise' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.bite-answer p')).not.toBeVisible();
  await page.getByRole('button', { name: 'Copy complete note', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(note.answer);
  await page.locator('.reader-toolbar .back-link').click();
  await expect(page.locator('#library-search')).toHaveValue('worth');
  await expect(page.locator('[data-category="Grammar"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.bite-card')).toHaveCount(1);
  await page.locator('#library-search').fill('zzzzz-no-note');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.bite-card')).toHaveCount(80);
  expect(await page.locator('body').innerText()).not.toMatch(/instagram|[\p{Script=Han}]/iu);
});

test('global search reaches short notes with the keyboard and mobile reading stays within the viewport', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/bites');
  await expect(page.locator('.bite-card')).toHaveCount(80);
  await page.screenshot({ path: testInfo.outputPath('bites-mobile.png') });
  await page.keyboard.press('Control+k');
  await expect(page.locator('#wiki-search')).toBeFocused();
  await page.locator('#wiki-search').fill('worth');
  await expect(page.locator('#search-results [role="option"]').first()).toContainText('Language Bites');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#wiki-search')).toHaveAttribute('aria-activedescendant', 'search-result-1');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/bite\/G01/);
  await expect(page.locator('#search-dialog')).not.toBeVisible();
  for (const name of ['1 Notice', '2 Understand', '3 Examples', '4 Practise']) {
    await page.getByRole('tab', { name }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await page.getByText('Reveal answer', { exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('bite-mobile.png'), fullPage: true });
  await page.goto('/#/bite/G01?step=2.5');
  await expect(page.getByRole('tab', { name: '2 Understand' })).toHaveAttribute('aria-selected', 'true');
  await page.goto('/#/bite/unknown');
  await expect(page.getByText('Note not found', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Language Bites' }).click();
  await expect(page.locator('.bite-card')).toHaveCount(80);
  expect(errors).toEqual([]);
});
